import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Keyboard,
  Platform,
  AppState,
  Alert,
  ScrollView,
  useWindowDimensions,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { COLORS, SPACING, SHADOWS } from './src/theme';
import { db, API_HOST } from './src/db/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hold splash screen during boot initialization
SplashScreen.preventAutoHideAsync().catch(() => {});

// Import Screens
import LandingPage from './src/screens/LandingPage';
import NbtSplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TripsScreen from './src/screens/TripsScreen';
import CreateTripScreen from './src/screens/CreateTripScreen';
import LiveStatusScreen from './src/screens/LiveStatusScreen';
import GcScreen from './src/screens/GcScreen';
import MemoScreen from './src/screens/MemoScreen';
import VehiclesScreen from './src/screens/VehiclesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import GpsVehicleScreen from './src/screens/GpsVehicleScreen';
import LorryBookingScreen from './src/screens/LorryBookingScreen';

export type AdminTab =
  | 'DASHBOARD'
  | 'TRIPS'
  | 'CREATE_TRIP'
  | 'LIVE'
  | 'GC'
  | 'MEMO'
  | 'MENU'
  | 'VEHICLES'
  | 'SETTINGS'
  | 'GPS_VEHICLES'
  | 'LORRY_BOOKING';

interface NavigationItem {
  id: AdminTab;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  badge?: string;
  category?: string;
}

const NAV_ITEMS: NavigationItem[] = [
  { id: 'DASHBOARD', label: 'Dashboard', icon: 'dashboard', category: 'Main' },
  { id: 'CREATE_TRIP', label: 'Trip Creation', icon: 'add-circle', badge: 'NEW', category: 'Main' },
  { id: 'VEHICLES', label: 'Vehicle Management', icon: 'directions-bus', category: 'Main' },
  { id: 'TRIPS', label: 'Trips Registry', icon: 'local-shipping', category: 'Main' },
  { id: 'LORRY_BOOKING', label: 'Lorry Booking Agency', icon: 'account-balance-wallet', category: 'Main' },
  { id: 'LIVE', label: 'Live GPS Status', icon: 'my-location', category: 'Fleet' },
  { id: 'GC', label: 'GC Notes', icon: 'description', category: 'Fleet' },
  { id: 'MEMO', label: 'Memo', icon: 'sticky-note-2', category: 'Fleet' },
  { id: 'GPS_VEHICLES', label: 'GPS Management', icon: 'gps-fixed', category: 'Fleet' },
  { id: 'SETTINGS', label: 'System Settings', icon: 'settings', category: 'System' },
];

