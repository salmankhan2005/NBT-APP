import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Platform,
  Modal,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db, Trip, ActivityLog, FleetVehicle, Vehicle, DocumentExpiryStatus } from '../db/database';

interface DashboardScreenProps {
  onCreateTripPress: () => void;
  onNavigateToTrips: () => void;
}

export default function DashboardScreen({ onCreateTripPress, onNavigateToTrips }: DashboardScreenProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 880;
  const isTablet = width >= 600 && width < 880;
  const isPhone = width < 600;
  const isCompact = width < 720;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<Array<{ vehicleId: string; vehicleNumber: string; driverName: string; docLabel: string; expiryDate: string; status: DocumentExpiryStatus; daysLeft: number | null }>>([]);
  
  // Modal states
  const [monthlyReportVisible, setMonthlyReportVisible] = useState(false);
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>('');
  const [monthlyReportSearch, setMonthlyReportSearch] = useState('');
  
  // Simulator drawer state
  const [showSimulator, setShowSimulator] = useState(false);

  const [lorryBookingProfit, setLorryBookingProfit] = useState<number>(0);
  const [lorryBookingEntries, setLorryBookingEntries] = useState<Array<{
    id: string; from_point: string; destination_point: string;
    load_freight: number; lorry_freight: number; profit: number;
    profit_date: string; expenses: number;
  }>>([]);

  // Helper to format Current Month (e.g. "July 2026", "March 2026")
  const getCurrentMonthYear = () => {
    const now = new Date();
    return now.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const currentMonthYearStr = getCurrentMonthYear();

  // Fetch all dashboard data from shared database
  const fetchData = async (showIndicator = false) => {
    if (showIndicator) setLoading(true);
    try {
      const [fetchedTrips, fetchedFleetVehicles, fetchedLogs, fetchedAlerts] = await Promise.all([
        db.getTrips(),
        db.getFleetVehicles(),
        db.getActivityLogs(),
        db.getVehicleDocumentExpiryAlerts()
      ]);

      setTrips(fetchedTrips);
      setFleetVehicles(fetchedFleetVehicles);
      setActivityLogs(fetchedLogs);
      setExpiryAlerts(fetchedAlerts.map((alert) => ({
        vehicleId: alert.vehicleId,
        vehicleNumber: alert.vehicleNumber,
        driverName: alert.driverName || 'Unassigned Driver',
        docLabel: alert.docLabel,
        expiryDate: alert.expiryDate,
        status: alert.status,
        daysLeft: alert.daysLeft,
      })));

      // Fetch today's lorry booking profit + recent entries
      try {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        const token = db.getToken();
        if (token) {
          const [profitRes, entriesRes] = await Promise.all([
            fetch(`http://localhost:3001/api/lorry-booking/profit?fromDate=${today}&toDate=${today}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`http://localhost:3001/api/lorry-booking/entries?limit=5`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
          if (profitRes.ok) {
            const data = await profitRes.json();
            if (data.success) setLorryBookingProfit(Number(data.totalProfit || 0));
          }
          if (entriesRes.ok) {
            const data = await entriesRes.json();
            if (data.success) setLorryBookingEntries(data.entries || []);
          }
        }
      } catch {}
    } catch (e) {
      console.error('Error fetching admin dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setSelectedMonthYear(currentMonthYearStr);
    fetchData(true);

    // Subscribe to shared database real-time updates
    const unsubscribe = db.subscribe(() => {
      fetchData(false);
    });

    // Real-Time Polling fallback every 3 seconds
    const interval = setInterval(() => {
      fetchData(false);
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  // ─── 1. TOTAL NO. OF VEHICLES ────────────────────────────────────────────────
  // Total registered vehicles count in system
  const totalVehiclesCount = fleetVehicles.length;

  // ─── 2. ACTIVE TRIPS ────────────────────────────────────────────────────────
  // Active trips: status !== 'COMPLETED' (ASSIGNED, STARTED, ON_THE_WAY, REACHED_DESTINATION)
  const activeTripsList = trips.filter(t => t.status !== 'COMPLETED');
  const activeTripsCount = activeTripsList.length;

  // Breakdown of active trip statuses
  const startedCount = activeTripsList.filter(t => t.status === 'STARTED').length;
  const inTransitCount = activeTripsList.filter(t => t.status === 'ON_THE_WAY').length;
  const reachedDestinationCount = activeTripsList.filter(t => t.status === 'REACHED_DESTINATION').length;
  const podPendingCount = activeTripsList.filter(t => t.status === 'REACHED_DESTINATION' && !t.podPhotoUri).length;

  // ─── 3. AVAILABLE VEHICLES ──────────────────────────────────────────────────
  // A vehicle is AVAILABLE when:
  // - It is Active (vehicleStatus === 'Active')
  // - It is NOT currently assigned to an active trip
  // - It is NOT Under Maintenance (vehicleStatus !== 'Under Maintenance')
  const activeTripVehicleNumbers = new Set(activeTripsList.map(t => t.vehicleNumber.trim().toLowerCase()));

  const availableVehiclesList = fleetVehicles.filter(fv => {
    const isStatusActive = fv.vehicleStatus === 'Active';
    const isNotUnderMaintenance = fv.vehicleStatus !== 'Under Maintenance';
    const isNotOnActiveTrip = !activeTripVehicleNumbers.has(fv.vehicleNumber.trim().toLowerCase());
    return isStatusActive && isNotUnderMaintenance && isNotNotAssignedToTrip(isNotOnActiveTrip);
  });
  function isNotNotAssignedToTrip(val: boolean) { return val; }

  const availableVehiclesCount = availableVehiclesList.length;

  // ─── 4. COMPLETED TRIPS THIS MONTH ──────────────────────────────────────────
  const isTripInMonthYear = (trip: Trip, targetMonthYear: string) => {
    if (trip.status !== 'COMPLETED') return false;
    const dateToCheck = trip.endDate || trip.startDate || trip.lastUpdatedDate || trip.createdAt || '';
    if (!dateToCheck) return true;

    try {
      if (dateToCheck.toLowerCase().includes(targetMonthYear.toLowerCase())) return true;
      const parsedDate = new Date(dateToCheck);
      if (!isNaN(parsedDate.getTime())) {
        const formatted = parsedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (formatted.toLowerCase() === targetMonthYear.toLowerCase()) return true;
      }
    } catch (e) {}

    return true;
  };

  const allCompletedTrips = trips.filter(t => t.status === 'COMPLETED');
  const completedTripsThisMonth = trips.filter(t => isTripInMonthYear(t, currentMonthYearStr));
  const completedTripsCurrentMonthCount = allCompletedTrips.length;
  const expiredCount = expiryAlerts.filter((item) => item.status === 'EXPIRED').length;
  const sevenDayCount = expiryAlerts.filter((item) => item.status === 'EXPIRING_IN_7_DAYS').length;
  const thirtyDayCount = expiryAlerts.filter((item) => item.status === 'EXPIRING_SOON').length;

  // All completed trips for selected month (used in Monthly Report Modal)
  const completedTripsSelectedMonth = allCompletedTrips;

  // ─── LIVE FLEET ACTIVITY TIMELINE DATA ─────────────────────────────────────
  // For every active vehicle, show current movement
  // Active vehicles with trips + latest telemetry activities
  const activeVehiclesTimeline = activeTripsList.map(trip => {
    const fv = fleetVehicles.find(v => v.vehicleNumber.trim().toLowerCase() === trip.vehicleNumber.trim().toLowerCase());
    
    // Determine location: GPS if available, else manual driver location
    let currentLocationName = trip.lastKnownLocation || trip.currentGPS?.city || trip.startingPoint;
    let isGps = false;

    if (fv && fv.gpsDeviceStatus === 'Connected' && (fv.lastKnownCity || trip.currentGPS?.city)) {
      currentLocationName = fv.lastKnownCity || trip.currentGPS?.city || currentLocationName;
      isGps = true;
    } else if (trip.locationIsGps) {
      isGps = true;
    }

    // Driver name format
    let driverDisplayName = trip.driverName;
    if (!driverDisplayName.toLowerCase().startsWith('driver:')) {
      driverDisplayName = `Driver: ${driverDisplayName}`;
    }

    // Format status label
    let statusText = 'In Transit';
    if (trip.status === 'ASSIGNED') statusText = 'Trip Assigned';
    else if (trip.status === 'STARTED') statusText = 'Trip Started';
    else if (trip.status === 'ON_THE_WAY') statusText = 'In Transit';
    else if (trip.status === 'REACHED_DESTINATION') statusText = 'Reached Destination';

    const dateStr = trip.lastUpdatedDate || trip.startDate || '29 July 2026';
    const timeStr = trip.lastUpdatedTime || trip.startTime || '10:45 AM';

    return {
      id: trip.id,
      vehicleNumber: trip.vehicleNumber,
      driverName: driverDisplayName,
      startingLocation: trip.startingPoint,
      destination: trip.destination,
      currentLocation: currentLocationName,
      status: statusText,
      date: dateStr,
      time: timeStr,
      lastUpdated: `${dateStr} | ${timeStr}`,
      isGps,
      trip
    };
  });

  // Sort timeline by most recent first
  activeVehiclesTimeline.sort((a, b) => b.id.localeCompare(a.id));

  // ─── FLEET FINANCIAL SUMMARY DATA ──────────────────────────────────────────
  const totalAgreedFreight = trips.reduce((sum, t) => sum + (Number(t.agreedFreight) || 0), 0);
  const totalDriverLoggedExpenses = trips.reduce(
    (sum, t) => sum + (t.expenses?.reduce((s, e) => s + (Number(e.amount) || 0), 0) || 0),
    0
  );
  const totalDriverPayments = trips.reduce((sum, t) => sum + (Number(t.driverPayment) || 0), 0);
  const totalNetProfit = totalAgreedFreight - totalDriverLoggedExpenses - totalDriverPayments;

  // ─── FLEET STATUS SUMMARY DATA ──────────────────────────────────────────────
  const runningVehiclesCount = activeTripsList.filter(t => ['STARTED', 'ON_THE_WAY'].includes(t.status)).length;
  const underMaintenanceCount = fleetVehicles.filter(fv => fv.vehicleStatus === 'Under Maintenance').length;
  const offlineGpsCount = fleetVehicles.filter(fv => ['Offline', 'Signal Lost', 'Not Configured', 'Device Error'].includes(fv.gpsDeviceStatus)).length;

  // Simulator Handler
  const handleSimulateAction = async (
    type: 'START_TRIP' | 'UPDATE_LOCATION' | 'ADD_EXPENSE' | 'REACH_DESTINATION' | 'UPLOAD_POD' | 'COMPLETE_TRIP',
    tripId: string
  ) => {
    await db.simulateDriverAction(type, tripId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading New Balaji Transport Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Header Bar */}
        <View style={[styles.header, isPhone && styles.headerStacked]}>
          <View>
            <View style={styles.headerTitleRow}>
              <MaterialIcons name="directions-bus" size={24} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.title}>New Balaji Transport</Text>
            </View>
            <Text style={styles.subtitle}>Real-Time Central Command Admin Dashboard</Text>
          </View>
          <View style={[styles.headerActions, isPhone && styles.headerActionsStacked]}>
            <TouchableOpacity style={styles.createBtn} onPress={onCreateTripPress}>
              <MaterialIcons name="add" size={18} color="#ffffff" />
              <Text style={styles.createBtnText}>NEW TRIP</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.alertCard}>
          <View style={styles.alertHeaderRow}>
            <MaterialIcons name="warning-amber" size={18} color="#dc2626" />
            <Text style={styles.alertTitle}>DOCUMENT EXPIRY ALERTS</Text>
          </View>
          <View style={styles.alertMetricRow}>
            <View style={styles.alertMetricBox}>
              <Text style={styles.alertMetricValue}>{expiredCount}</Text>
              <Text style={styles.alertMetricLabel}>Expired</Text>
            </View>
            <View style={styles.alertMetricBox}>
              <Text style={styles.alertMetricValue}>{sevenDayCount}</Text>
              <Text style={styles.alertMetricLabel}>Within 7 Days</Text>
            </View>
            <View style={styles.alertMetricBox}>
              <Text style={styles.alertMetricValue}>{thirtyDayCount}</Text>
              <Text style={styles.alertMetricLabel}>Within 30 Days</Text>
            </View>
          </View>
          {expiryAlerts.slice(0, 3).map((alert) => {
            const expiryText = alert.expiryDate ? new Date(alert.expiryDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }) : 'Date missing';
            const daysText = alert.daysLeft !== null ? `${alert.daysLeft} day${Math.abs(alert.daysLeft) === 1 ? '' : 's'} left` : 'No date';

            return (
              <View key={`${alert.vehicleId}-${alert.docLabel}-${alert.expiryDate}`} style={styles.alertItem}>
                <Text style={styles.alertItemText}>{alert.driverName} · {alert.vehicleNumber} · {alert.docLabel}</Text>
                <Text style={styles.alertItemMeta}>{alert.status.replace(/_/g, ' ').toLowerCase()} · {expiryText}</Text>
                <Text style={[styles.alertItemMeta, { marginTop: 2, color: '#a5b4fc' }]}>{daysText}</Text>
              </View>
            );
          })}
        </View>

        {showSimulator && (
          <View style={styles.simulatorBanner}>
            <View style={styles.simulatorHeader}>
              <View style={styles.simTitleRow}>
                <MaterialIcons name="settings-remote" size={18} color="#eab308" />
                <Text style={styles.simulatorTitle}>Real-Time Driver Activity Simulator</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSimulator(false)}>
                <MaterialIcons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.simulatorDesc}>
              Simulate driver actions below to watch counts & live feed update automatically in real-time:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.simBtnScrollView}>
              <TouchableOpacity
                style={[styles.simActionChip, { backgroundColor: '#2563eb' }]}
                onPress={() => handleSimulateAction('START_TRIP', 'TRP-9824')}
              >
                <Text style={styles.simActionText}>▶ Driver Starts Trip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simActionChip, { backgroundColor: '#0284c7' }]}
                onPress={() => handleSimulateAction('UPDATE_LOCATION', 'TRP-1001')}
              >
                <Text style={styles.simActionText}>📍 Driver Updates GPS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simActionChip, { backgroundColor: '#d97706' }]}
                onPress={() => handleSimulateAction('ADD_EXPENSE', 'TRP-1002')}
              >
                <Text style={styles.simActionText}>💸 Driver Adds Fuel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simActionChip, { backgroundColor: '#7c3aed' }]}
                onPress={() => handleSimulateAction('REACH_DESTINATION', 'TRP-1003')}
              >
                <Text style={styles.simActionText}>🏁 Reaches Destination</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simActionChip, { backgroundColor: '#059669' }]}
                onPress={() => handleSimulateAction('COMPLETE_TRIP', 'TRP-1001')}
              >
                <Text style={styles.simActionText}>✅ Complete & Free Lorry</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TOP SUMMARY CARDS (4 MAIN SUMMARY CARDS)                                 */}
        {/* ========================================================================= */}
        <Text style={styles.sectionHeading}>FLEET SUMMARY METRICS</Text>

        <View style={[
          styles.cardsGrid,
          (isDesktop || isTablet) ? { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } : isPhone ? { flexDirection: 'column', gap: 12 } : undefined,
        ]}>
          {/* Card 1: TOTAL NO. OF VEHICLES */}
          <View style={[styles.summaryCard, { borderLeftColor: '#3b82f6' }, isDesktop && { flex: 1 }, isTablet && { width: '47%' }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>TOTAL NO. OF VEHICLES</Text>
              <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
                <MaterialIcons name="local-shipping" size={20} color="#2563eb" />
              </View>
            </View>
            <Text style={styles.cardValue}>{totalVehiclesCount}</Text>
            <Text style={styles.cardSubtext}>Total Registered Fleet in System</Text>
            <View style={styles.syncBadge}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>Auto-syncs on add/remove/status</Text>
            </View>
          </View>

          {/* Card 2: ACTIVE TRIPS */}
          <TouchableOpacity
            style={[styles.summaryCard, { borderLeftColor: '#0284c7' }, isDesktop && { flex: 1 }, isTablet && { width: '47%' }]}
            onPress={onNavigateToTrips}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>ACTIVE TRIPS</Text>
              <View style={[styles.iconCircle, { backgroundColor: '#e0f2fe' }]}>
                <MaterialIcons name="navigation" size={20} color="#0284c7" />
              </View>
            </View>
            <Text style={[styles.cardValue, { color: '#0284c7' }]}>{activeTripsCount}</Text>
            <View style={styles.activeBreakdownRow}>
              <Text style={styles.activeBreakdownText}>{inTransitCount + startedCount} In Transit</Text>
              <Text style={styles.bulletSeparator}>•</Text>
              <Text style={styles.activeBreakdownText}>{reachedDestinationCount} At Dest.</Text>
            </View>
            <View style={styles.syncBadge}>
              <View style={[styles.syncDot, { backgroundColor: '#0284c7' }]} />
              <Text style={styles.syncText}>Updates live as trips update</Text>
            </View>
          </TouchableOpacity>

          {/* Card 3: AVAILABLE VEHICLES */}
          <View style={[styles.summaryCard, { borderLeftColor: '#10b981' }, isDesktop && { flex: 1 }, isTablet && { width: '47%' }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>AVAILABLE VEHICLES</Text>
              <View style={[styles.iconCircle, { backgroundColor: '#d1fae5' }]}>
                <MaterialIcons name="check-circle" size={20} color="#10b981" />
              </View>
            </View>
            <Text style={[styles.cardValue, { color: '#10b981' }]}>{availableVehiclesCount}</Text>
            <Text style={styles.cardSubtext}>Active & Ready for New Trip</Text>
            <View style={styles.syncBadge}>
              <View style={[styles.syncDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.syncText}>Auto reduces on trip assignment</Text>
            </View>
          </View>

          {/* Card 4: COMPLETED TRIPS THIS MONTH */}
          <TouchableOpacity
            style={[styles.summaryCard, { borderLeftColor: '#8b5cf6' }, isDesktop && { flex: 1 }, isTablet && { width: '47%' }]}
            onPress={() => setMonthlyReportVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardLabel}>COMPLETED TRIPS</Text>
                <Text style={styles.monthBadgeText}>{currentMonthYearStr}</Text>
              </View>
              <View style={[styles.iconCircle, { backgroundColor: '#f3e8ff' }]}>
                <MaterialIcons name="verified" size={20} color="#8b5cf6" />
              </View>
            </View>
            <Text style={[styles.cardValue, { color: '#8b5cf6' }]}>{completedTripsCurrentMonthCount}</Text>
            <View style={styles.clickableRow}>
              <Text style={styles.clickableText}>Click to view Monthly Report</Text>
              <MaterialIcons name="chevron-right" size={16} color="#8b5cf6" />
            </View>
            <View style={styles.syncBadge}>
              <View style={[styles.syncDot, { backgroundColor: '#8b5cf6' }]} />
              <Text style={styles.syncText}>Auto resets every month</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* DRIVER TELEMETRY FINANCIAL AUDIT CARDS                                   */}
        {/* ========================================================================= */}
        <Text style={[styles.sectionHeading, { marginTop: 24 }]}>DRIVER EXPENSE & FINANCIAL AUDIT</Text>
        <View style={[styles.cardsGrid, isDesktop ? { flexDirection: 'row', gap: 12 } : { flexDirection: 'column', gap: 12 }]}>
          <View style={[styles.summaryCard, { borderLeftColor: '#059669', flex: 1 }]}>
            <Text style={styles.cardLabel}>TOTAL AGREED FREIGHT</Text>
            <Text style={[styles.cardValue, { color: '#059669', fontSize: 22 }]}>₹{totalAgreedFreight.toLocaleString()}</Text>
            <Text style={styles.cardSubtext}>Total gross revenue contracted</Text>
          </View>

          <View style={[styles.summaryCard, { borderLeftColor: '#dc2626', flex: 1 }]}>
            <Text style={styles.cardLabel}>DRIVER LOGGED EXPENSES</Text>
            <Text style={[styles.cardValue, { color: '#dc2626', fontSize: 22 }]}>₹{totalDriverLoggedExpenses.toLocaleString()}</Text>
            <Text style={styles.cardSubtext}>Fuel, Tolls, Police & RTO logged in driver app</Text>
          </View>

          <View style={[styles.summaryCard, { borderLeftColor: totalNetProfit >= 0 ? '#2563eb' : '#d97706', flex: 1 }]}>
            <Text style={styles.cardLabel}>NET PROFIT / LOSS</Text>
            <Text style={[styles.cardValue, { color: totalNetProfit >= 0 ? '#2563eb' : '#d97706', fontSize: 22 }]}>
              {totalNetProfit >= 0 ? `+₹${totalNetProfit.toLocaleString()}` : `-₹${Math.abs(totalNetProfit).toLocaleString()}`}
            </Text>
            <Text style={styles.cardSubtext}>Freight minus driver expenses & settlements</Text>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* LORRY BOOKING AGENCY TODAY'S PROFIT + RECENT BOOKINGS                    */}
        {/* ========================================================================= */}
        <Text style={[styles.sectionHeading, { marginTop: 24 }]}>LORRY BOOKING AGENCY</Text>
        <View style={[styles.summaryCard, { borderLeftColor: '#f97316' }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>TODAY'S BOOKING PROFIT</Text>
            <View style={[styles.iconCircle, { backgroundColor: '#fff7ed' }]}>
              <MaterialIcons name="receipt-long" size={20} color="#f97316" />
            </View>
          </View>
          <Text style={[styles.cardValue, { color: lorryBookingProfit >= 0 ? '#f97316' : '#dc2626', fontSize: 28 }]}>
            {lorryBookingProfit >= 0 ? '+' : ''}{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(lorryBookingProfit)}
          </Text>
          <Text style={styles.cardSubtext}>Net profit from all bookings entered today</Text>
          <View style={styles.syncBadge}>
            <View style={[styles.syncDot, { backgroundColor: '#f97316' }]} />
            <Text style={styles.syncText}>Refreshes every 3 seconds with dashboard</Text>
          </View>
        </View>

        {/* Recent Bookings List */}
        <View style={[styles.summaryCard, { borderLeftColor: '#f97316', marginBottom: 24, marginTop: 10 }]}>
          <Text style={styles.cardLabel}>RECENT BOOKINGS</Text>
          {lorryBookingEntries.length === 0 ? (
            <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 10, fontStyle: 'italic' }}>No bookings yet.</Text>
          ) : (
            lorryBookingEntries.map((entry) => {
              const dateStr = (() => {
                if (!entry.profit_date) return '';
                const d = new Date(entry.profit_date.includes('T') ? entry.profit_date : `${entry.profit_date}T00:00:00`);
                return isNaN(d.getTime()) ? entry.profit_date : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(d);
              })();
              return (
                <View key={entry.id} style={styles.lbEntryRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lbEntryRoute}>{entry.from_point} → {entry.destination_point}</Text>
                    <Text style={styles.lbEntryMeta}>Load ₹{Number(entry.load_freight).toLocaleString('en-IN')} · Lorry ₹{Number(entry.lorry_freight).toLocaleString('en-IN')} · {dateStr}</Text>
                  </View>
                  <View style={[styles.lbProfitBadge, { backgroundColor: entry.profit >= 0 ? '#dcfce7' : '#fee2e2' }]}>
                    <Text style={[styles.lbProfitText, { color: entry.profit >= 0 ? '#15803d' : '#dc2626' }]}>
                      {entry.profit >= 0 ? '+' : ''}₹{Math.abs(Number(entry.profit)).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ========================================================================= */}
        {/* LIVE FLEET ACTIVITY TIMELINE                                             */}
        {/* ========================================================================= */}
        <View style={styles.timelineSection}>
          <View style={[styles.sectionHeaderRow, isPhone && styles.sectionHeaderRowStacked]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.sectionTitleText}>LIVE FLEET ACTIVITY</Text>
              <View style={styles.livePulseContainer}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.timelineSubText}>Real-Time Movement Telemetry</Text>
          </View>

          {activeVehiclesTimeline.length === 0 ? (
            <View style={styles.emptyTimelineContainer}>
              <MaterialIcons name="directions-bus" size={36} color="#94a3b8" />
              <Text style={styles.emptyTimelineText}>No active trips currently in transit.</Text>
            </View>
          ) : (
            activeVehiclesTimeline.map((item, index) => (
              <View key={item.id} style={[styles.timelineCard, isPhone && styles.timelineCardStacked]}>
                {/* Timeline connector visual line */}
                <View style={styles.timelineSideBar}>
                  <View style={styles.timelineIconBubble}>
                    <Text style={{ fontSize: 14 }}>🚛</Text>
                  </View>
                  {index !== activeVehiclesTimeline.length - 1 && <View style={styles.timelineConnectorLine} />}
                </View>

                {/* Main Card Content */}
                <View style={styles.timelineMainContent}>
                  {/* Top Row: Vehicle Number & Driver */}
                  <View style={[styles.timelineTopRow, isPhone && styles.timelineTopRowStacked]}>
                    <View style={styles.vehiclePill}>
                      <Text style={styles.vehicleNumberText}>🚛 {item.vehicleNumber}</Text>
                    </View>
                    <Text style={styles.driverNameText}>{item.driverName}</Text>
                  </View>

                  {/* Route Row: Starting Location -> Destination */}
                  <View style={[styles.routeRow, isPhone && styles.routeRowStacked]}>
                    <Text style={styles.routeCityText}>{item.startingLocation}</Text>
                    <View style={styles.routeArrowContainer}>
                      <View style={styles.routeArrowLine} />
                      <MaterialIcons name="arrow-forward" size={14} color="#64748b" />
                    </View>
                    <Text style={styles.routeCityText}>{item.destination}</Text>
                  </View>

                  {/* Location & Status Row */}
                  <View style={[styles.locationStatusBox, isPhone && styles.locationStatusBoxCompact]}>
                    <View style={[styles.currentLocationRow, isPhone && styles.currentLocationRowStacked]}>
                      <MaterialIcons name="place" size={16} color={COLORS.primary} />
                      <Text style={styles.currentlyNearLabel}>Currently Near: </Text>
                      <Text style={styles.currentLocationValue}>{item.currentLocation}</Text>
                    </View>

                    <View style={styles.statusRow}>
                      <Text style={styles.statusLabelTitle}>Status: </Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{item.status}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Date, Time & Telemetry source footer */}
                  <View style={[styles.timelineFooterRow, isPhone && styles.timelineFooterRowStacked]}>
                    <View style={styles.dateTimeContainer}>
                      <MaterialIcons name="access-time" size={13} color="#64748b" />
                      <Text style={styles.dateTimeText}>{item.lastUpdated}</Text>
                    </View>

                    <View style={styles.telemetrySourceBadge}>
                      {item.isGps ? (
                        <>
                          <View style={[styles.telemetryDot, { backgroundColor: '#10b981' }]} />
                          <Text style={styles.telemetryText}>GPS Live</Text>
                        </>
                      ) : (
                        <>
                          <View style={[styles.telemetryDot, { backgroundColor: '#f59e0b' }]} />
                          <Text style={styles.telemetryText}>Driver Manual</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ========================================================================= */}
        {/* FLEET STATUS SUMMARY                                                      */}
        {/* ========================================================================= */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitleText}>FLEET STATUS SUMMARY</Text>
          <Text style={styles.summarySectionSubtitle}>Overall vehicle operational breakdown</Text>

          <View style={styles.fleetSummaryCard}>
            {/* Visual Status Proportion Bar */}
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressSegment, { flex: Math.max(runningVehiclesCount, 0.1), backgroundColor: '#16a34a' }]} />
              <View style={[styles.progressSegment, { flex: Math.max(availableVehiclesCount, 0.1), backgroundColor: '#2563eb' }]} />
              <View style={[styles.progressSegment, { flex: Math.max(underMaintenanceCount, 0.1), backgroundColor: '#f97316' }]} />
              <View style={[styles.progressSegment, { flex: Math.max(offlineGpsCount, 0.1), backgroundColor: '#dc2626' }]} />
            </View>

            {/* List of 5 Summary Metrics with Status Indicators */}
            <View style={styles.summaryItemsGrid}>
              <View style={[styles.summaryItemRow, isPhone && styles.summaryItemRowStacked]}>
                <View style={styles.summaryItemLeft}>
                  <Text style={styles.summaryIndicatorIcon}>🚚</Text>
                  <Text style={styles.summaryItemLabel}>Total Vehicles</Text>
                </View>
                <Text style={styles.summaryItemValue}>{totalVehiclesCount}</Text>
              </View>

              <View style={styles.summaryItemRow}>
                <View style={styles.summaryItemLeft}>
                  <Text style={styles.summaryIndicatorIcon}>🟢</Text>
                  <Text style={styles.summaryItemLabel}>Vehicles Currently Running</Text>
                </View>
                <Text style={[styles.summaryItemValue, { color: '#16a34a' }]}>{runningVehiclesCount}</Text>
              </View>

              <View style={styles.summaryItemRow}>
                <View style={styles.summaryItemLeft}>
                  <Text style={styles.summaryIndicatorIcon}>🔵</Text>
                  <Text style={styles.summaryItemLabel}>Available Vehicles</Text>
                </View>
                <Text style={[styles.summaryItemValue, { color: '#2563eb' }]}>{availableVehiclesCount}</Text>
              </View>

              <View style={styles.summaryItemRow}>
                <View style={styles.summaryItemLeft}>
                  <Text style={styles.summaryIndicatorIcon}>🟠</Text>
                  <Text style={styles.summaryItemLabel}>Vehicles Under Maintenance</Text>
                </View>
                <Text style={[styles.summaryItemValue, { color: '#f97316' }]}>{underMaintenanceCount}</Text>
              </View>

              <View style={styles.summaryItemRow}>
                <View style={styles.summaryItemLeft}>
                  <Text style={styles.summaryIndicatorIcon}>🔴</Text>
                  <Text style={styles.summaryItemLabel}>Vehicles Offline / GPS Unavailable</Text>
                </View>
                <Text style={[styles.summaryItemValue, { color: '#dc2626' }]}>{offlineGpsCount}</Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* ========================================================================= */}
      {/* MONTHLY COMPLETED TRIPS REPORT MODAL                                      */}
      {/* ========================================================================= */}
      <Modal
        visible={monthlyReportVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMonthlyReportVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, !isDesktop && styles.modalContentMobile]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Monthly Completed Trips Report</Text>
                <Text style={styles.modalSubtitle}>New Balaji Transport Archive</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setMonthlyReportVisible(false)}>
                <MaterialIcons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            {/* Month Switcher Selector */}
            <View style={styles.monthSelectorRow}>
              <Text style={styles.monthSelectorLabel}>Select Month:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthChipScroll}>
                {['July 2026', 'June 2026', 'May 2026', 'April 2026', 'March 2026'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthChip, selectedMonthYear === m && styles.monthChipActive]}
                    onPress={() => setSelectedMonthYear(m)}
                  >
                    <Text style={[styles.monthChipText, selectedMonthYear === m && styles.monthChipTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Selected Month Summary Banner */}
            <View style={styles.modalMonthSummaryBanner}>
              <MaterialIcons name="verified" size={28} color="#8b5cf6" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.modalMonthCountText}>
                  {selectedMonthYear} → {completedTripsSelectedMonth.length} Completed Trips
                </Text>
                <Text style={styles.modalMonthDescText}>
                  All historical monthly trip data remains safely preserved in database.
                </Text>
              </View>
            </View>

            {/* Search Input for Completed Trips */}
            <View style={styles.modalSearchWrapper}>
              <MaterialIcons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search trip ID, driver, vehicle number..."
                placeholderTextColor="#94a3b8"
                value={monthlyReportSearch}
                onChangeText={setMonthlyReportSearch}
              />
            </View>

            {/* List of Completed Trips */}
            <FlatList
              data={completedTripsSelectedMonth.filter(t => 
                t.id.toLowerCase().includes(monthlyReportSearch.toLowerCase()) ||
                t.driverName.toLowerCase().includes(monthlyReportSearch.toLowerCase()) ||
                t.vehicleNumber.toLowerCase().includes(monthlyReportSearch.toLowerCase())
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={styles.completedTripCard}>
                  <View style={styles.completedTripHeader}>
                    <Text style={styles.completedTripId}>{item.id} | {item.vehicleNumber}</Text>
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>COMPLETED</Text>
                    </View>
                  </View>

                  <Text style={styles.completedDriverText}>Driver: {item.driverName}</Text>
                  <Text style={styles.completedRouteText}>
                    📍 {item.startingPoint} ➔ {item.destination}
                  </Text>
                  <View style={[styles.completedFooterRow, isPhone && styles.completedFooterRowStacked]}>
                    <Text style={styles.completedDateText}>
                      Completed Date: {item.endDate || item.startDate || 'N/A'}
                    </Text>
                    <Text style={styles.completedFreightText}>
                      Freight: ₹{(item.agreedFreight || 45000).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyModalContainer}>
                  <Text style={styles.emptyModalText}>No completed trips found for {selectedMonthYear}.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.gutter,
    paddingBottom: 96,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 12 : 8,
  },
  headerStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionsStacked: {
    marginTop: 12,
    width: '100%',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  simBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 11,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },

  // Simulator banner
  simulatorBanner: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  simulatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  simTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  simulatorTitle: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 13,
  },
  simulatorDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 10,
  },
  simBtnScrollView: {
    flexDirection: 'row',
  },
  simActionChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
  },
  simActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // 4 Summary Cards Grid
  cardsGrid: {
    gap: 14,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.light,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  monthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b5cf6',
    marginTop: 2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
    marginVertical: 4,
    letterSpacing: -0.5,
  },
  cardSubtext: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  activeBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  activeBreakdownText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  bulletSeparator: {
    marginHorizontal: 6,
    color: '#94a3b8',
  },
  clickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  clickableText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    marginRight: 6,
  },
  syncText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Live Fleet Activity Timeline
  timelineSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderRowStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  livePulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#dc2626',
  },
  timelineSubText: {
    fontSize: 11,
    color: '#64748b',
  },
  emptyTimelineContainer: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTimelineText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
  },
  alertCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 16,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#c2410c',
  },
  alertMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  alertMetricBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
    minWidth: 92,
  },
  alertMetricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#c2410c',
  },
  alertMetricLabel: {
    fontSize: 10,
    color: '#9a2c00',
    marginTop: 2,
  },
  alertItem: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#fed7aa',
    marginTop: 10,
  },
  alertItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c2d12',
  },
  alertItemMeta: {
    fontSize: 11,
    color: '#9a2c00',
    marginTop: 2,
  },

  timelineCard: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineCardStacked: {
    marginLeft: 0,
  },
  timelineSideBar: {
    width: 32,
    alignItems: 'center',
  },
  timelineIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#cbd5e1',
    marginTop: 2,
  },
  timelineMainContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.light,
  },
  timelineTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineTopRowStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  vehiclePill: {
    backgroundColor: '#0f172a',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  vehicleNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  driverNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  routeRowStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  routeCityText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  routeArrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  routeArrowLine: {
    width: 16,
    height: 2,
    backgroundColor: '#cbd5e1',
  },

  locationStatusBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  locationStatusBoxCompact: {
    padding: 8,
  },
  currentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  currentLocationRowStacked: {
    alignItems: 'flex-start',
  },
  currentlyNearLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 4,
  },
  currentLocationValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabelTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  statusPill: {
    backgroundColor: '#dbeafe',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
  },

  timelineFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  timelineFooterRowStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateTimeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  telemetrySourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  telemetryDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  telemetryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },

  // Fleet Status Summary
  summarySection: {
    marginBottom: 20,
  },
  summarySectionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 12,
  },
  fleetSummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.light,
  },
  progressBarContainer: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressSegment: {
    height: '100%',
  },
  summaryItemsGrid: {
    gap: 12,
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  summaryItemRowStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  summaryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryIndicatorIcon: {
    fontSize: 14,
  },
  summaryItemLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  summaryItemValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalContentMobile: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    borderRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  modalCloseBtn: {
    padding: 4,
  },
  monthSelectorRow: {
    marginBottom: 14,
  },
  monthSelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  monthChipScroll: {
    flexDirection: 'row',
  },
  monthChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  monthChipActive: {
    backgroundColor: '#8b5cf6',
  },
  monthChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  monthChipTextActive: {
    color: '#ffffff',
  },
  modalMonthSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  modalMonthCountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6b21a8',
  },
  modalMonthDescText: {
    fontSize: 11,
    color: '#7e22ce',
    marginTop: 2,
  },
  modalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    height: 38,
    fontSize: 12,
    color: '#0f172a',
  },
  completedTripCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  completedTripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  completedTripId: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  completedBadge: {
    backgroundColor: '#dcfce7',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
  },
  completedDriverText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  completedRouteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginVertical: 4,
  },
  completedFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  completedFooterRowStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  completedDateText: {
    fontSize: 11,
    color: '#64748b',
  },
  completedFreightText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16a34a',
  },
  emptyModalContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyModalText: {
    color: '#64748b',
    fontSize: 12,
  },
  lbEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  lbEntryRoute: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  lbEntryMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  lbProfitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  lbProfitText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
