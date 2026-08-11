import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db, Trip, Expense } from '../db/database';

export default function TripsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 880;
  const numColumns = isDesktop ? 2 : 1;
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'STARTED' | 'REACHED_DESTINATION' | 'COMPLETED'>('ALL');
  
  // Detail Modal State
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Driver Payment input
  const [driverPaymentInput, setDriverPaymentInput] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Ref to the modal-specific live refresh interval
  const modalIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref to the selected trip ID for use inside interval closures
  const selectedTripIdRef = useRef<string | null>(null);

  const fetchTrips = async (showIndicator = false) => {
    if (showIndicator) setLoading(true);
    try {
      const data = await db.getTrips();
      setTrips(data);
      // Keep modal in sync with latest data
      setSelectedTrip(prev => {
        if (!prev) return prev;
        const updated = data.find(t => t.id === prev.id);
        return updated ?? prev;
      });
    } catch (e) {
      console.error('Error fetching trips:', e);
    } finally {
      setLoading(false);
    }
  };

  // Fast single-trip refresh used while the modal is open
  const fetchSelectedTrip = async () => {
    const tripId = selectedTripIdRef.current;
    if (!tripId) return;
    try {
      setSyncing(true);
      const data = await db.getTrips();
      const fresh = data.find(t => t.id === tripId);
      if (fresh) {
        setSelectedTrip(fresh);
        setTrips(data);
      }
    } catch (_) {
      // silently ignore network blips
    } finally {
      setSyncing(false);
    }
  };

  // Background poll: 1.5 s when modal closed, modal handles its own 2 s loop
  useEffect(() => {
    fetchTrips(true);
    const interval = setInterval(() => fetchTrips(false), 1500);
    return () => clearInterval(interval);
  }, []);

  const handleOpenDetails = (trip: Trip) => {
    setSelectedTrip(trip);
    selectedTripIdRef.current = trip.id;
    setDriverPaymentInput(trip.driverPayment ? trip.driverPayment.toString() : '');
    setDetailModalVisible(true);
    // Immediately pull fresh data when admin taps a trip
    fetchSelectedTrip();
    // Start a fast 2-second refresh loop for this specific trip
    if (modalIntervalRef.current) clearInterval(modalIntervalRef.current);
    modalIntervalRef.current = setInterval(fetchSelectedTrip, 2000);
  };

  const handleCloseDetails = () => {
    setDetailModalVisible(false);
    selectedTripIdRef.current = null;
    if (modalIntervalRef.current) {
      clearInterval(modalIntervalRef.current);
      modalIntervalRef.current = null;
    }
    setSyncing(false);
  };

  const handleSavePayment = async () => {
    if (!selectedTrip) return;
    const payment = Number(driverPaymentInput);
    if (isNaN(payment) || payment < 0) {
      Alert.alert('Invalid Payment', 'Please enter a valid positive number for driver payment.');
      return;
    }

    setSavingPayment(true);
    try {
      const success = await db.updateTripPayment(selectedTrip.id, payment);
      if (success) {
        Alert.alert('Payment Saved', 'Driver payment and Profit/Loss updated successfully.');
        await fetchTrips(false);
      } else {
        Alert.alert('Error', 'Failed to save payment details.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network connection failed.');
    } finally {
      setSavingPayment(false);
    }
  };

  const handlePrintPDF = async (tripId: string) => {
    if (!selectedTrip) return;
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
              h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
              .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
              .details { margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #3498db; color: white; }
              .total { font-weight: bold; font-size: 1.2em; text-align: right; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h1>Trip Details Report</h1>
                <p><strong>Tracking ID:</strong> ${selectedTrip.trackingId}</p>
                <p><strong>Trip ID:</strong> ${selectedTrip.id}</p>
              </div>
              <div>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${selectedTrip.status.replace('_', ' ')}</p>
              </div>
            </div>
            
            <div class="details">
              <h3>Driver & Vehicle Information</h3>
              <p><strong>Driver Name:</strong> ${selectedTrip.driverName}</p>
              <p><strong>Vehicle Number:</strong> ${selectedTrip.vehicleNumber}</p>
              <p><strong>Route:</strong> ${selectedTrip.startingPoint} &rarr; ${selectedTrip.destination}</p>
              <p><strong>Agreed Freight:</strong> ₹${(selectedTrip.agreedFreight || 0).toLocaleString()}</p>
            </div>

            <h3>Expenses Log</h3>
            ${(!selectedTrip.expenses || selectedTrip.expenses.length === 0) ? '<p>No expenses logged.</p>' : `
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Reason / Details</th>
                    <th>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${selectedTrip.expenses.map(exp => `
                    <tr>
                      <td>${exp.category}</td>
                      <td>${exp.reason || (exp.liters ? exp.liters + ' Liters' : '')}</td>
                      <td>₹${exp.amount.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="total">Total Expenses: ₹${(selectedTrip.expenses.reduce((sum, e) => sum + e.amount, 0) || 0).toLocaleString()}</div>
            `}
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
              <h3>Profit & Loss Settlement</h3>
              <p><strong>Agreed Freight:</strong> ₹${(selectedTrip.agreedFreight || 0).toLocaleString()}</p>
              <p><strong>Driver Payment:</strong> ₹${(selectedTrip.driverPayment || 0).toLocaleString()}</p>
              <p><strong>Final Settlement:</strong> ${(selectedTrip.profitOrLoss ?? 0) >= 0 ? `Profit of ₹${(selectedTrip.profitOrLoss ?? 0).toLocaleString()}` : `Loss of ₹${Math.abs(selectedTrip.profitOrLoss ?? 0).toLocaleString()}`}</p>
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        // Open web print dialog
        await Print.printAsync({ html });
      } else {
        // Save to PDF on mobile
        const { uri } = await Print.printToFileAsync({ html });
        Alert.alert('PDF Generated', 'The PDF has been generated successfully.');
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        }
      }
    } catch (error) {
      console.warn('PDF Error:', error);
      Alert.alert('Error', 'Could not generate PDF.');
    }
  };

  // Filtered trips
  const filteredTrips = trips.filter(t => {
    const matchesSearch = t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.driverName.toLowerCase().includes(search.toLowerCase()) ||
      t.vehicleNumber.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || 
      (statusFilter === 'STARTED' && ['STARTED', 'ON_THE_WAY'].includes(t.status)) ||
      (statusFilter === 'ASSIGNED' && ['ASSIGNED', 'NOT STARTED'].includes(t.status)) ||
      t.status === statusFilter;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'ASSIGNED': return COLORS.textMuted;
      case 'STARTED':
      case 'ON_THE_WAY': return '#3b82f6';
      case 'REACHED_DESTINATION': return COLORS.secondary;
      case 'COMPLETED': return COLORS.success;
      default: return COLORS.textMuted;
    }
  };

  // Edit Trip states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editVehicleNumber, setEditVehicleNumber] = useState('');
  const [editStartingPoint, setEditStartingPoint] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editFreight, setEditFreight] = useState('');
  const [editStatus, setEditStatus] = useState<Trip['status']>('ASSIGNED');
  const [editDriverPin, setEditDriverPin] = useState('');

  const handleOpenEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setEditDriverName(trip.driverName || '');
    setEditVehicleNumber(trip.vehicleNumber || '');
    setEditStartingPoint(trip.startingPoint || '');
    setEditDestination(trip.destination || '');
    setEditFreight(String(trip.agreedFreight || 0));
    setEditStatus(trip.status || 'ASSIGNED');
    setEditDriverPin(trip.driverPin || '1234');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTrip) return;
    try {
      await db.updateTripDetails(editingTrip.id, {
        driverName: editDriverName,
        vehicleNumber: editVehicleNumber,
        startingPoint: editStartingPoint,
        destination: editDestination,
        agreedFreight: Number(editFreight || 0),
        status: editStatus,
        driverPin: editDriverPin,
      });
      Alert.alert('Success', 'Trip details updated successfully.');
      setEditModalVisible(false);
      await fetchTrips(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update trip details.');
    }
  };

  const handleDeleteTrip = (tripId: string) => {
    const executeDelete = async () => {
      await db.deleteTrip(tripId);
      if (selectedTrip?.id === tripId) {
        handleCloseDetails();
      }
      await fetchTrips(false);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to permanently delete Trip ${tripId}?`)) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Delete Trip',
        `Are you sure you want to permanently delete Trip ${tripId}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  };

  const handleTogglePin = async (tripId: string) => {
    await db.togglePinTrip(tripId);
    await fetchTrips(false);
  };

  const renderTripItem = ({ item }: { item: Trip }) => {
    const totalExpenses = item.expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const expCount = item.expenses?.length || 0;
    return (
      <View style={[styles.tripCard, isDesktop && { flex: 1, marginHorizontal: 4 }]}>
        <TouchableOpacity onPress={() => handleOpenDetails(item)}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.tripIdText}>{item.id}</Text>
              {item.isPinned && (
                <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#f59e0b' }}>
                  <Text style={{ fontSize: 10, color: '#b45309', fontWeight: 'bold' }}>📌 PINNED</Text>
                </View>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.replace('_', ' ')}</Text>
            </View>
          </View>

          <View style={styles.cardInfoRow}>
            <MaterialIcons name="local-shipping" size={16} color={COLORS.textMuted} />
            <Text style={styles.cardInfoText}>{item.vehicleNumber} ({item.vehicleType})</Text>
          </View>
          
          <View style={styles.cardInfoRow}>
            <MaterialIcons name="person" size={16} color={COLORS.textMuted} />
            <Text style={styles.cardInfoText}>{item.driverName} (PIN: {item.driverPin || '****'})</Text>
          </View>

          <View style={styles.routeContainer}>
            <Text style={styles.routePoint}>{item.startingPoint}</Text>
            <MaterialIcons name="arrow-forward" size={14} color={COLORS.textMuted} style={styles.routeArrow} />
            <Text style={styles.routePoint}>{item.destination}</Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.footerLabel}>Freight: <Text style={styles.footerValue}>₹{(item.agreedFreight || 0).toLocaleString()}</Text></Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {expCount > 0 && (
                <View style={styles.expenseBadge}>
                  <MaterialIcons name="receipt" size={10} color="#ffffff" />
                  <Text style={styles.expenseBadgeText}>{expCount} exp</Text>
                </View>
              )}
              <Text style={styles.footerLabel}>Total: <Text style={[styles.footerValue, { color: '#b91c1c' }]}>₹{totalExpenses.toLocaleString()}</Text></Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── CARD ACTION TOOLS (EDIT, PIN, DOWNLOAD, DELETE) ── */}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.outlineVariant, paddingTop: 8, marginTop: 8, justifyContent: 'space-around' }}>
          <TouchableOpacity onPress={() => handleOpenEdit(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
            <MaterialIcons name="edit" size={16} color={COLORS.primary} />
            <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: 'bold' }}>EDIT</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleTogglePin(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
            <MaterialIcons name="push-pin" size={16} color={item.isPinned ? '#d97706' : COLORS.textMuted} />
            <Text style={{ fontSize: 11, color: item.isPinned ? '#d97706' : COLORS.textMuted, fontWeight: 'bold' }}>{item.isPinned ? 'UNPIN' : 'PIN'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handlePrintPDF(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
            <MaterialIcons name="file-download" size={16} color={COLORS.secondary} />
            <Text style={{ fontSize: 11, color: COLORS.secondary, fontWeight: 'bold' }}>PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleDeleteTrip(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
            <MaterialIcons name="delete-outline" size={16} color="#dc2626" />
            <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: 'bold' }}>DELETE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Search Bar */}
      <View style={styles.headerBar}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={COLORS.outline} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Trip ID, Driver, Lorry..."
            placeholderTextColor={COLORS.outline}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['ALL', 'ASSIGNED', 'STARTED', 'REACHED_DESTINATION', 'COMPLETED'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterTab, statusFilter === status && styles.filterTabActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[styles.filterTabText, statusFilter === status && styles.filterTabTextActive]}>
              {status === 'ALL' ? 'ALL' : status === 'STARTED' ? 'IN TRANSIT' : status.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main List */}
      {loading && trips.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching trips from server...</Text>
        </View>
      ) : filteredTrips.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialIcons name="local-shipping" size={64} color={COLORS.outline} />
          <Text style={styles.emptyTitle}>No matching trips found</Text>
          <Text style={styles.emptyDesc}>Try adjusting your filters or search query.</Text>
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={filteredTrips}
          numColumns={numColumns}
          columnWrapperStyle={isDesktop ? { justifyContent: 'space-between', marginBottom: 8 } : undefined}
          keyExtractor={(item) => item.id}
          renderItem={renderTripItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Detail Modal */}
      {selectedTrip && (
        <Modal
          visible={detailModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={handleCloseDetails}
        >
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseDetails} style={styles.closeBtn}>
                <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Trip Details — {selectedTrip.id}</Text>
                {/* Live sync indicator */}
                <View style={styles.liveSyncRow}>
                  <View style={[styles.liveDot, syncing && styles.liveDotPulse]} />
                  <Text style={styles.liveSyncText}>
                    {syncing ? 'Syncing with driver...' : 'LIVE — auto-refreshing every 2s'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handlePrintPDF(selectedTrip.id)} style={styles.printBtn}>
                <MaterialIcons name="print" size={20} color="#ffffff" />
                <Text style={styles.printBtnText}>PDF</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {/* Status Section */}
              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>CURRENT STAGE:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedTrip.status) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedTrip.status) }]}>{selectedTrip.status.replace('_', ' ')}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tracking ID:</Text>
                  <Text style={styles.detailValue}>{selectedTrip.trackingId}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Driver ID:</Text>
                  <Text style={styles.detailValue}>{selectedTrip.driverId}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Driver PIN:</Text>
                  <Text style={[styles.detailValue, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 2, fontWeight: 'bold' }]}>{selectedTrip.driverPin || '****'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Odometer Start:</Text>
                  <Text style={styles.detailValue}>{selectedTrip.odometerStart ? `${selectedTrip.odometerStart} km` : 'Pending start'}</Text>
                </View>
                {selectedTrip.odometerStartPhotoUri ? (
                  <View style={{ marginTop: 8, marginBottom: 12, backgroundColor: '#f0f4f8', padding: 10, borderRadius: 8 }}>
                    <Text style={[styles.detailLabel, { fontWeight: 'bold', marginBottom: 6 }]}>📸 Initial Odometer Photo (Driver Upload):</Text>
                    <Image
                      source={{ uri: selectedTrip.odometerStartPhotoUri }}
                      style={{ width: '100%', height: 180, borderRadius: 8, borderWidth: 1, borderColor: COLORS.outlineVariant }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={{ marginTop: 6, alignSelf: 'flex-start' }}
                      onPress={() => Linking.openURL(selectedTrip.odometerStartPhotoUri!)}
                    >
                      <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 12 }}>Open Full Image ↗</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Odometer End:</Text>
                  <Text style={styles.detailValue}>{selectedTrip.odometerEnd ? `${selectedTrip.odometerEnd} km` : 'Trip active'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Diesel Start:</Text>
                  <Text style={styles.detailValue}>{selectedTrip.dieselStart || 'Pending'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Diesel End:</Text>
                  <Text style={styles.detailValue}>{selectedTrip.dieselEnd || 'Trip active'}</Text>
                </View>
              </View>

              {/* Expense Category breakdown */}
              <View style={styles.detailsCard}>
                <Text style={styles.cardSectionTitle}>Trip Operating Expenses</Text>
                
                {/* Categorized list */}
                {['FUEL', 'TOLL', 'RTO', 'POLICE', 'LORRY', 'OTHER'].map(cat => {
                  const items = selectedTrip.expenses?.filter(e => e.category === cat) || [];
                  const total = items.reduce((sum, e) => sum + e.amount, 0);
                  return (
                    <View key={cat} style={styles.expenseCatRow}>
                      <Text style={styles.expenseCatLabel}>{cat} TOTAL:</Text>
                      <Text style={styles.expenseCatAmount}>₹{total.toLocaleString()}</Text>
                    </View>
                  );
                })}

                <View style={styles.expenseTotalRow}>
                  <Text style={styles.expenseTotalLabel}>GRAND TOTAL EXPENSES:</Text>
                  <Text style={styles.expenseTotalValue}>
                    ₹{(selectedTrip.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0).toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Profit and Loss Management */}
              <View style={styles.detailsCard}>
                <Text style={styles.cardSectionTitle}>Profit & Loss Settlement</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Agreed Freight:</Text>
                  <Text style={[styles.detailValue, { fontWeight: 'bold' }]}>₹{(selectedTrip.agreedFreight || 0).toLocaleString()}</Text>
                </View>
                
                {/* Input for driver payment */}
                <View style={styles.paymentInputRow}>
                  <Text style={styles.paymentLabel}>Driver Payment (₹):</Text>
                  <TextInput
                    style={styles.paymentInput}
                    keyboardType="numeric"
                    placeholder="Enter payment amount"
                    value={driverPaymentInput}
                    onChangeText={setDriverPaymentInput}
                  />
                  <TouchableOpacity 
                    style={[styles.savePaymentBtn, savingPayment && { opacity: 0.6 }]}
                    onPress={handleSavePayment}
                    disabled={savingPayment}
                  >
                    {savingPayment ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.savePaymentText}>SAVE</Text>}
                  </TouchableOpacity>
                </View>

                {/* Final Net Profit Computation */}
                <View style={styles.netProfitRow}>
                  <Text style={styles.netProfitLabel}>FINAL SETTLEMENT:</Text>
                  <Text style={[styles.netProfitValue, { color: (selectedTrip.profitOrLoss ?? 0) >= 0 ? COLORS.success : COLORS.error }]}>
                    {(selectedTrip.profitOrLoss ?? 0) >= 0 
                      ? `PROFIT: +₹${(selectedTrip.profitOrLoss ?? 0).toLocaleString()}`
                      : `LOSS: -₹${Math.abs(selectedTrip.profitOrLoss ?? 0).toLocaleString()}`}
                  </Text>
                </View>
              </View>

              {/* POD Details */}
              <View style={styles.detailsCard}>
                <Text style={styles.cardSectionTitle}>Proof of Delivery (POD)</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>POD STATUS:</Text>
                  <Text style={[styles.detailValue, { fontWeight: 'bold', color: selectedTrip.podPhotoUri ? COLORS.success : COLORS.secondary }]}>
                    {selectedTrip.podPhotoUri ? 'POD UPLOADED ✓' : 'POD PENDING'}
                  </Text>
                </View>
                {selectedTrip.podPhotoUri ? (
                  <View style={styles.podDetailBlock}>
                    {/* POD Photo — displayed directly in Admin */}
                    <Text style={[styles.podInfoText, { fontWeight: 'bold', marginBottom: 8 }]}>📸 Delivery Photo:</Text>
                    {selectedTrip.podPhotoUri.startsWith('file://') ? (
                      <View style={{ padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#f59e0b' }}>
                        <Text style={{ fontSize: 12, color: '#92400e', fontWeight: 'bold' }}>⚠️ Saved locally on driver device</Text>
                        <Text style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>File path: {selectedTrip.podPhotoUri}</Text>
                      </View>
                    ) : (
                      <View style={{ marginBottom: 10 }}>
                        <Image
                          source={{ uri: selectedTrip.podPhotoUri }}
                          style={styles.podPhotoImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={{ marginTop: 4, alignSelf: 'flex-start' }}
                          onPress={() => Linking.openURL(selectedTrip.podPhotoUri!)}
                        >
                          <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 12 }}>Open Full Image ↗</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <Text style={styles.podInfoText}><Text style={{ fontWeight: 'bold' }}>Notes:</Text> {selectedTrip.podNotes || 'No notes added'}</Text>
                    <Text style={styles.podInfoText}><Text style={{ fontWeight: 'bold' }}>Signature:</Text> {selectedTrip.podSignature || 'N/A'}</Text>
                    <Text style={styles.podInfoText}><Text style={{ fontWeight: 'bold' }}>Delivery Date/Time:</Text> {selectedTrip.endDate} {selectedTrip.endTime}</Text>
                  </View>
                ) : null}
              </View>

              {/* Individual Expense entries list */}
              <View style={styles.detailsCard}>
                <Text style={styles.cardSectionTitle}>Individual Expense Log</Text>
                {(!selectedTrip.expenses || selectedTrip.expenses.length === 0) ? (
                  <Text style={styles.emptyExpensesText}>No expenses logged yet.</Text>
                ) : (
                  selectedTrip.expenses.map((exp, index) => (
                    <View key={exp.id} style={styles.individualExpenseCard}>
                      <View style={styles.indExpHeader}>
                        <Text style={styles.indExpCat}>{exp.category}</Text>
                        <Text style={styles.indExpAmt}>₹{exp.amount}</Text>
                      </View>
                      {exp.reason ? <Text style={styles.indExpReason}>{exp.reason}</Text> : null}
                      {exp.liters ? <Text style={styles.indExpReason}>{exp.liters} Liters</Text> : null}
                      <Text style={styles.indExpTime}>Time: {exp.timestamp}</Text>
                      {exp.location ? (
                        <Text style={styles.indExpLoc}>
                          Loc: {exp.location.city} ({exp.location.latitude.toFixed(4)}, {exp.location.longitude.toFixed(4)})
                        </Text>
                      ) : null}
                      {/* Expense Receipt Photo */}
                      {exp.receiptUri ? (
                        <View style={styles.receiptContainer}>
                          <Text style={styles.receiptLabel}>📄 Receipt Photo:</Text>
                          <Image
                            source={{ uri: exp.receiptUri }}
                            style={styles.receiptImage}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            style={styles.viewReceiptBtn}
                            onPress={() => Linking.openURL(exp.receiptUri!)}
                          >
                            <MaterialIcons name="open-in-new" size={14} color={COLORS.primary} />
                            <Text style={styles.viewReceiptText}>View Full Size</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* ── EDIT TRIP MODAL ── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant, backgroundColor: COLORS.surface }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.primary }}>Edit Trip {editingTrip?.id}</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <MaterialIcons name="close" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.textMuted, marginBottom: 4 }}>DRIVER NAME</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: COLORS.outlineVariant, borderRadius: 8, padding: 10, backgroundColor: '#fff', fontSize: 14 }}
                value={editDriverName}
                onChangeText={setEditDriverName}
                placeholder="Enter driver name"
              />
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.textMuted, marginBottom: 4 }}>VEHICLE NUMBER</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: COLORS.outlineVariant, borderRadius: 8, padding: 10, backgroundColor: '#fff', fontSize: 14 }}
                value={editVehicleNumber}
                onChangeText={setEditVehicleNumber}
                placeholder="e.g. TN 38 AB 1234"
              />
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.textMuted, marginBottom: 4 }}>DRIVER PIN</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: COLORS.outlineVariant, borderRadius: 8, padding: 10, backgroundColor: '#fff', fontSize: 14 }}
                value={editDriverPin}
                onChangeText={setEditDriverPin}
                keyboardType="numeric"
                placeholder="6-digit PIN"
              />
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.textMuted, marginBottom: 4 }}>STARTING POINT</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: COLORS.outlineVariant, borderRadius: 8, padding: 10, backgroundColor: '#fff', fontSize: 14 }}
                value={editStartingPoint}
                onChangeText={setEditStartingPoint}
                placeholder="Origin depot / location"
              />
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.textMuted, marginBottom: 4 }}>DESTINATION</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: COLORS.outlineVariant, borderRadius: 8, padding: 10, backgroundColor: '#fff', fontSize: 14 }}
                value={editDestination}
                onChangeText={setEditDestination}
                placeholder="Destination city / location"
              />
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.textMuted, marginBottom: 4 }}>AGREED FREIGHT (₹)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: COLORS.outlineVariant, borderRadius: 8, padding: 10, backgroundColor: '#fff', fontSize: 14 }}
                value={editFreight}
                onChangeText={setEditFreight}
                keyboardType="numeric"
                placeholder="Total agreed freight amount"
              />
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.textMuted, marginBottom: 4 }}>STAGE STATUS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['ASSIGNED', 'STARTED', 'ON_THE_WAY', 'REACHED_DESTINATION', 'COMPLETED'] as const).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: editStatus === st ? COLORS.primary : COLORS.outlineVariant, backgroundColor: editStatus === st ? COLORS.primary : '#fff' }}
                    onPress={() => setEditStatus(st)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: editStatus === st ? '#fff' : COLORS.textDark }}>{st.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: COLORS.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 }}
              onPress={handleSaveEdit}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>SAVE CHANGES</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBar: {
    padding: SPACING.gutter,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.secondary,
  },
  filterTabText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  filterTabTextActive: {
    color: COLORS.secondary,
  },
  listContent: {
    padding: SPACING.gutter,
    paddingBottom: 96,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 10,
    fontWeight: '600',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.light,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripIdText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardInfoText: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 10,
    borderRadius: 6,
    marginVertical: 10,
  },
  routePoint: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    flex: 1,
  },
  routeArrow: {
    paddingHorizontal: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: 10,
    marginTop: 4,
  },
  footerLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  footerValue: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  printBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: SPACING.gutter,
    paddingBottom: 48,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.light,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingBottom: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  expenseCatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  expenseCatLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
  expenseCatAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  expenseTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: 8,
    marginTop: 8,
  },
  expenseTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  expenseTotalValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#b91c1c',
  },
  paymentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  paymentLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  paymentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 8,
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
  savePaymentBtn: {
    backgroundColor: COLORS.primary,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savePaymentText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  netProfitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: 10,
    marginTop: 4,
  },
  netProfitLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  netProfitValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  podDetailBlock: {
    marginTop: 10,
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 10,
    borderRadius: 6,
    gap: 4,
  },
  podPhotoImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  podInfoText: {
    fontSize: 12,
    color: COLORS.textDark,
  },
  receiptContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: 8,
  },
  receiptLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  receiptImage: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceContainerLow,
    marginBottom: 6,
  },
  viewReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  viewReceiptText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  emptyExpensesText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginVertical: 12,
    fontStyle: 'italic',
  },
  individualExpenseCard: {
    backgroundColor: COLORS.background,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  indExpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  indExpCat: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  indExpAmt: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#b91c1c',
  },
  indExpReason: {
    fontSize: 11,
    color: COLORS.textDark,
    marginTop: 2,
  },
  indExpTime: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  indExpLoc: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  liveSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  liveDotPulse: {
    backgroundColor: COLORS.secondary,
  },
  liveSyncText: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  expenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#b91c1c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expenseBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