function AppContent() {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isDesktop = windowWidth >= 880;
  const isTablet = windowWidth >= 600 && windowWidth < 880;
  const isPhone = windowWidth < 600;
  const isCompact = windowWidth < 720;

  const [appStage, setAppStage] = useState<'LANDING' | 'SPLASH' | 'LOGIN' | 'MAIN'>('LANDING');

  const [adminTab, _setAdminTab] = useState<AdminTab>('DASHBOARD');
  const setAdminTab = (tab: AdminTab) => {
    _setAdminTab(tab);
    AsyncStorage.setItem('admin_active_tab', tab).catch(() => {});
  };
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Desktop sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mobile drawer open state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Initialize Admin Authentication State
  useEffect(() => {
    // Warm up the Render backend in the background so cold starts are handled early
    fetch(`${API_HOST}/health`).catch(() => {});

    const init = async () => {
      try {
        await db.loadSession();
        const savedTab = await AsyncStorage.getItem('admin_active_tab');
        if (savedTab) {
          _setAdminTab(savedTab as AdminTab);
        }
        // If a valid session exists, skip landing page and go straight to main
        if (db.isAuthenticated()) {
          setAppStage('MAIN');
        }
      } catch (e) {
        console.warn('Session init error:', e);
      }

      setTimeout(async () => {
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          console.warn('Splash screen hide error:', e);
        }
      }, 800);
    };
    init();

    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await db.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setMobileDrawerOpen(false);
    setAppStage('LOGIN');
  };

  if (appStage === 'LANDING') {
    return <LandingPage onEnterDashboard={() => setAppStage('SPLASH')} />;
  }

  if (appStage === 'SPLASH') {
    return <NbtSplashScreen onComplete={() => setAppStage('LOGIN')} />;
  }

  if (appStage === 'LOGIN') {
    return <LoginScreen onLoginSuccess={() => setAppStage('MAIN')} />;
  }

  const renderScreen = () => {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, display: adminTab === 'DASHBOARD' ? 'flex' : 'none' }}>
          <DashboardScreen
            onCreateTripPress={() => setAdminTab('CREATE_TRIP')}
            onNavigateToTrips={() => setAdminTab('TRIPS')}
          />
        </View>
        <View style={{ flex: 1, display: adminTab === 'TRIPS' ? 'flex' : 'none' }}>
          <TripsScreen />
        </View>
        <View style={{ flex: 1, display: adminTab === 'LORRY_BOOKING' ? 'flex' : 'none' }}>
          <LorryBookingScreen />
        </View>
        <View style={{ flex: 1, display: adminTab === 'CREATE_TRIP' ? 'flex' : 'none' }}>
          <CreateTripScreen onTripCreated={() => setAdminTab('TRIPS')} />
        </View>
        <View style={{ flex: 1, display: adminTab === 'LIVE' ? 'flex' : 'none' }}>
          <LiveStatusScreen />
        </View>
        <View style={{ flex: 1, display: adminTab === 'GC' ? 'flex' : 'none' }}>
          <GcScreen />
        </View>
        <View style={{ flex: 1, display: adminTab === 'MEMO' ? 'flex' : 'none' }}>
          <MemoScreen />
        </View>
        <View style={{ flex: 1, display: adminTab === 'VEHICLES' ? 'flex' : 'none' }}>
          {!isDesktop && (
            <TouchableOpacity style={styles.backToMenuBtn} onPress={() => setAdminTab('MENU')}>
              <MaterialIcons name="chevron-left" size={20} color={COLORS.primary} />
              <Text style={styles.backToMenuText}>BACK TO MENU</Text>
            </TouchableOpacity>
          )}
          <VehiclesScreen />
        </View>
        <View style={{ flex: 1, display: adminTab === 'SETTINGS' ? 'flex' : 'none' }}>
          {!isDesktop && (
            <TouchableOpacity style={styles.backToMenuBtn} onPress={() => setAdminTab('MENU')}>
              <MaterialIcons name="chevron-left" size={20} color={COLORS.primary} />
              <Text style={styles.backToMenuText}>BACK TO MENU</Text>
            </TouchableOpacity>
          )}
          <SettingsScreen onLogout={handleLogout} />
        </View>
        <View style={{ flex: 1, display: adminTab === 'GPS_VEHICLES' ? 'flex' : 'none' }}>
          {!isDesktop && (
            <TouchableOpacity style={styles.backToMenuBtn} onPress={() => setAdminTab('MENU')}>
              <MaterialIcons name="chevron-left" size={20} color={COLORS.primary} />
              <Text style={styles.backToMenuText}>BACK TO MENU</Text>
            </TouchableOpacity>
          )}
          <GpsVehicleScreen />
        </View>
        {adminTab === 'MENU' && (
          <ScrollView style={styles.menuContainer} contentContainerStyle={styles.menuContent}>
            <Text style={styles.menuTitle}>Control Center Registries</Text>

            <View style={[styles.menuGrid, !isDesktop && styles.menuGridStacked]}>
              <TouchableOpacity style={[styles.menuItem, !isDesktop && styles.menuItemFullWidth]} onPress={() => setAdminTab('VEHICLES')}>
                <View style={[styles.menuIconContainer, { backgroundColor: COLORS.secondary }]}>
                  <MaterialIcons name="local-shipping" size={28} color="#ffffff" />
                </View>
                <Text style={styles.menuItemTitle}>Lorry Directory</Text>
                <Text style={styles.menuItemDesc}>Review permits, fitness &amp; RCs</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.menuItem, !isDesktop && styles.menuItemFullWidth]} onPress={() => setAdminTab('MEMO')}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#7c3aed' }]}>
                  <MaterialIcons name="sticky-note-2" size={28} color="#ffffff" />
                </View>
                <Text style={styles.menuItemTitle}>Memo Documents</Text>
                <Text style={styles.menuItemDesc}>Create &amp; print transport memos</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.menuGrid, !isDesktop && styles.menuGridStacked]}>
              <TouchableOpacity style={[styles.menuItem, !isDesktop && styles.menuItemFullWidth]} onPress={() => setAdminTab('GPS_VEHICLES')}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#0f766e' }]}>
                  <MaterialIcons name="gps-fixed" size={28} color="#ffffff" />
                </View>
                <Text style={styles.menuItemTitle}>GPS &amp; Vehicle Mgmt</Text>
                <Text style={styles.menuItemDesc}>Fleet GPS mapping &amp; devices</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.menuItem, !isDesktop && styles.menuItemFullWidth]} onPress={() => setAdminTab('SETTINGS')}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#10b981' }]}>
                  <MaterialIcons name="settings" size={28} color="#ffffff" />
                </View>
                <Text style={styles.menuItemTitle}>Settings &amp; Diagnostics</Text>
                <Text style={styles.menuItemDesc}>Database &amp; system status</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.menuGrid}>
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <View style={[styles.menuIconContainer, { backgroundColor: COLORS.primary }]}>
                  <MaterialIcons name="logout" size={28} color="#ffffff" />
                </View>
                <Text style={styles.menuItemTitle}>Logout Session</Text>
                <Text style={styles.menuItemDesc}>Terminate admin session</Text>
              </TouchableOpacity>
              <View
                style={[
                  styles.menuItem,
                  { backgroundColor: 'transparent', borderColor: 'transparent', elevation: 0 },
                ]}
              />
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  // Current tab metadata for header
  const currentNav = NAV_ITEMS.find((n) => n.id === adminTab) || {
    id: 'MENU',
    label: 'Control Center',
    icon: 'grid-view',
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} translucent={true} />

      <View style={styles.desktopLayoutRow}>
        {/* DESKTOP SIDEBAR - Only visible on Desktop */}
        {isDesktop && (
          <View
            style={[
              styles.desktopSidebar,
              sidebarCollapsed ? styles.desktopSidebarCollapsed : styles.desktopSidebarExpanded,
            ]}
          >
            {/* Sidebar Header */}
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarBrandIcon}>
                <Image
                  source={require('./assets/logo.png')}
                  style={styles.sidebarBrandLogo}
                  resizeMode="contain"
                />
              </View>

              {sidebarCollapsed && (
                <View style={{ position: 'absolute', left: 0, top: 0, width: 72, height: 72, justifyContent: 'center', alignItems: 'center' }}>
                  <Image
                    source={require('./assets/logo.png')}
                    style={{ width: 32, height: 32 }}
                    resizeMode="contain"
                  />
                </View>
              )}
              {!sidebarCollapsed && (
                <View style={styles.sidebarBrandTextCol}>
                  <Text style={styles.sidebarBrandTitle}>New Balaji Transport</Text>
                  <Text style={styles.sidebarBrandSubtitle}>FLEET TRANSIT PORTAL</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.collapseToggleBtn}
                onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
                accessibilityRole="button"
                accessibilityLabel="Toggle Sidebar"
              >
                <MaterialIcons
                  name={sidebarCollapsed ? 'chevron-right' : 'chevron-left'}
                  size={20}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>

            {/* Sidebar Navigation Items */}
            <ScrollView style={styles.sidebarNavScroll} showsVerticalScrollIndicator={false}>
              {NAV_ITEMS.map((item) => {
                const isActive = adminTab === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.sidebarNavItem,
                      isActive && styles.sidebarNavItemActive,
                      sidebarCollapsed && styles.sidebarNavItemCentered,
                    ]}
                    onPress={() => setAdminTab(item.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={22}
                      color={isActive ? COLORS.secondary : '#94a3b8'}
                    />

                    {!sidebarCollapsed && (
                      <Text
                        style={[
                          styles.sidebarNavLabel,
                          isActive && styles.sidebarNavLabelActive,
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    )}

                    {!sidebarCollapsed && item.badge && (
                      <View style={styles.sidebarBadge}>
                        <Text style={styles.sidebarBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Sidebar User & Logout Footer */}
            <View style={styles.sidebarFooter}>
              {!sidebarCollapsed ? (
                <View style={styles.sidebarUserRow}>
                  <View style={styles.userAvatarCircle}>
                    <Text style={styles.userAvatarChar}>{'A'}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.sidebarUsername} numberOfLines={1}>
                      ADMIN
                    </Text>
                    <Text style={styles.sidebarUserRole}>Super Admin</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sidebarLogoutIconBtn}
                    onPress={handleLogout}
                  >
                    <MaterialIcons name="logout" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.sidebarLogoutCenteredBtn} onPress={handleLogout}>
                  <MaterialIcons name="logout" size={20} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* WORKSPACE CONTENT AREA (Always rendered at this position in the tree) */}
        <View style={styles.desktopMainContent}>
          {/* HEADER BAR (Desktop vs Mobile) */}
          {isDesktop ? (
            <View style={styles.desktopTopHeader}>
              <View style={styles.desktopHeaderTitleRow}>
                <MaterialIcons name={currentNav.icon} size={22} color={COLORS.primary} />
                <Text style={styles.desktopHeaderTitle}>{currentNav.label}</Text>
              </View>

              <View style={styles.desktopHeaderRightRow}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(56, 189, 248, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)' }}
                  onPress={() => setAppStage('LANDING')}
                >
                  <MaterialIcons name="home" size={16} color="#0284c7" />
                  <Text style={{ fontSize: 11, color: '#0284c7', fontWeight: 'bold' }}>Landing Page</Text>
                </TouchableOpacity>

                <View style={styles.liveSystemPill}>
                  <View style={styles.greenLiveDot} />
                  <Text style={styles.liveSystemText}>SYSTEM ONLINE</Text>
                </View>

                <View style={styles.desktopUserBadge}>
                  <MaterialIcons name="admin-panel-settings" size={16} color={COLORS.secondary} />
                  <Text style={styles.desktopUserText}>
                    ADMIN
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.mobileTopHeader, { paddingTop: Math.max(insets.top + 8, 12) }]}>
              <TouchableOpacity
                style={styles.mobileHamburgerBtn}
                onPress={() => setMobileDrawerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Open Navigation Menu"
              >
                <MaterialIcons name="menu" size={24} color="#ffffff" />
              </TouchableOpacity>

              <View style={styles.mobileBrandInfo}>
                <Text style={styles.mobileBrandName}>New Balaji Transport</Text>
                <Text style={styles.mobileBrandTagline}>ADMIN COMMAND PORTAL</Text>
              </View>

              <View style={styles.mobileAdminBadge}>
                <MaterialIcons name="admin-panel-settings" size={14} color={COLORS.secondary} />
                <Text style={styles.mobileAdminBadgeText}>ADMIN</Text>
              </View>
            </View>
          )}

          {/* ACTIVE SCREEN CONTENT WRAPPER */}
          <View style={styles.mobileBody}>
            {renderScreen()}
          </View>

          {/* MOBILE BOTTOM NAVIGATION BAR */}
          {!isDesktop && !isKeyboardVisible && (
            <View
              style={[
                styles.mobileBottomNav,
                { paddingBottom: Math.max(insets.bottom, 6) },
              ]}
            >
              <TouchableOpacity
                style={[styles.mobileNavItem, adminTab === 'DASHBOARD' && styles.mobileNavItemActive]}
                onPress={() => setAdminTab('DASHBOARD')}
              >
                <MaterialIcons
                  name="dashboard"
                  size={22}
                  color={adminTab === 'DASHBOARD' ? COLORS.secondary : COLORS.outline}
                />
                <Text
                  style={[
                    styles.mobileNavText,
                    adminTab === 'DASHBOARD' && styles.mobileNavTextActive,
                  ]}
                >
                  Dashboard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mobileNavItem, adminTab === 'CREATE_TRIP' && styles.mobileNavItemActive]}
                onPress={() => setAdminTab('CREATE_TRIP')}
              >
                <MaterialIcons
                  name="add-circle"
                  size={22}
                  color={adminTab === 'CREATE_TRIP' ? COLORS.secondary : COLORS.outline}
                />
                <Text
                  style={[
                    styles.mobileNavText,
                    adminTab === 'CREATE_TRIP' && styles.mobileNavTextActive,
                  ]}
                >
                  + Trip
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mobileNavItem, adminTab === 'TRIPS' && styles.mobileNavItemActive]}
                onPress={() => setAdminTab('TRIPS')}
              >
                <MaterialIcons
                  name="local-shipping"
                  size={22}
                  color={adminTab === 'TRIPS' ? COLORS.secondary : COLORS.outline}
                />
                <Text
                  style={[styles.mobileNavText, adminTab === 'TRIPS' && styles.mobileNavTextActive]}
                >
                  Trips
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mobileNavItem, adminTab === 'LIVE' && styles.mobileNavItemActive]}
                onPress={() => setAdminTab('LIVE')}
              >
                <MaterialIcons
                  name="my-location"
                  size={22}
                  color={adminTab === 'LIVE' ? COLORS.secondary : COLORS.outline}
                />
                <Text
                  style={[styles.mobileNavText, adminTab === 'LIVE' && styles.mobileNavTextActive]}
                >
                  Live GPS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mobileNavItem,
                  ['MENU', 'VEHICLES', 'SETTINGS', 'GPS_VEHICLES', 'GC', 'MEMO'].includes(
                    adminTab,
                  ) && styles.mobileNavItemActive,
                ]}
                onPress={() => setAdminTab('MENU')}
              >
                <MaterialIcons
                  name="grid-view"
                  size={22}
                  color={
                    ['MENU', 'DRIVERS', 'VEHICLES', 'SETTINGS', 'GPS_VEHICLES', 'GC', 'MEMO'].includes(
                      adminTab,
                    )
                      ? COLORS.secondary
                      : COLORS.outline
                  }
                />
                <Text
                  style={[
                    styles.mobileNavText,
                    ['MENU', 'DRIVERS', 'VEHICLES', 'SETTINGS', 'GPS_VEHICLES', 'GC', 'MEMO'].includes(
                      adminTab,
                    ) && styles.mobileNavTextActive,
                  ]}
                >
                  Menu
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* MOBILE NAVIGATION DRAWER MODAL */}
      {!isDesktop && (
        <Modal
          visible={mobileDrawerOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setMobileDrawerOpen(false)}
        >
          <View style={styles.drawerOverlay}>
            <TouchableOpacity
              style={styles.drawerBackdropDismiss}
              onPress={() => setMobileDrawerOpen(false)}
            />

            <View style={[styles.drawerContentCard, { paddingTop: Math.max(insets.top + 12, 16) }]}>
              {/* Drawer Header */}
              <View style={styles.drawerHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drawerTitle}>New Balaji Transport</Text>
                  <Text style={styles.drawerSubtitle}>Logistics Admin Command Menu</Text>
                </View>
                <TouchableOpacity onPress={() => setMobileDrawerOpen(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Drawer Nav Items */}
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {NAV_ITEMS.map((item) => {
                  const isActive = adminTab === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.drawerNavItem,
                        isActive && styles.drawerNavItemActive,
                      ]}
                      onPress={() => {
                        setAdminTab(item.id);
                        setMobileDrawerOpen(false);
                      }}
                    >
                      <MaterialIcons
                        name={item.icon}
                        size={22}
                        color={isActive ? COLORS.secondary : COLORS.primary}
                      />
                      <Text
                        style={[
                          styles.drawerNavText,
                          isActive && styles.drawerNavTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.badge && (
                        <View style={styles.drawerBadge}>
                          <Text style={styles.drawerBadgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity style={styles.drawerLogoutBtn} onPress={handleLogout}>
                  <MaterialIcons name="logout" size={20} color="#ef4444" />
                  <Text style={styles.drawerLogoutText}>LOGOUT SESSION</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: COLORS.background,
  },

  // DESKTOP LAYOUT STYLES
  desktopLayoutRow: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    minHeight: 0,
  },
  desktopSidebar: {
    backgroundColor: COLORS.primary,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  desktopSidebarExpanded: {
    width: 240,
  },
  desktopSidebarCollapsed: {
    width: 72,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sidebarBrandIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarBrandLogo: {
    width: 38,
    height: 38,
  },
  sidebarBrandTextCol: {
    flex: 1,
    marginLeft: 10,
    display: 'none',
  },
  sidebarBrandTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
    display: 'none',
  },
  sidebarBrandSubtitle: {
    fontSize: 8,
    display: 'none',
    fontWeight: 'bold',
    color: COLORS.secondary,
    letterSpacing: 1,
    marginTop: 1,
  },
  collapseToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sidebarNavScroll: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarNavItemActive: {
    backgroundColor: 'rgba(252, 119, 40, 0.15)',
  },
  sidebarNavItemCentered: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  sidebarNavLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginLeft: 12,
    flex: 1,
  },
  sidebarNavLabelActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  sidebarBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sidebarBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  sidebarFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  sidebarUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarChar: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
  sidebarUsername: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  sidebarUserRole: {
    color: '#94a3b8',
    fontSize: 9,
  },
  sidebarLogoutIconBtn: {
    padding: 6,
  },
  sidebarLogoutCenteredBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  // DESKTOP MAIN CONTENT STYLES
  desktopMainContent: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  desktopTopHeader: {
    height: 56,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    ...SHADOWS.light,
  },
  desktopHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desktopHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
  },
  desktopHeaderRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  liveSystemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  greenLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  liveSystemText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  desktopUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(3, 22, 53, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  desktopUserText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },

  // MOBILE LAYOUT STYLES
  mobileContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mobileTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    minHeight: 60,
  },
  mobileHamburgerBtn: {
    padding: 4,
    marginRight: 8,
  },
  mobileBrandInfo: {
    flex: 1,
  },
  mobileBrandName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  mobileBrandTagline: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.secondary,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  mobileAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(252, 119, 40, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  mobileAdminBadgeText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  mobileBody: {
    flex: 1,
  },
  mobileBottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 8,
    minHeight: 64,
    ...SHADOWS.light,
  },
  mobileNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 48,
  },
  mobileNavItemActive: {},
  mobileNavText: {
    fontSize: 10,
    color: COLORS.outline,
    fontWeight: '600',
    marginTop: 3,
  },
  mobileNavTextActive: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },

  // MOBILE DRAWER STYLES
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  drawerBackdropDismiss: {
    flex: 1,
  },
  drawerContentCard: {
    width: '80%',
    maxWidth: 320,
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
  },
  drawerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  drawerNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  drawerNavItemActive: {
    backgroundColor: 'rgba(252, 119, 40, 0.12)',
  },
  drawerNavText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 12,
    flex: 1,
  },
  drawerNavTextActive: {
    color: COLORS.secondary,
    fontWeight: '800',
  },
  drawerBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  drawerBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  drawerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 20,
    gap: 10,
  },
  drawerLogoutText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ef4444',
  },

  // MENU SCREEN STYLES
  menuContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  menuContent: {
    padding: SPACING.gutter,
    paddingBottom: 96,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 12 : 8,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  menuGridStacked: {
    flexDirection: 'column',
  },
  menuItem: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
    ...SHADOWS.light,
  },
  menuItemFullWidth: {
    width: '100%',
    flex: 0,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
  },
  menuItemDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 13,
  },
  backToMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    height: 44,
    paddingHorizontal: 16,
    gap: 4,
  },
  backToMenuText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});
