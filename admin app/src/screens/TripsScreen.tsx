import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { db, Trip, Expense, normalizeImageUrl } from '../db/database';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export interface TripDocument {
  id: string;
  type: 'ODOMETER' | 'POD' | 'EXPENSE';
  title: string;
  subtitle: string;
  uri: string;
}

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

  // Document Viewer State
  const [isDocViewerVisible, setIsDocViewerVisible] = useState(false);
  const [docFilter, setDocFilter] = useState<'ALL' | 'ODOMETER' | 'POD' | 'EXPENSE'>('ALL');
  const [selectedDoc, setSelectedDoc] = useState<TripDocument | null>(null);

  const getTripDocuments = (): TripDocument[] => {
    if (!selectedTrip) return [];
    const docs: TripDocument[] = [];
    
    if (selectedTrip.odometerStartPhotoUri) {
      docs.push({ id: 'odo-start', type: 'ODOMETER', title: 'Odometer Start Photo', subtitle: `Reading: ${selectedTrip.odometerStart || 'N/A'} km`, uri: selectedTrip.odometerStartPhotoUri });
    }
    if (selectedTrip.odometerEndPhotoUri) {
      docs.push({ id: 'odo-end', type: 'ODOMETER', title: 'Odometer End Photo', subtitle: `Reading: ${selectedTrip.odometerEnd || 'N/A'} km`, uri: selectedTrip.odometerEndPhotoUri });
    }
    if (selectedTrip.podPhotoUri) {
      docs.push({ id: 'pod-photo', type: 'POD', title: 'Proof of Delivery (POD)', subtitle: selectedTrip.endDate ? `Delivered: ${selectedTrip.endDate}` : 'Delivery Photo', uri: selectedTrip.podPhotoUri });
    }
    if (selectedTrip.expenses && selectedTrip.expenses.length > 0) {
      selectedTrip.expenses.forEach(exp => {
        if (exp.receiptUri) {
          docs.push({ id: `exp-${exp.id}`, type: 'EXPENSE', title: `${exp.category} Receipt`, subtitle: `Amount: ₹${exp.amount}`, uri: exp.receiptUri });
        }
      });
    }
    return docs;
  };

  const tripDocs = getTripDocuments();
  const filteredDocs = tripDocs.filter(d => docFilter === 'ALL' || d.type === docFilter);

  // Driver Payment input
  const [driverPaymentInput, setDriverPaymentInput] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Odometer edit
  const [editingOdometer, setEditingOdometer] = useState<'start' | 'end' | null>(null);
  const [odometerInput, setOdometerInput] = useState('');
  const [savingOdometer, setSavingOdometer] = useState(false);

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

  // Background poll: 6 s — in-flight dedup + short-term cache in db layer prevents thundering
  useEffect(() => {
    fetchTrips(true);
    const interval = setInterval(() => fetchTrips(false), 6000);
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

  const handleSaveOdometer = async () => {
    if (!selectedTrip || !editingOdometer) return;
    const val = Number(odometerInput);
    if (isNaN(val) || val < 0) {
      Alert.alert('Invalid Value', 'Please enter a valid odometer reading.');
      return;
    }
    setSavingOdometer(true);
    try {
      const success = await db.updateTripOdometer(
        selectedTrip.id,
        editingOdometer === 'start' ? val : undefined,
        editingOdometer === 'end' ? val : undefined,
      );
      if (success) {
        Alert.alert('Saved', `Odometer ${editingOdometer === 'start' ? 'start' : 'end'} updated to ${val} km.`);
        setEditingOdometer(null);
        await fetchTrips(false);
      } else {
        Alert.alert('Error', 'Failed to update odometer reading.');
      }
    } catch {
      Alert.alert('Error', 'Network error while saving.');
    } finally {
      setSavingOdometer(false);
    }
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
      const trip = selectedTrip;
      const totalExpenses = (trip.expenses || []).reduce((s, e) => s + Number(e.amount), 0);
      const profitOrLoss = trip.profitOrLoss ?? 0;
      const isProfitable = profitOrLoss >= 0;

      const expenseCats = ['FUEL','TOLL','RTO','POLICE','LORRY','OTHER'] as const;
      const catTotals = expenseCats.map(cat => ({
        cat,
        total: (trip.expenses || []).filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0),
      }));

      const expenseRows = (trip.expenses || []).map((exp, i) => `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
          <td>${i + 1}</td>
          <td><span class="badge badge-${exp.category.toLowerCase()}">${exp.category}</span></td>
          <td>${exp.reason || (exp.liters ? `${exp.liters} L` : '—')}</td>
          <td>${exp.liters ? `${exp.liters} L` : '—'}</td>
          <td>${exp.location ? exp.location.city : '—'}</td>
          <td>${exp.timestamp || '—'}</td>
          <td style="text-align:right;font-weight:700">₹${Number(exp.amount).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');

      const catSummaryRows = catTotals.filter(c => c.total > 0).map(c => `
        <tr>
          <td><span class="badge badge-${c.cat.toLowerCase()}">${c.cat}</span></td>
          <td style="text-align:right;font-weight:700">₹${c.total.toLocaleString('en-IN')}</td>
        </tr>
      `).join('');

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
    color: #1e293b;
    background: #fff;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 18px; }
  .brand { font-size: 22px; font-weight: 900; color: #1e3a5f; letter-spacing: 1px; }
  .brand-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
  .report-meta { text-align: right; font-size: 11px; color: #475569; line-height: 1.7; }
  .report-meta strong { color: #1e3a5f; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #1e3a5f; border-left: 4px solid #f97316; padding-left: 8px; margin-bottom: 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .info-item { display: flex; flex-direction: column; }
  .info-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 2px; }
  .info-value { font-size: 12px; font-weight: 600; color: #1e293b; }
  .route-bar { display: flex; align-items: center; gap: 10px; background: #f1f5f9; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; }
  .route-point { font-size: 13px; font-weight: 800; color: #1e3a5f; }
  .route-arrow { font-size: 18px; color: #f97316; }
  .status-chip { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
  .status-completed { background: #dcfce7; color: #166534; }
  .status-started, .status-on_the_way { background: #dbeafe; color: #1e40af; }
  .status-assigned { background: #f1f5f9; color: #475569; }
  .status-reached_destination { background: #fef9c3; color: #854d0e; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
  thead tr { background: #1e3a5f; color: #ffffff; }
  thead th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; word-break: break-word; overflow-wrap: anywhere; }
  .info-value, .route-point, .info-item { word-break: break-word; overflow-wrap: anywhere; }
  .section { break-inside: avoid; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
  .badge-fuel { background: #fef3c7; color: #92400e; }
  .badge-toll { background: #dbeafe; color: #1e40af; }
  .badge-rto { background: #ede9fe; color: #5b21b6; }
  .badge-police { background: #fee2e2; color: #991b1b; }
  .badge-lorry { background: #d1fae5; color: #065f46; }
  .badge-other { background: #f1f5f9; color: #475569; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .summary-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
  .summary-box-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 4px; }
  .summary-box-value { font-size: 18px; font-weight: 900; color: #1e3a5f; }
  .settlement-box { border: 2px solid #1e3a5f; border-radius: 10px; padding: 14px 18px; }
  .settlement-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
  .settlement-row:last-child { border-bottom: none; }
  .settlement-total { font-size: 15px; font-weight: 900; padding-top: 10px; margin-top: 6px; border-top: 2px solid #1e3a5f; display: flex; justify-content: space-between; }
  .profit { color: #16a34a; }
  .loss { color: #dc2626; }
  .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
  .pod-section { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 14px; }
  .no-expenses { text-align: center; padding: 20px; color: #94a3b8; font-style: italic; }
</style>
</head>
<body>

<div class="page-header">
  <div>
    <div class="brand">NEW BALAJI TRANSPORT</div>
    <div class="brand-sub">Trip Settlement Report</div>
  </div>
  <div class="report-meta">
    <div><strong>Trip ID:</strong> ${trip.id}</div>
    <div><strong>Tracking ID:</strong> ${trip.trackingId}</div>
    <div><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</div>
    <div style="margin-top:4px"><span class="status-chip status-${trip.status.toLowerCase().replace(/ /g,'_')}">${trip.status.replace(/_/g,' ')}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Route</div>
  <div class="route-bar">
    <div class="route-point">${trip.startingPoint}</div>
    <div class="route-arrow">→</div>
    <div class="route-point">${trip.destination}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Driver & Vehicle</div>
  <div class="info-grid">
    <div class="info-item"><span class="info-label">Driver Name</span><span class="info-value">${trip.driverName}</span></div>
    <div class="info-item"><span class="info-label">Driver ID</span><span class="info-value">${trip.driverId}</span></div>
    <div class="info-item"><span class="info-label">Vehicle Number</span><span class="info-value">${trip.vehicleNumber}</span></div>
    <div class="info-item"><span class="info-label">Vehicle Type</span><span class="info-value">${trip.vehicleType}</span></div>
    <div class="info-item"><span class="info-label">Odometer Start</span><span class="info-value">${trip.odometerStart ? trip.odometerStart + ' km' : 'N/A'}</span></div>
    <div class="info-item"><span class="info-label">Odometer End</span><span class="info-value">${trip.odometerEnd ? trip.odometerEnd + ' km' : 'N/A'}</span></div>
    <div class="info-item"><span class="info-label">Diesel Start</span><span class="info-value">${trip.dieselStart || 'N/A'}</span></div>
    <div class="info-item"><span class="info-label">Diesel End</span><span class="info-value">${trip.dieselEnd || 'N/A'}</span></div>
    <div class="info-item"><span class="info-label">Start Date</span><span class="info-value">${trip.startDate || 'N/A'}</span></div>
    <div class="info-item"><span class="info-label">End Date</span><span class="info-value">${trip.endDate || 'N/A'}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Expense Breakdown</div>
  ${(trip.expenses || []).length === 0
    ? '<div class="no-expenses">No expenses recorded for this trip.</div>'
    : `<table>
        <thead><tr>
          <th>#</th><th>Category</th><th>Reason / Details</th><th>Liters</th><th>Location</th><th>Time</th><th style="text-align:right">Amount</th>
        </tr></thead>
        <tbody>${expenseRows}</tbody>
        <tfoot><tr style="background:#f8fafc">
          <td colspan="6" style="text-align:right;font-weight:800;padding:8px 10px">TOTAL EXPENSES</td>
          <td style="text-align:right;font-weight:900;font-size:13px;padding:8px 10px">₹${totalExpenses.toLocaleString('en-IN')}</td>
        </tr></tfoot>
      </table>
      <div style="margin-top:12px">
        <table style="width:260px;margin-left:auto">
          <thead><tr><th>Category</th><th style="text-align:right">Sub-Total</th></tr></thead>
          <tbody>${catSummaryRows}</tbody>
        </table>
      </div>`
  }
</div>

<div class="section">
  <div class="section-title">Financial Settlement</div>
  <div class="settlement-box">
    <div class="settlement-row"><span>Agreed Freight</span><span style="font-weight:700">₹${(trip.agreedFreight || 0).toLocaleString('en-IN')}</span></div>
    <div class="settlement-row"><span>Total Expenses</span><span style="font-weight:700;color:#dc2626">− ₹${totalExpenses.toLocaleString('en-IN')}</span></div>
    <div class="settlement-row"><span>Driver Payment</span><span style="font-weight:700;color:#dc2626">− ₹${(trip.driverPayment || 0).toLocaleString('en-IN')}</span></div>
    <div class="settlement-total">
      <span>NET ${isProfitable ? 'PROFIT' : 'LOSS'}</span>
      <span class="${isProfitable ? 'profit' : 'loss'}">${isProfitable ? '+' : '−'} ₹${Math.abs(profitOrLoss).toLocaleString('en-IN')}</span>
    </div>
  </div>
</div>

${(trip.podSubmitted || trip.podPhotoUri || trip.podSignature || trip.podNotes) ? `
<div class="section">
  <div class="section-title">Proof of Delivery</div>
  <div class="pod-section">
    <div class="info-grid">
      <div class="info-item"><span class="info-label">POD Status</span><span class="info-value" style="color:#16a34a">✓ Uploaded</span></div>
      <div class="info-item"><span class="info-label">Delivery Date</span><span class="info-value">${trip.endDate || 'N/A'} ${trip.endTime || ''}</span></div>
      <div class="info-item"><span class="info-label">Notes</span><span class="info-value">${trip.podNotes || 'None'}</span></div>
      <div class="info-item"><span class="info-label">Signature</span><span class="info-value">${trip.podSignature ? 'Captured' : 'N/A'}</span></div>
    </div>
    ${trip.podPhotoUri ? `<div style="margin-top:12px;"><span class="info-label" style="font-weight:700;display:block;margin-bottom:4px;">Delivery Photo:</span><img src="${trip.podPhotoUri}" style="max-width:280px;max-height:180px;border-radius:6px;border:1px solid #cbd5e1;" /></div>` : ''}
    ${trip.podSignature && (trip.podSignature.startsWith('data:image/') || trip.podSignature.startsWith('http') || trip.podSignature.startsWith('blob:') || trip.podSignature.startsWith('/uploads/')) ? `<div style="margin-top:10px;"><span class="info-label" style="font-weight:700;display:block;margin-bottom:4px;">Receiver Signature:</span><img src="${trip.podSignature}" style="max-width:220px;max-height:80px;border-radius:4px;border:1px solid #cbd5e1;background:#fff;" /></div>` : ''}
  </div>
</div>` : ''}

<div class="footer">
  <span>New Balaji Transport — NBT-ARS System</span>
  <span>Trip ${trip.id} | Printed ${new Date().toLocaleDateString('en-IN')}</span>
</div>

</body></html>`;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 400);
        } else {
          await Print.printAsync({ html });
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
        }
      }
    } catch (error) {
      console.warn('PDF Error:', error);
      Alert.alert('Error', 'Could not generate PDF.');
    }
  };

  // Filtered trips — memoized to avoid recomputing on every unrelated render
  const filteredTrips = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return trips.filter(t => {
      const matchesSearch = !lowerSearch ||
        t.id.toLowerCase().includes(lowerSearch) ||
        t.driverName.toLowerCase().includes(lowerSearch) ||
        t.vehicleNumber.toLowerCase().includes(lowerSearch);

      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'STARTED' && ['STARTED', 'ON_THE_WAY'].includes(t.status)) ||
        (statusFilter === 'ASSIGNED' && ['ASSIGNED', 'NOT STARTED'].includes(t.status)) ||
        t.status === statusFilter;

      return matchesSearch && matchesStatus;
    }).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [trips, search, statusFilter]);

  const catBadgeColor = (cat: string) => {
    const map: Record<string, string> = {
      FUEL: '#fef3c7', TOLL: '#dbeafe', RTO: '#ede9fe',
      POLICE: '#fee2e2', LORRY: '#d1fae5', OTHER: '#f1f5f9',
    };
    return map[cat] ?? '#f1f5f9';
  };

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

  // Expanded expense IDs
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
  const toggleExpense = (id: string) =>
    setExpandedExpenses(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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

  // Delete confirm modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    setDeletingTripId(tripId);
    setDeleteModalVisible(true);
  };

  const confirmDeleteTrip = async () => {
    if (!deletingTripId) return;
    setIsDeleting(true);
    try {
      await db.deleteTrip(deletingTripId);
      if (selectedTrip?.id === deletingTripId) {
        handleCloseDetails();
      }
      await fetchTrips(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to delete trip.');
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
      setDeletingTripId(null);
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.replace('_', ' ')}</Text>
              </View>
              {(item.podSubmitted || item.podPhotoUri || item.podSignature || item.podNotes) ? (
                <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#86efac' }}>
                  <Text style={{ fontSize: 10, color: '#15803d', fontWeight: 'bold' }}>📸 POD</Text>
                </View>
              ) : null}
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
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
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
          {isDocViewerVisible ? (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e293b' }}>Trip Documents</Text>
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selectedTrip?.id} • {selectedTrip?.vehicleNumber}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsDocViewerVisible(false)} style={{ padding: 8 }}>
                  <MaterialIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Filters */}
              {/* Filters */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', gap: 8 }}>
                {(['ALL', 'ODOMETER', 'POD', 'EXPENSE'] as const).map(filter => (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => setDocFilter(filter)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: docFilter === filter ? '#0f172a' : '#f1f5f9',
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: docFilter === filter ? '#fff' : '#64748b'
                    }}>
                      {filter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
                {/* Document List Pane */}
                <View style={{ 
                  width: isDesktop ? 320 : '100%', 
                  height: isDesktop ? '100%' : 220, 
                  backgroundColor: '#f8fafc', 
                  borderRightWidth: isDesktop ? 1 : 0, 
                  borderBottomWidth: isDesktop ? 0 : 1, 
                  borderRightColor: '#e2e8f0',
                  borderBottomColor: '#e2e8f0'
                }}>
                  <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
                    {filteredDocs.length === 0 ? (
                      <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 20 }}>No documents found.</Text>
                    ) : (
                      filteredDocs.map(doc => {
                        const isSelected = selectedDoc?.id === doc.id;
                        return (
                          <TouchableOpacity
                            key={doc.id}
                            onPress={() => setSelectedDoc(doc)}
                            style={{
                              backgroundColor: '#fff',
                              borderRadius: 8,
                              padding: 12,
                              borderWidth: 1,
                              borderColor: isSelected ? '#3b82f6' : '#e2e8f0',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 12,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.05,
                              shadowRadius: 2,
                              elevation: 1,
                            }}
                          >
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                              <MaterialIcons 
                                name={doc.type === 'ODOMETER' ? 'speed' : doc.type === 'POD' ? 'local-shipping' : 'receipt'} 
                                size={18} 
                                color="#3b82f6" 
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1e293b' }}>{doc.title}</Text>
                              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{doc.subtitle}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>

                {/* Document Viewer Pane */}
                <View style={{ flex: 1, backgroundColor: '#fff', padding: isDesktop ? 24 : 16 }}>
                  {selectedDoc ? (
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e293b' }}>{selectedDoc.title}</Text>
                      <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 24 }}>{selectedDoc.subtitle}</Text>
                      
                      <View style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                        <Image 
                          source={{ uri: normalizeImageUrl(selectedDoc.uri) || selectedDoc.uri }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="contain"
                        />
                      </View>

                      <TouchableOpacity
                        onPress={() => Linking.openURL(selectedDoc.uri)}
                        style={{
                          marginTop: 24,
                          alignSelf: 'center',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          paddingVertical: 12,
                          paddingHorizontal: 24,
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          borderRadius: 6,
                        }}
                      >
                        <MaterialIcons name="open-in-new" size={18} color="#334155" />
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#334155' }}>OPEN FULL RESOLUTION</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="image-search" size={64} color="#e2e8f0" />
                      <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 16 }}>Select a document to view</Text>
                    </View>
                  )}
                </View>
              </View>
            </SafeAreaView>
          ) : (
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

            <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant }}>
               <TouchableOpacity 
                  style={{ backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                  onPress={() => {
                     const docs = getTripDocuments();
                     if (docs.length > 0) setSelectedDoc(docs[0]);
                     setIsDocViewerVisible(true);
                  }}
               >
                 <MaterialIcons name="collections" size={20} color="#fff" />
                 <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>VIEW ALL UPLOADED DOCUMENTS</Text>
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
                  {editingOdometer === 'start' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TextInput
                        style={[styles.paymentInput, { width: 100 }]}
                        keyboardType="numeric"
                        value={odometerInput}
                        onChangeText={setOdometerInput}
                        autoFocus
                      />
                      <Text style={{ fontSize: 12, color: COLORS.textMuted }}>km</Text>
                      <TouchableOpacity onPress={handleSaveOdometer} disabled={savingOdometer} style={[styles.savePaymentBtn, { paddingHorizontal: 10 }]}>
                        {savingOdometer ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.savePaymentText}>SAVE</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingOdometer(null)}>
                        <MaterialIcons name="close" size={18} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.detailValue}>{selectedTrip.odometerStart ? `${selectedTrip.odometerStart} km` : 'Pending start'}</Text>
                      <TouchableOpacity onPress={() => { setEditingOdometer('start'); setOdometerInput(selectedTrip.odometerStart?.toString() ?? ''); }}>
                        <MaterialIcons name="edit" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                {selectedTrip.odometerStartPhotoUri ? (
                  <View style={{ marginTop: 8, marginBottom: 12, backgroundColor: '#f0f4f8', padding: 10, borderRadius: 8 }}>
                    <Text style={[styles.detailLabel, { fontWeight: 'bold', marginBottom: 6 }]}>📸 Initial Odometer Photo (Driver Upload):</Text>
                    <Image
                      source={{ uri: selectedTrip.odometerStartPhotoUri }}
                      style={{ width: '100%', maxWidth: 350, height: 200, borderRadius: 8, borderWidth: 1, borderColor: COLORS.outlineVariant, backgroundColor: '#e2e8f0' }}
                      resizeMode="contain"
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
                  {editingOdometer === 'end' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TextInput
                        style={[styles.paymentInput, { width: 100 }]}
                        keyboardType="numeric"
                        value={odometerInput}
                        onChangeText={setOdometerInput}
                        autoFocus
                      />
                      <Text style={{ fontSize: 12, color: COLORS.textMuted }}>km</Text>
                      <TouchableOpacity onPress={handleSaveOdometer} disabled={savingOdometer} style={[styles.savePaymentBtn, { paddingHorizontal: 10 }]}>
                        {savingOdometer ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.savePaymentText}>SAVE</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingOdometer(null)}>
                        <MaterialIcons name="close" size={18} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.detailValue}>{selectedTrip.odometerEnd ? `${selectedTrip.odometerEnd} km` : 'Trip active'}</Text>
                      <TouchableOpacity onPress={() => { setEditingOdometer('end'); setOdometerInput(selectedTrip.odometerEnd?.toString() ?? ''); }}>
                        <MaterialIcons name="edit" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                {selectedTrip.odometerEndPhotoUri ? (
                  <View style={{ marginTop: 8, marginBottom: 12, backgroundColor: '#f0f4f8', padding: 10, borderRadius: 8 }}>
                    <Text style={[styles.detailLabel, { fontWeight: 'bold', marginBottom: 6 }]}>📸 End Odometer Photo:</Text>
                    <Image
                      source={{ uri: selectedTrip.odometerEndPhotoUri }}
                      style={{ width: '100%', maxWidth: 350, height: 200, borderRadius: 8, borderWidth: 1, borderColor: COLORS.outlineVariant, backgroundColor: '#e2e8f0' }}
                      resizeMode="contain"
                    />
                    <TouchableOpacity
                      style={{ marginTop: 6, alignSelf: 'flex-start' }}
                      onPress={() => Linking.openURL(selectedTrip.odometerEndPhotoUri!)}
                    >
                      <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 12 }}>Open Full Image ↗</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
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
                  <Text style={[styles.detailValue, { fontWeight: 'bold', color: (selectedTrip.podSubmitted || selectedTrip.podPhotoUri || selectedTrip.podSignature || selectedTrip.podNotes) ? COLORS.success : COLORS.secondary }]}>
                    {(selectedTrip.podSubmitted || selectedTrip.podPhotoUri || selectedTrip.podSignature || selectedTrip.podNotes) ? 'POD UPLOADED ✓' : 'POD PENDING'}
                  </Text>
                </View>
                {(selectedTrip.podSubmitted || selectedTrip.podPhotoUri || selectedTrip.podSignature || selectedTrip.podNotes) ? (
                  <View style={styles.podDetailBlock}>
                    {/* POD Photo — displayed directly in Admin */}
                    {selectedTrip.podPhotoUri ? (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={[styles.podInfoText, { fontWeight: 'bold', marginBottom: 6 }]}>📸 Delivery Photo / Invoice:</Text>
                        <Image
                          source={{ uri: selectedTrip.podPhotoUri }}
                          style={styles.podPhotoImage}
                          resizeMode="contain"
                        />
                        <TouchableOpacity
                          style={{ marginTop: 6, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              window.open(selectedTrip.podPhotoUri, '_blank');
                            } else {
                              Linking.openURL(selectedTrip.podPhotoUri!).catch(() => {});
                            }
                          }}
                        >
                          <MaterialIcons name="open-in-new" size={14} color={COLORS.primary} />
                          <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 12 }}>Open Full Image ↗</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={[styles.podInfoText, { color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 8 }]}>No delivery photo uploaded.</Text>
                    )}

                    {/* Signature Rendering (Image vs Text) */}
                    {selectedTrip.podSignature ? (
                      (selectedTrip.podSignature.startsWith('data:image/') ||
                       selectedTrip.podSignature.startsWith('http://') ||
                       selectedTrip.podSignature.startsWith('https://') ||
                       selectedTrip.podSignature.startsWith('blob:') ||
                       selectedTrip.podSignature.startsWith('file://') ||
                       selectedTrip.podSignature.startsWith('/uploads/')) ? (
                        <View style={{ marginTop: 6, marginBottom: 10 }}>
                          <Text style={[styles.podInfoText, { fontWeight: 'bold', marginBottom: 6 }]}>✍️ Driver / Receiver Signature:</Text>
                          <Image
                            source={{ uri: normalizeImageUrl(selectedTrip.podSignature) || selectedTrip.podSignature }}
                            style={styles.podSignatureImage}
                            resizeMode="contain"
                          />
                        </View>
                      ) : (
                        <Text style={styles.podInfoText}>
                          <Text style={{ fontWeight: 'bold' }}>Signature:</Text> {selectedTrip.podSignature}
                        </Text>
                      )
                    ) : (
                      <Text style={styles.podInfoText}><Text style={{ fontWeight: 'bold' }}>Signature:</Text> N/A</Text>
                    )}

                    <Text style={styles.podInfoText}><Text style={{ fontWeight: 'bold' }}>Notes:</Text> {selectedTrip.podNotes || 'No notes added'}</Text>
                    <Text style={styles.podInfoText}><Text style={{ fontWeight: 'bold' }}>Delivery Date/Time:</Text> {selectedTrip.endDate || selectedTrip.lastUpdatedDate || 'N/A'} {selectedTrip.endTime || selectedTrip.lastUpdatedTime || ''}</Text>
                  </View>
                ) : (
                  <Text style={[styles.podInfoText, { color: COLORS.textMuted, fontStyle: 'italic', marginTop: 6 }]}>
                    Awaiting proof of delivery upload from driver app.
                  </Text>
                )}
              </View>

              {/* Individual Expense entries list */}
              <View style={styles.detailsCard}>
                <Text style={styles.cardSectionTitle}>Individual Expense Log</Text>
                {(!selectedTrip.expenses || selectedTrip.expenses.length === 0) ? (
                  <Text style={styles.emptyExpensesText}>No expenses logged yet.</Text>
                ) : (
                  selectedTrip.expenses.map((exp, index) => {
                    const isExpanded = expandedExpenses.has(exp.id);
                    return (
                      <View key={exp.id} style={styles.individualExpenseCard}>
                        {/* Tappable header row */}
                        <TouchableOpacity
                          onPress={() => toggleExpense(exp.id)}
                          activeOpacity={0.7}
                          style={styles.indExpHeaderRow}
                        >
                          <View style={styles.indExpHeaderLeft}>
                            <View style={[styles.indExpCatBadge, { backgroundColor: catBadgeColor(exp.category) }]}>
                              <Text style={styles.indExpCatText}>{exp.category}</Text>
                            </View>
                            {exp.reason ? (
                              <Text style={styles.indExpReasonInline} numberOfLines={1}>{exp.reason}</Text>
                            ) : exp.liters ? (
                              <Text style={styles.indExpReasonInline} numberOfLines={1}>{exp.liters} L</Text>
                            ) : null}
                          </View>
                          <View style={styles.indExpHeaderRight}>
                            <Text style={styles.indExpAmt}>₹{Number(exp.amount).toLocaleString('en-IN')}</Text>
                            <MaterialIcons
                              name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                              size={18}
                              color={COLORS.textMuted}
                            />
                          </View>
                        </TouchableOpacity>

                        {/* Expanded detail body */}
                        {isExpanded && (
                          <View style={styles.indExpBody}>
                            <View style={styles.indExpDetailGrid}>
                              <View style={styles.indExpDetailItem}>
                                <Text style={styles.indExpDetailLabel}>AMOUNT</Text>
                                <Text style={[styles.indExpDetailValue, { color: '#b91c1c', fontWeight: '900' }]}>₹{Number(exp.amount).toLocaleString('en-IN')}</Text>
                              </View>
                              <View style={styles.indExpDetailItem}>
                                <Text style={styles.indExpDetailLabel}>CATEGORY</Text>
                                <Text style={styles.indExpDetailValue}>{exp.category}</Text>
                              </View>
                              {exp.reason ? (
                                <View style={styles.indExpDetailItem}>
                                  <Text style={styles.indExpDetailLabel}>REASON</Text>
                                  <Text style={styles.indExpDetailValue}>{exp.reason}</Text>
                                </View>
                              ) : null}
                              {exp.liters ? (
                                <View style={styles.indExpDetailItem}>
                                  <Text style={styles.indExpDetailLabel}>FUEL LITERS</Text>
                                  <Text style={styles.indExpDetailValue}>{exp.liters} L</Text>
                                </View>
                              ) : null}
                              <View style={styles.indExpDetailItem}>
                                <Text style={styles.indExpDetailLabel}>TIME</Text>
                                <Text style={styles.indExpDetailValue}>{exp.timestamp || '—'}</Text>
                              </View>
                              {exp.location ? (
                                <View style={[styles.indExpDetailItem, { flex: 2 }]}>
                                  <Text style={styles.indExpDetailLabel}>LOCATION</Text>
                                  <Text style={styles.indExpDetailValue}>
                                    {exp.location.city}{' '}({exp.location.latitude.toFixed(4)}, {exp.location.longitude.toFixed(4)})
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {exp.receiptUri ? (
                              <View style={styles.receiptContainer}>
                                <Text style={styles.receiptLabel}>📄 Receipt Photo</Text>
                                <Image
                                  source={{ uri: exp.receiptUri }}
                                  style={styles.receiptImage}
                                  resizeMode="contain"
                                />
                                <TouchableOpacity
                                  style={styles.viewReceiptBtn}
                                  onPress={() => Linking.openURL(exp.receiptUri!)}
                                >
                                  <MaterialIcons name="open-in-new" size={14} color={COLORS.primary} />
                                  <Text style={styles.viewReceiptText}>View Full Size</Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 8, fontStyle: 'italic' }}>No receipt photo attached.</Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
          )}
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        visible={deleteModalVisible}
        title="Delete Trip"
        message="Are you sure you want to permanently delete this trip? This action cannot be undone."
        itemLabel={deletingTripId ? `Trip ID: ${deletingTripId}` : undefined}
        isDeleting={isDeleting}
        onConfirm={confirmDeleteTrip}
        onCancel={() => { setDeleteModalVisible(false); setDeletingTripId(null); }}
      />
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
    maxWidth: 350,
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: '#e2e8f0',
  },
  podSignatureImage: {
    maxWidth: 240,
    width: '100%',
    height: 100,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: '#ffffff',
    marginTop: 4,
    marginBottom: 4,
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
    maxWidth: 350,
    height: 150,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: '#e2e8f0',
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: 8,
    overflow: 'hidden',
  },
  indExpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  indExpHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  indExpHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indExpCatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  indExpCatText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#374151',
  },
  indExpReasonInline: {
    fontSize: 11,
    color: COLORS.textMuted,
    flex: 1,
  },
  indExpAmt: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#b91c1c',
  },
  indExpBody: {
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  indExpDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  indExpDetailItem: {
    flex: 1,
    minWidth: 100,
  },
  indExpDetailLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  indExpDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
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
