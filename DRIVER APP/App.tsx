// NBT-ARS Driver Console App v3.0 — Pure Offline/Local Mode
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Keyboard,
  Platform,
  AppState,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from './src/theme';
import { db, Trip } from './src/db/database';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import StartTripScreen from './src/screens/StartTripScreen';
import MapScreen from './src/screens/MapScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import PodScreen from './src/screens/PodScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SplashScreen from './src/components/SplashScreen';
import FadeInView from './src/components/FadeInView';

import * as Font from 'expo-font';

type DriverTab = 'HOME' | 'MAP' | 'EXPENSE' | 'DELIVERY' | 'PROFILE';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [driverTab, _setDriverTab] = useState<DriverTab>('HOME');
  const setDriverTab = (tab: DriverTab) => {
    _setDriverTab(tab);
    AsyncStorage.setItem('driver_active_tab', tab).catch(() => {});
  };
  const [showSplash, setShowSplash] = useState(true);
  
  // Load fonts explicitly for web to prevent fontfaceobserver timeout
  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync(MaterialIcons.font);
      } catch (e) {
        console.warn('Error loading fonts', e);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);
  
  // Driver Auth State
  const [authenticatedDriverId, setAuthenticatedDriverId] = useState<string | null>(null);
  
  // App Trips State (Synchronized in real-time)
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [showStartTripWorkflow, setShowStartTripWorkflow] = useState(false);

  // Keyboard layout state helper
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Initialize DB and subscribe to changes
  useEffect(() => {
    // Check keyboard visibility to hide bottom nav if needed
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));

    db.init().then(async (initialTrips) => {
      setTrips(initialTrips);
      // Restore authenticated session from SecureStore if it exists
      if (db.isAuthenticated()) {
        const driverId = db.getAuthenticatedDriverId();
        if (driverId) {
          setAuthenticatedDriverId(driverId);
          const active = initialTrips.find(
            (t) => (t.driverId === driverId || t.id === driverId) && t.status.toUpperCase() !== 'COMPLETED'
          );
          setActiveTrip(active ? { ...active, expenses: [...active.expenses] } : null);

          // Restore saved active tab on refresh
          try {
            const savedTab = await AsyncStorage.getItem('driver_active_tab');
            if (savedTab) {
              _setDriverTab(savedTab as DriverTab);
            }
          } catch {}
        }
      }
    });

    const unsubscribe = db.subscribe((updatedTrips) => {
      setTrips(updatedTrips);
      const driverId = db.getAuthenticatedDriverId();
      if (driverId) {
        setAuthenticatedDriverId(driverId);
        const active = updatedTrips.find(
          (t) => (t.driverId === driverId || t.id === driverId) && t.status.toUpperCase() !== 'COMPLETED'
        );
        setActiveTrip(active ? { ...active, expenses: [...active.expenses] } : null);
      } else {
        setAuthenticatedDriverId(null);
        setActiveTrip(null);
      }
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      unsubscribe();
    };
  }, []);

  // Poll backend every 30 seconds, but skip if keyboard is open or driver is on an input-heavy tab
  useEffect(() => {
    if (!authenticatedDriverId) return;
    const interval = setInterval(async () => {
      if (isKeyboardVisible || driverTab === 'EXPENSE' || driverTab === 'DELIVERY' || driverTab === 'PROFILE') return;
      try {
        const freshTrips = await db.getTrips();
        setTrips(freshTrips);
        const active = freshTrips.find(
          (t) => (t.driverId === authenticatedDriverId || t.id === authenticatedDriverId)
            && t.status.toUpperCase() !== 'COMPLETED'
        );
        setActiveTrip(active ? { ...active, expenses: [...active.expenses] } : null);
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [authenticatedDriverId, isKeyboardVisible, driverTab]);
  useEffect(() => {
    let backgroundTime = 0;
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        backgroundTime = Date.now();
      } else if (nextAppState === 'active') {
        if (backgroundTime > 0) {
          const elapsedSeconds = (Date.now() - backgroundTime) / 1000;
          // Auto-lock if app is backgrounded for more than 5 minutes (300 seconds)
          // For security, require PIN re-entry
          if (elapsedSeconds > 300 && authenticatedDriverId) {
            handleLogout();
            Alert.alert('Session Locked', 'Session expired due to inactivity. Please login again.');
          }
        }
        backgroundTime = 0;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [authenticatedDriverId]);

  const handleLoginSuccess = async (driverId: string) => {
    setAuthenticatedDriverId(driverId);
    setDriverTab('HOME');

    // Fetch fresh trip data from backend immediately after login
    try {
      const freshTrips = await db.getTrips();
      const active = freshTrips.find(
        (t) => (t.driverId === driverId || t.id === driverId) && t.status.toUpperCase() !== 'COMPLETED'
      );
      setTrips(freshTrips);
      setActiveTrip(active ? { ...active, expenses: [...active.expenses] } : null);
    } catch {
      // fallback to whatever is in local state
      const active = trips.find(
        (t) => (t.driverId === driverId || t.id === driverId) && t.status.toUpperCase() !== 'COMPLETED'
      );
      setActiveTrip(active ? { ...active, expenses: [...active.expenses] } : null);
    }
  };

  const handleLogout = async () => {
    await db.logout();
    setAuthenticatedDriverId(null);
    setActiveTrip(null);
    setDriverTab('HOME');
    setShowStartTripWorkflow(false);
  };

  // Render Driver Console Screen Content based on Current Tab
  const renderDriverContent = () => {
    if (!authenticatedDriverId) {
      return (
        <FadeInView key="login">
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        </FadeInView>
      );
    }

    if (showStartTripWorkflow && activeTrip) {
      return (
        <FadeInView key="start-workflow">
          <StartTripScreen
            trip={activeTrip}
            onTripStarted={() => {
              setShowStartTripWorkflow(false);
              setDriverTab('MAP'); // Automatically open map navigation on start
            }}
            onCancel={() => setShowStartTripWorkflow(false)}
          />
        </FadeInView>
      );
    }

    switch (driverTab) {
      case 'HOME':
        return (
          <FadeInView key="home">
            <HomeScreen
              driverId={authenticatedDriverId}
              activeTrip={activeTrip}
              onStartTripPress={() => setShowStartTripWorkflow(true)}
              onNavigatePress={() => setDriverTab('MAP')}
              onAddExpensePress={() => setDriverTab('EXPENSE')}
              onUploadPodPress={() => setDriverTab('DELIVERY')}
              onArrivedPress={async () => {
                if (activeTrip) await db.markArrived(activeTrip.id);
              }}
              onSwitchToMap={() => setDriverTab('MAP')}
              onLogout={handleLogout}
            />
          </FadeInView>
        );
      case 'MAP':
        if (!activeTrip || activeTrip.status === 'ASSIGNED') {
          return (
            <FadeInView key="map-empty">
              <View style={styles.emptyTabState}>
                <MaterialIcons name="map" size={64} color={COLORS.outline} />
                <Text style={styles.emptyTitle}>Navigation Not Active</Text>
                <Text style={styles.emptyDesc}>
                  There is no active trip currently in progress. Go to the Home tab and click Start Trip to begin navigation.
                </Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setDriverTab('HOME')}>
                  <Text style={styles.emptyBtnText}>GO TO HOME</Text>
                </TouchableOpacity>
              </View>
            </FadeInView>
          );
        }
        return (
          <FadeInView key="map">
            <MapScreen
              trip={activeTrip}
              onAddExpensePress={() => setDriverTab('EXPENSE')}
              onArrivedPress={() => setDriverTab('DELIVERY')}
            />
          </FadeInView>
        );
      case 'EXPENSE':
        if (!activeTrip) {
          return (
            <FadeInView key="expense-empty">
              <View style={styles.emptyTabState}>
                <MaterialIcons name="payments" size={64} color={COLORS.outline} />
                <Text style={styles.emptyTitle}>No Active Trip</Text>
                <Text style={styles.emptyDesc}>
                  You must have an active trip assigned and started to record travel expenses.
                </Text>
              </View>
            </FadeInView>
          );
        }
        return (
          <FadeInView key="expense">
            <AddExpenseScreen
              trip={activeTrip}
              onExpenseSaved={() => {
                // Return to navigation after saving expense
                if (activeTrip.status === 'STARTED' || activeTrip.status === 'ON_THE_WAY') {
                  setDriverTab('MAP');
                } else {
                  setDriverTab('HOME');
                }
              }}
              onBackToTrip={() => {
                if (activeTrip.status === 'STARTED' || activeTrip.status === 'ON_THE_WAY') {
                  setDriverTab('MAP');
                } else {
                  setDriverTab('HOME');
                }
              }}
            />
          </FadeInView>
        );
      case 'DELIVERY':
        if (!activeTrip || activeTrip.status === 'ASSIGNED') {
          return (
            <FadeInView key="delivery-empty">
              <View style={styles.emptyTabState}>
                <MaterialIcons name="fact-check" size={64} color={COLORS.outline} />
                <Text style={styles.emptyTitle}>Delivery Pending</Text>
                <Text style={styles.emptyDesc}>
                  You cannot upload Proof of Delivery until a trip has been started and is on the way.
                </Text>
              </View>
            </FadeInView>
          );
        }
        return (
          <FadeInView key="delivery">
            <PodScreen
              trip={activeTrip}
              onTripCompleted={() => {
                setActiveTrip(null);
                setDriverTab('HOME');
              }}
              onCancel={() => setDriverTab('HOME')}
            />
          </FadeInView>
        );
      case 'PROFILE':
        return (
          <FadeInView key="profile">
            <ProfileScreen
              driverId={authenticatedDriverId}
              onLogout={handleLogout}
            />
          </FadeInView>
        );
      default:
        return (
          <FadeInView key="default">
            <HomeScreen driverId={authenticatedDriverId} activeTrip={activeTrip} onStartTripPress={() => {}} onNavigatePress={() => {}} onAddExpensePress={() => {}} onUploadPodPress={() => {}} onArrivedPress={() => {}} onSwitchToMap={() => {}} onLogout={handleLogout} />
          </FadeInView>
        );
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      
      {showSplash && (
        <SplashScreen onAnimationEnd={() => setShowSplash(false)} />
      )}

      {/* Local Mode Status Bar */}
      <View style={styles.syncHeader}>
        <View style={styles.syncStatusContainer}>
          <View style={styles.syncStatusDot} />
          <Text style={styles.syncStatusText}>Local Mode — Data saved on device</Text>
        </View>
      </View>
      
      {/* Main View Content */}
      <View style={styles.body}>
        {renderDriverContent()}
      </View>

      {/* Driver Console Bottom Navigation (Only visible when authenticated and Keyboard is closed) */}
      {authenticatedDriverId && !showStartTripWorkflow && !isKeyboardVisible && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, driverTab === 'HOME' && styles.navItemActive]}
            onPress={() => setDriverTab('HOME')}
          >
            <MaterialIcons name="home" size={24} color={driverTab === 'HOME' ? COLORS.orangeAccent : COLORS.outline} />
            <Text style={[styles.navText, driverTab === 'HOME' && styles.navTextActive]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, driverTab === 'MAP' && styles.navItemActive]}
            onPress={() => setDriverTab('MAP')}
          >
            <MaterialIcons name="map" size={24} color={driverTab === 'MAP' ? COLORS.orangeAccent : COLORS.outline} />
            <Text style={[styles.navText, driverTab === 'MAP' && styles.navTextActive]}>Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, driverTab === 'EXPENSE' && styles.navItemActive]}
            onPress={() => setDriverTab('EXPENSE')}
          >
            <MaterialIcons name="payments" size={24} color={driverTab === 'EXPENSE' ? COLORS.orangeAccent : COLORS.outline} />
            <Text style={[styles.navText, driverTab === 'EXPENSE' && styles.navTextActive]}>Expenses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, driverTab === 'DELIVERY' && styles.navItemActive]}
            onPress={() => setDriverTab('DELIVERY')}
          >
            <MaterialIcons name="fact-check" size={24} color={driverTab === 'DELIVERY' ? COLORS.orangeAccent : COLORS.outline} />
            <Text style={[styles.navText, driverTab === 'DELIVERY' && styles.navTextActive]}>Delivery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, driverTab === 'PROFILE' && styles.navItemActive]}
            onPress={() => setDriverTab('PROFILE')}
          >
            <MaterialIcons name="person" size={24} color={driverTab === 'PROFILE' ? COLORS.orangeAccent : COLORS.outline} />
            <Text style={[styles.navText, driverTab === 'PROFILE' && styles.navTextActive]}>Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  roleHeader: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: 8,
    paddingHorizontal: SPACING.gutter,
  },
  brandName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 2,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  roleTabActive: {
    backgroundColor: COLORS.secondary,
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  roleTabTextActive: {
    color: COLORS.onSecondaryContainer,
  },
  body: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    height: 72,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  navItemActive: {
    // optional active background highlights
  },
  navText: {
    fontSize: 11,
    color: COLORS.outline,
    fontWeight: '500',
    marginTop: 4,
  },
  navTextActive: {
    color: COLORS.orangeAccent,
    fontWeight: 'bold',
  },
  emptyTabState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.gutter * 2,
    backgroundColor: COLORS.background,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: COLORS.onPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  syncHeader: {
    flexDirection: 'row',
    // SafeAreaView (root) already handles notch/status-bar inset on both iOS and
    // Android — we only need a consistent visual gap below it.
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 12,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  syncStatusText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  syncToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncToggleBtnOnline: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  syncToggleBtnOffline: {
    backgroundColor: COLORS.orangeAccent,
  },
  syncToggleText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
