import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { Trip } from '../db/database';

interface HomeScreenProps {
  driverId: string;
  activeTrip: Trip | null;
  onStartTripPress: () => void;
  onNavigatePress: () => void;
  onAddExpensePress: () => void;
  onUploadPodPress: () => void;
  onArrivedPress: () => void;
  onSwitchToMap: () => void;
  onLogout: () => void;
}

export default function HomeScreen({
  driverId,
  activeTrip,
  onStartTripPress,
  onNavigatePress,
  onAddExpensePress,
  onUploadPodPress,
  onArrivedPress,
  onSwitchToMap,
  onLogout,
}: HomeScreenProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="account-circle" size={32} color={COLORS.outline} />
          </View>
          <Text style={styles.headerTitle}>Driver Console</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <MaterialIcons name="logout" size={24} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Welcome message */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greetingText}>
            {getGreeting()}, {activeTrip ? activeTrip.driverName.split(' ')[0] : 'Driver'}
          </Text>
          <View style={styles.driverBadgeRow}>
            <View style={styles.driverBadge}>
              <Text style={styles.driverBadgeText}>{driverId}</Text>
            </View>
            {activeTrip ? (
              <Text style={styles.vehicleInfoText}>
                {activeTrip.vehicleNumber} • {activeTrip.vehicleType}
              </Text>
            ) : null}
          </View>
        </View>

        {activeTrip ? (
          <View style={styles.tripCard}>
            {/* Status Header */}
            <View style={styles.tripHeader}>
              <View>
                <View style={[
                  styles.statusTag,
                  activeTrip.status === 'ASSIGNED' ? styles.statusAssigned : styles.statusProgress
                ]}>
                  <Text style={styles.statusTagText}>
                    {activeTrip.status === 'ASSIGNED' ? 'TRIP ASSIGNED' : activeTrip.status.replace(/_/g, ' ')}
                  </Text>
                </View>
                <Text style={styles.tripCardTitle}>Active Trip</Text>
              </View>
              <Text style={styles.tripIdText} numberOfLines={1} ellipsizeMode="tail">
                {activeTrip.trackingId?.length > 15 ? activeTrip.trackingId.substring(0, 8).toUpperCase() : activeTrip.trackingId}
              </Text>
            </View>

            {/* Stepper Timeline */}
            <View style={styles.timelineContainer}>
              <View style={styles.timelineNode}>
                <View style={styles.timelineDotOuter}>
                  <MaterialIcons name="trip-origin" size={16} color={COLORS.outline} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>🛣️ STARTING POINT</Text>
                  <Text style={styles.timelineValue}>{activeTrip.startingPoint}</Text>
                </View>
              </View>

              <View style={styles.timelineConnector} />

              <View style={styles.timelineNode}>
                <View style={[styles.timelineDotOuter, styles.destDotOuter]}>
                  <View style={styles.destDotInner} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>📍 DESTINATION</Text>
                  <Text style={styles.timelineValue}>{activeTrip.destination}</Text>
                </View>
              </View>
            </View>

            {/* Odometer Documents */}
            {(activeTrip.odometerStartPhotoUri || activeTrip.odometerEndPhotoUri) && (
              <View style={styles.odoDocsRow}>
                {activeTrip.odometerStartPhotoUri && (
                  <View style={styles.odoDocItem}>
                    <Text style={styles.odoDocLabel}>📷 START ODO</Text>
                    <Image source={{ uri: activeTrip.odometerStartPhotoUri }} style={styles.odoDocImage} resizeMode="cover" />
                    <Text style={styles.odoDocValue}>{activeTrip.odometerStart} KM</Text>
                  </View>
                )}
                {activeTrip.odometerEndPhotoUri && (
                  <View style={styles.odoDocItem}>
                    <Text style={styles.odoDocLabel}>📷 END ODO</Text>
                    <Image source={{ uri: activeTrip.odometerEndPhotoUri }} style={styles.odoDocImage} resizeMode="cover" />
                    <Text style={styles.odoDocValue}>{activeTrip.odometerEnd} KM</Text>
                  </View>
                )}
              </View>
            )}

            {/* Toll Estimates Panel */}
            <View style={styles.tollPanel}>
              <View style={styles.tollItem}>
                <Text style={styles.tollLabel}>🛣️ ESTIMATED TOLLS</Text>
                <Text style={styles.tollValue}>{activeTrip.tollsCount} Plazas</Text>
              </View>
              <View style={styles.tollItem}>
                <Text style={styles.tollLabel}>💰 ESTIMATED TOLL COST</Text>
                <Text style={styles.tollValue}>₹{activeTrip.estimatedTollCost} <Text style={styles.approxText}>(Approx.)</Text></Text>
              </View>
            </View>

            {/* Action Buttons based on trip status */}
            {activeTrip.status === 'ASSIGNED' ? (
              <Animated.View style={{ width: '100%', transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity style={styles.startBtn} onPress={onStartTripPress}>
                  <MaterialIcons name="play-arrow" size={32} color={COLORS.onPrimary} />
                  <Text style={styles.startBtnText}>START TRIP</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={styles.inTripActions}>
                {activeTrip.status === 'REACHED_DESTINATION' ? (
                  <TouchableOpacity style={styles.podBtn} onPress={onUploadPodPress}>
                    <MaterialIcons name="fact-check" size={24} color={COLORS.onPrimary} />
                    <Text style={styles.podBtnText}>UPLOAD POD & COMPLETE</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity style={styles.navBtn} onPress={onNavigatePress}>
                      <MaterialIcons name="navigation" size={24} color={COLORS.onPrimary} />
                      <Text style={styles.navBtnText}>OPEN NAVIGATION</Text>
                    </TouchableOpacity>
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.expenseActionBtn} onPress={onAddExpensePress}>
                        <MaterialIcons name="add-card" size={24} color={COLORS.primary} />
                        <Text style={styles.expenseActionText}>Add Expense</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.arrivalActionBtn} onPress={onArrivedPress}>
                        <MaterialIcons name="place" size={24} color={COLORS.onPrimary} />
                        <Text style={styles.arrivalActionText}>Arrived Depot</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <MaterialIcons name="assignment-late" size={64} color={COLORS.outline} />
            <Text style={styles.emptyTitle}>No Active Trips</Text>
            <Text style={styles.emptyText}>
              There are no trips currently assigned to your ID ({driverId}). Please contact dispatch or switch to the Admin view to create a trip.
            </Text>
          </View>
        )}

        {/* Info card on Trip Progress Stepper */}
        {activeTrip ? (
          <View style={styles.stepperCard}>
            <Text style={styles.stepperTitle}>Trip Progress</Text>
            <View style={styles.stepperRow}>
              <View style={styles.step}>
                <View style={[styles.stepDot, activeTrip.status !== 'ASSIGNED' && styles.stepDotCompleted]}>
                  {activeTrip.status !== 'ASSIGNED' ? (
                    <MaterialIcons name="check" size={12} color={COLORS.onPrimary} />
                  ) : null}
                </View>
                <Text style={styles.stepText}>Start</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.step}>
                <View style={[
                  styles.stepDot, 
                  (activeTrip.status === 'ON_THE_WAY' || activeTrip.status === 'REACHED_DESTINATION' || activeTrip.status === 'COMPLETED') && styles.stepDotCompleted
                ]}>
                  {(activeTrip.status === 'ON_THE_WAY' || activeTrip.status === 'REACHED_DESTINATION' || activeTrip.status === 'COMPLETED') ? (
                    <MaterialIcons name="check" size={12} color={COLORS.onPrimary} />
                  ) : null}
                </View>
                <Text style={styles.stepText}>Transit</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.step}>
                <View style={[
                  styles.stepDot, 
                  (activeTrip.status === 'REACHED_DESTINATION' || activeTrip.status === 'COMPLETED') && styles.stepDotCompleted
                ]}>
                  {(activeTrip.status === 'REACHED_DESTINATION' || activeTrip.status === 'COMPLETED') ? (
                    <MaterialIcons name="check" size={12} color={COLORS.onPrimary} />
                  ) : null}
                </View>
                <Text style={styles.stepText}>Arrival</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.step}>
                <View style={[styles.stepDot, activeTrip.status === 'COMPLETED' && styles.stepDotCompleted]}>
                  {activeTrip.status === 'COMPLETED' ? (
                    <MaterialIcons name="check" size={12} color={COLORS.onPrimary} />
                  ) : null}
                </View>
                <Text style={styles.stepText}>POD</Text>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBar: {
    flexDirection: 'row',
    height: SPACING.touchTarget,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.gutter,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  logoutBtn: {
    padding: 8,
  },
  scrollContainer: {
    padding: SPACING.gutter,
    paddingBottom: 100,
  },
  welcomeSection: {
    marginBottom: SPACING.stack,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  driverBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  driverBadge: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  driverBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  vehicleInfoText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.gutter,
    ...SHADOWS.light,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: SPACING.gutter,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.gutter * 1.5,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  statusAssigned: {
    backgroundColor: COLORS.primary,
  },
  statusProgress: {
    backgroundColor: COLORS.success,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
  tripCardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  tripIdText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  timelineContainer: {
    paddingLeft: 12,
    marginBottom: SPACING.gutter * 1.5,
  },
  timelineNode: {
    flexDirection: 'row',
    gap: 16,
  },
  timelineDotOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  destDotOuter: {
    borderColor: COLORS.secondary,
  },
  destDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
  },
  timelineConnector: {
    width: 2,
    height: 32,
    backgroundColor: COLORS.outlineVariant,
    marginLeft: 11,
    marginVertical: -4,
  },
  timelineContent: {
    flex: 1,
    justifyContent: 'center',
  },
  timelineLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  timelineValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    marginTop: 2,
  },
  tollPanel: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: SPACING.gutter,
    gap: 12,
    marginBottom: SPACING.gutter * 1.5,
  },
  tollItem: {
    flex: 1,
  },
  tollLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  tollValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: 4,
  },
  approxText: {
    fontSize: 12,
    fontWeight: 'normal',
    color: COLORS.textMuted,
  },
  startBtn: {
    height: SPACING.touchTargetLarge,
    backgroundColor: COLORS.orangeAccent,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0px 4px 8px rgba(249, 115, 22, 0.25)',
    elevation: 4,
  },
  startBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
  inTripActions: {
    gap: 12,
  },
  navBtn: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
  podBtn: {
    height: 56,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  podBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  expenseActionBtn: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  expenseActionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  arrivalActionBtn: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  arrivalActionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.gutter * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.light,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: SPACING.gutter,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  stepperCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.gutter,
    ...SHADOWS.light,
    marginTop: 6,
  },
  stepperTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.gutter,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  step: {
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.outlineVariant,
    marginBottom: 16,
    marginHorizontal: -8,
  },
  odoDocsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.gutter * 1.5,
  },
  odoDocItem: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 8,
    alignItems: 'center',
  },
  odoDocLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  odoDocImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 6,
  },
  odoDocValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 6,
  },
});
