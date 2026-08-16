import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db, Trip } from '../db/database';
import VehicleDocumentsModal from '../components/VehicleDocumentsModal';

interface ProfileScreenProps {
  driverId: string;
  onLogout: () => void;
}

export default function ProfileScreen({
  driverId,
  onLogout,
}: ProfileScreenProps) {
  const [driverName, setDriverName] = useState('Loading...');
  const [completedTripsCount, setCompletedTripsCount] = useState(0);
  const [totalKm, setTotalKm] = useState(0);
  const [ratings, setRatings] = useState('0.0 / 5.0');
  
  // Custom Analytics States
  const [completedTrips, setCompletedTrips] = useState<Trip[]>([]);
  const [expenseLedger, setExpenseLedger] = useState({ fuel: 0, toll: 0, other: 0 });
  const [currentTrackingId, setCurrentTrackingId] = useState(driverId);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [docsModalVisible, setDocsModalVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const trips = await db.getTrips();
        const pastTrips = await db.getCompletedTrips();
        const active = await db.getActiveTripForDriver(driverId);

        if (!isMounted) return;

        setCompletedTrips(pastTrips);
        setActiveTrip(active);

        const profile = await db.getDriverProfile(driverId);
        if (profile && profile.name) {
          setDriverName(profile.name);
        } else {
          const driverTrips = trips.filter(t => t.driverId === driverId);
          if (driverTrips.length > 0) {
            const match = driverTrips.find(t => t.driverName);
            if (match) {
              setDriverName(match.driverName);
            }
          } else {
            setDriverName('Driver');
          }
        }

        const driverTrips = trips.filter(t => t.driverId === driverId || t.id === driverId);
        const activeCompleted = driverTrips.filter(t => t.status.toUpperCase() === 'COMPLETED');

        if (driverTrips.length > 0) {
          setCurrentTrackingId(driverTrips[0].trackingId || driverId);
        }

        const uniqueTrips = Array.from(
          new Map([...pastTrips, ...activeCompleted].map(trip => [trip.id, trip])).values()
        );
        const finalCount = uniqueTrips.length;

        let finalKm = 0;
        uniqueTrips.forEach(t => {
          const kms = (t.odometerEnd || 0) - (t.odometerStart || 0);
          if (kms > 0) finalKm += kms;
        });

        setCompletedTripsCount(finalCount);
        setTotalKm(finalKm);
        setRatings(finalCount > 0 ? '5.0 / 5.0' : '0.0 / 5.0');

        // Calculate running expense totals from completed runs without double-counting the same trip
        let fuel = 0, toll = 0, other = 0;
        uniqueTrips.forEach(t => {
          t.expenses?.forEach(e => {
            if (e.category === 'FUEL') fuel += e.amount;
            else if (e.category === 'TOLL') toll += e.amount;
            else other += e.amount;
          });
        });

        setExpenseLedger({ fuel, toll, other });
      } catch (error) {
        console.warn('[ProfileScreen] failed to refresh trip stats:', error);
      }
    };

    loadStats();

    const unsubscribe = db.subscribe(() => {
      void loadStats();
    });

    const refreshInterval = setInterval(() => {
      void loadStats();
    }, 10000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [driverId]);

  const handleResetData = () => {
    Alert.alert(
      'Reset Demo Data',
      'This will delete all current progress and restore initial trips. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await db.resetData();
            setCompletedTrips([]);
            setExpenseLedger({ fuel: 14500, toll: 4800, other: 2200 });
            Alert.alert('Database Reset', 'The default database has been restored.');
          }
        }
      ]
    );
  };

  const totalExpensesSum = expenseLedger.fuel + expenseLedger.toll + expenseLedger.other;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <MaterialIcons name="person" size={56} color={COLORS.primary} />
          </View>
          <Text style={styles.profileName}>{driverName}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Tracking ID: {currentTrackingId}</Text>
          </View>
          <Text style={styles.subtext}>Verified Operator • NBT Logistics & ARS Fleet</Text>
        </View>

        {/* Statistics Grid */}
        <Text style={styles.sectionTitle}>Driving Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialIcons name="local-shipping" size={28} color={COLORS.primary} />
            <Text style={styles.statVal}>{completedTripsCount}</Text>
            <Text style={styles.statLbl}>Completed Trips</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="directions" size={28} color={COLORS.secondary} />
            <Text style={styles.statVal}>{totalKm.toLocaleString()} KM</Text>
            <Text style={styles.statLbl}>Distance Covered</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="star" size={28} color="#eab308" />
            <Text style={styles.statVal}>{ratings}</Text>
            <Text style={styles.statLbl}>Performance Rating</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="assignment-turned-in" size={28} color={COLORS.success} />
            <Text style={styles.statVal}>100%</Text>
            <Text style={styles.statLbl}>POD Submission</Text>
          </View>
        </View>



        {/* Expense Ledger Chart */}
        <Text style={styles.sectionTitle}>Transit Expense Breakdown</Text>
        <View style={styles.ledgerCard}>
          <Text style={styles.ledgerTotal}>Total Logged Costs: ₹{totalExpensesSum.toLocaleString()}</Text>
          
          {/* Fuel Bar */}
          <View style={styles.chartBarWrapper}>
            <View style={styles.chartBarLabelRow}>
              <Text style={styles.chartBarLabel}>Fuel & Diesel</Text>
              <Text style={styles.chartBarValue}>
                ₹{expenseLedger.fuel.toLocaleString()} ({totalExpensesSum > 0 ? ((expenseLedger.fuel / totalExpensesSum) * 100).toFixed(0) : 0}%)
              </Text>
            </View>
            <View style={styles.chartBarTrack}>
              <View 
                style={[
                  styles.chartBarFill, 
                  { 
                    width: `${totalExpensesSum > 0 ? (expenseLedger.fuel / totalExpensesSum) * 100 : 0}%`, 
                    backgroundColor: COLORS.orangeAccent 
                  }
                ]} 
              />
            </View>
          </View>

          {/* Toll Bar */}
          <View style={styles.chartBarWrapper}>
            <View style={styles.chartBarLabelRow}>
              <Text style={styles.chartBarLabel}>Highway Tolls</Text>
              <Text style={styles.chartBarValue}>
                ₹{expenseLedger.toll.toLocaleString()} ({totalExpensesSum > 0 ? ((expenseLedger.toll / totalExpensesSum) * 100).toFixed(0) : 0}%)
              </Text>
            </View>
            <View style={styles.chartBarTrack}>
              <View 
                style={[
                  styles.chartBarFill, 
                  { 
                    width: `${totalExpensesSum > 0 ? (expenseLedger.toll / totalExpensesSum) * 100 : 0}%`, 
                    backgroundColor: COLORS.secondary 
                  }
                ]} 
              />
            </View>
          </View>

          {/* Others Bar */}
          <View style={styles.chartBarWrapper}>
            <View style={styles.chartBarLabelRow}>
              <Text style={styles.chartBarLabel}>Others (RTO/Police/Repairs)</Text>
              <Text style={styles.chartBarValue}>
                ₹{expenseLedger.other.toLocaleString()} ({totalExpensesSum > 0 ? ((expenseLedger.other / totalExpensesSum) * 100).toFixed(0) : 0}%)
              </Text>
            </View>
            <View style={styles.chartBarTrack}>
              <View 
                style={[
                  styles.chartBarFill, 
                  { 
                    width: `${totalExpensesSum > 0 ? (expenseLedger.other / totalExpensesSum) * 100 : 0}%`, 
                    backgroundColor: COLORS.primary 
                  }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* Completed Run History */}
        <Text style={styles.sectionTitle}>Completed Runs History ({completedTrips.length})</Text>
        {completedTrips.length === 0 ? (
          <View style={styles.historyEmptyState}>
            <MaterialIcons name="archive" size={40} color={COLORS.outline} />
            <Text style={styles.emptyHistoryTitle}>No Completed Runs Recorded</Text>
            <Text style={styles.emptyHistoryDesc}>
              When you complete assigned runs and submit your proof of delivery documents, they will be archived here.
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {completedTrips.map((historyTrip, index) => {
              const totalExpenses = historyTrip.expenses.reduce((sum, e) => sum + e.amount, 0);
              const kms = (historyTrip.odometerEnd || 0) - (historyTrip.odometerStart || 0);
              return (
                <View key={historyTrip.id + '-' + index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyTripId}>Trip ID: {historyTrip.id}</Text>
                    <Text style={styles.historyDate}>{historyTrip.endDate || new Date().toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.historyRoute}>
                    <Text style={styles.routeText}>{historyTrip.startingPoint} → {historyTrip.destination}</Text>
                  </View>
                  <View style={styles.historyDetails}>
                    <View style={styles.historyStat}>
                      <Text style={styles.histLabel}>Distance:</Text>
                      <Text style={styles.histVal}>{kms > 0 ? `${kms} KM` : '350 KM'}</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Text style={styles.histLabel}>Expenses:</Text>
                      <Text style={styles.histVal}>₹{totalExpenses.toLocaleString()}</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Text style={styles.histLabel}>Status:</Text>
                      <Text style={[styles.histVal, { color: COLORS.success, fontWeight: 'bold' }]}>DELIVERED</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Assigned Vehicle & Documents */}
        {activeTrip && (
          <>
            <Text style={styles.sectionTitle}>Assigned Vehicle & Papers</Text>
            <View style={styles.vehicleDocCard}>
              <View style={styles.vehicleDocHeader}>
                <View style={styles.vehicleDocIconContainer}>
                  <MaterialIcons name="local-shipping" size={26} color={COLORS.primary} />
                </View>
                <View style={styles.vehicleDocMeta}>
                  <Text style={styles.vehicleDocNum}>{activeTrip.vehicleNumber}</Text>
                  <Text style={styles.vehicleDocType}>{activeTrip.vehicleType} • Active Transit Truck</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.viewDocsBtn}
                onPress={() => setDocsModalVisible(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="folder-shared" size={20} color="#ffffff" />
                <Text style={styles.viewDocsBtnText}>VIEW VEHICLE DOCUMENTS</Text>
              </TouchableOpacity>
            </View>

            <VehicleDocumentsModal
              visible={docsModalVisible}
              onClose={() => setDocsModalVisible(false)}
              vehicleDetails={activeTrip.vehicleDetails}
              documents={activeTrip.vehicleDocuments}
            />
          </>
        )}

        {/* Settings / Actions */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.preferencesCard}>
          <TouchableOpacity style={styles.prefRow} onPress={handleResetData}>
            <View style={styles.prefLeft}>
              <MaterialIcons name="restore" size={24} color={COLORS.textMuted} />
              <Text style={styles.prefText}>Reset Demo Data</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.outline} />
          </TouchableOpacity>
          
          <View style={styles.divider} />

          <TouchableOpacity style={styles.prefRow} onPress={() => Alert.alert('App Version', 'NBT Driver Portal PWA v1.0.0 (Expo)')}>
            <View style={styles.prefLeft}>
              <MaterialIcons name="info-outline" size={24} color={COLORS.textMuted} />
              <Text style={styles.prefText}>About System</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.outline} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={[styles.prefRow, styles.logoutRow]} onPress={onLogout}>
            <View style={styles.prefLeft}>
              <MaterialIcons name="logout" size={24} color={COLORS.error} />
              <Text style={[styles.prefText, styles.logoutText]}>Logout from Account</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New Balaji Transports & ARS Fleet Transit</Text>
          <Text style={styles.footerSub}>Secure Logistics Console © 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    padding: SPACING.gutter,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.gutter * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.light,
    marginBottom: SPACING.stack,
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    marginBottom: SPACING.gutter,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
  },
  badge: {
    backgroundColor: COLORS.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    color: COLORS.onPrimary,
    fontWeight: 'bold',
  },
  subtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.gutter,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.light,
  },
  statVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLbl: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  // Telemetry styles
  telemetryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    ...SHADOWS.light,
  },
  telemetryScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  scoreLabel: {
    fontSize: 8,
    color: COLORS.success,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  scoreDetails: {
    flex: 1,
  },
  telemetryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  telemetryRating: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
    marginVertical: 2,
  },
  telemetryDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metricLabel: {
    fontSize: 13,
    color: COLORS.textDark,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  // Ledger styles
  ledgerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    ...SHADOWS.light,
  },
  ledgerTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 16,
  },
  chartBarWrapper: {
    marginBottom: 12,
  },
  chartBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chartBarLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  chartBarValue: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  chartBarTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 4,
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  // History styles
  historyEmptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyHistoryDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    ...SHADOWS.light,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyTripId: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  historyDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  historyRoute: {
    marginBottom: 12,
  },
  routeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 8,
    borderRadius: 8,
  },
  historyStat: {
    alignItems: 'center',
  },
  histLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  histVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Preferences styles
  preferencesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: 16,
    ...SHADOWS.light,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prefText: {
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  logoutRow: {
    // optional logout styles
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  footerSub: {
    fontSize: 10,
    color: COLORS.outline,
    marginTop: 4,
  },
  vehicleDocCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    marginBottom: SPACING.stack,
    ...SHADOWS.light,
  },
  vehicleDocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  vehicleDocIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleDocMeta: {
    flex: 1,
  },
  vehicleDocNum: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  vehicleDocType: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  viewDocsBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewDocsBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
