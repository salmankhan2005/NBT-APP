import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Modal,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db } from '../db/database';

const FileSystemCompat = FileSystem as unknown as {
  documentDirectory?: string;
  cacheDirectory?: string;
  writeAsStringAsync: (uri: string, contents: string, options?: any) => Promise<void>;
  EncodingType: { UTF8: string };
};

interface SettingsScreenProps {
  onLogout: () => void;
}

export default function SettingsScreen({ onLogout }: SettingsScreenProps) {
  const [resetting, setResetting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Extract Data states
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const warningShakeAnim = useRef(new Animated.Value(0)).current;

  // Extract all database data
  const handleExtractData = async () => {
    setExtracting(true);
    try {
      const dump = await db.extractAllDatabaseData();
      setExtractedData(dump);
      setShowExtractModal(true);
    } catch (err: any) {
      Alert.alert('Extraction Failed', err?.message || 'Unable to extract database contents.');
    } finally {
      setExtracting(false);
    }
  };

  // Export as formatted JSON
  const handleExportJson = async () => {
    if (!extractedData) return;
    setExporting(true);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `NBT_DATABASE_DUMP_${dateStr}.json`;
    const jsonStr = JSON.stringify(extractedData, null, 2);

    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const baseDir = FileSystemCompat.documentDirectory || FileSystemCompat.cacheDirectory || '';
        const fileUri = `${baseDir}${filename}`;
        await FileSystemCompat.writeAsStringAsync(fileUri, jsonStr, {
          encoding: FileSystemCompat.EncodingType?.UTF8 || 'utf8',
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Download NBT Database Backup',
            UTI: 'public.json',
          });
        } else {
          Alert.alert('Saved', `Backup file saved to: ${fileUri}`);
        }
      }
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Failed to export JSON backup.');
    } finally {
      setExporting(false);
    }
  };

  // Export Full Database as Professional CSV Audit Report
  const handleExportCsv = async () => {
    if (!extractedData?.data) return;
    setExporting(true);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `NBT_ENTERPRISE_AUDIT_REPORT_${dateStr}.csv`;

    try {
      const esc = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val)
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/"/g, '""')
          .replace(/\r?\n|\r/g, ' ')
          .trim();
        return `"${str}"`;
      };

      const fmtCurr = (num: any) => {
        const val = Number(num) || 0;
        return `"${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`;
      };

      const lines: string[] = [];

      // ── COMPANY & REPORT HEADER ──
      lines.push('"=========================================================================================================================================================="');
      lines.push('"NEW BALAJI TRANSPORTS (NBT) - CENTRAL LOGISTICS MANAGEMENT SYSTEM"');
      lines.push('"3/131, V.K.V. Complex, 1st Floor, Bangalore Bye Pass Road, Kandampatty (Po.), Salem - 636 005. (TN)"');
      lines.push('"Contact: +91 94433 51789, +91 93622 51789 | Office: 0427-2225575, 2225576 | GSTIN: 33AMTPR8487P2ZM"');
      lines.push('"=========================================================================================================================================================="');
      lines.push('"ENTERPRISE DATABASE MASTER AUDIT & DATA EXPORT REPORT"');
      lines.push('"=========================================================================================================================================================="');
      lines.push(`"Report Generated On:",${esc(new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium' }))}`);
      lines.push(`"Export Generated By:","Super Administrator (Full System Privilege)"`);
      lines.push(`"System Build Version:","NBT Console v2.4.1 (Enterprise Production)"`);
      lines.push(`"Database Architecture:","PostgreSQL Cloud Cluster (Neon Restful API TLS 1.3)"`);
      lines.push(`"Total Database Records:",${extractedData?.stats?.totalRecords || 0}`);
      lines.push('');

      // ── EXECUTIVE FINANCIAL & OPERATIONAL KPI SUMMARY ──
      const trips = extractedData?.data?.trips || [];
      const totalAgreed = trips.reduce((s: number, t: any) => s + Number(t.agreedFreight || 0), 0);
      const totalExp = trips.reduce((s: number, t: any) => s + (t.expenses || []).reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0), 0);
      const totalDriverPay = trips.reduce((s: number, t: any) => s + Number(t.driverPayment || 0), 0);
      const totalNet = totalAgreed - totalExp - totalDriverPay;

      lines.push('"=========================================================================================================================================================="');
      lines.push('"EXECUTIVE FINANCIAL & OPERATIONAL KPI SUMMARY"');
      lines.push('"=========================================================================================================================================================="');
      lines.push('"Metric Description","Value / Count","Currency / Unit","Status / Remark"');
      lines.push(`"Total Trips & Consignments",${trips.length},"Trips","Active & Completed"`);
      lines.push(`"Gross Agreed Freight Turnover",${fmtCurr(totalAgreed)},"INR (₹)","Total Billable Volume"`);
      lines.push(`"Total Logged Operating Expenses",${fmtCurr(totalExp)},"INR (₹)","Fuel, Toll, Food, Loading & Others"`);
      lines.push(`"Total Driver Payments Disbursed",${fmtCurr(totalDriverPay)},"INR (₹)","Driver Advances & Settlements"`);
      lines.push(`"Net Operating Profit / Balance",${fmtCurr(totalNet)},"INR (₹)",${totalNet >= 0 ? '"Net Positive Yield"' : '"Loss / Over-budget"'}`);
      lines.push(`"Total Managed Fleet Vehicles",${extractedData?.stats?.vehiclesCount || 0},"Vehicles","Registered Fleet Assets"`);
      lines.push(`"Vehicle Compliance Documents",${extractedData?.stats?.vehicleDocumentsCount || 0},"Documents","FC, RC, Insurance & Permits"`);
      lines.push(`"Registered Driver Workforce",${extractedData?.stats?.driversCount || 0},"Drivers","Active & Verified Personnel"`);
      lines.push(`"GC Consignment Notes Issued",${extractedData?.stats?.gcNotesCount || 0},"Notes","Official Goods Consignments"`);
      lines.push(`"Lorry Memos Issued",${extractedData?.stats?.memoDocumentsCount || 0},"Memos","Signed Transport Memos"`);
      lines.push(`"Activity & Telemetry Audit Events",${extractedData?.stats?.activityLogsCount || 0},"Events","Full System Audit Trail"`);
      lines.push(`"Lorry Load Bookings",${extractedData?.stats?.lorryBookingsCount || 0},"Bookings","Brokerage & Direct Loads"`);
      lines.push('');

      // ── SECTION 1: TRIPS & SHIPMENT REGISTRY ──
      lines.push('"=========================================================================================================================================================="');
      lines.push('"SECTION 1: DISPATCH & TRIP SHIPMENT REGISTRY"');
      lines.push('"=========================================================================================================================================================="');
      if (trips.length === 0) {
        lines.push('"Notice: No trip records currently registered in the database."');
      } else {
        lines.push('"S.No.","Trip ID","Status","Vehicle Registration","Driver Name","Driver Contact","Starting Point","Destination","Distance (KM)","Agreed Freight (INR)","Total Expenses (INR)","Driver Payment (INR)","Net Profit / Loss (INR)","Start Date","Start Time","End Date","End Time","POD Verified","Last Known Location"');
        trips.forEach((t: any, idx: number) => {
          const expSum = (t.expenses || []).reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);
          const netVal = Number(t.agreedFreight || 0) - expSum - Number(t.driverPayment || 0);
          lines.push([
            idx + 1,
            esc(t.id),
            esc(t.status),
            esc(t.vehicleNumber),
            esc(t.driverName),
            esc(t.driverPhone || t.loaderPhone),
            esc(t.startingPoint),
            esc(t.destination),
            t.distanceKm || 0,
            fmtCurr(t.agreedFreight),
            fmtCurr(expSum),
            fmtCurr(t.driverPayment),
            fmtCurr(netVal),
            esc(t.startDate),
            esc(t.startTime),
            esc(t.endDate),
            esc(t.endTime),
            t.podSubmitted || t.podPhotoUri ? '"VERIFIED"' : '"PENDING"',
            esc(t.lastKnownLocation || t.currentGPS?.city)
          ].join(','));
        });
      }
      lines.push('');

      // ── SECTION 2: ITEMISED TRIP EXPENSES & RECEIPTS ──
      lines.push('"=========================================================================================================================================================="');
      lines.push('"SECTION 2: ITEMISED TRIP EXPENSES & RECEIPTS BREAKDOWN"');
      lines.push('"=========================================================================================================================================================="');
      const allExpenses: any[] = [];
      trips.forEach((t: any) => {
        (t.expenses || []).forEach((e: any) => {
          allExpenses.push({ tripId: t.id, vehicleNo: t.vehicleNumber, driver: t.driverName, ...e });
        });
      });
      if (allExpenses.length === 0) {
        lines.push('"Notice: No trip expenses logged across trips."');
      } else {
        lines.push('"S.No.","Trip Reference ID","Expense ID","Vehicle Number","Driver Name","Expense Category","Amount (INR)","Recorded Date/Time","Expense Description","Receipt Document Attached"');
        allExpenses.forEach((e: any, idx: number) => {
          lines.push([
            idx + 1,
            esc(e.tripId),
            esc(e.id),
            esc(e.vehicleNo),
            esc(e.driver),
            esc(e.category),
            fmtCurr(e.amount),
            esc(e.spentAt || e.createdAt),
            esc(e.description || e.notes),
            e.receiptUri ? '"ATTACHED (PHOTO)"' : '"NO RECEIPT"'
          ].join(','));
        });
      }
      lines.push('');

      // ── SECTION 3: MANAGED FLEET VEHICLE ASSETS ──
      lines.push('"=========================================================================================================================================================="');
      lines.push('"SECTION 3: MANAGED FLEET VEHICLE ASSETS & COMPLIANCE"');
      lines.push('"=========================================================================================================================================================="');
      const vehicles = extractedData?.data?.managedVehicles || [];
      if (vehicles.length === 0) {
        lines.push('"Notice: No managed vehicles registered."');
      } else {
        lines.push('"S.No.","Vehicle ID","Registration No.","Vehicle Type","Wheel Configuration","Manufacturer","Model","Owner / Transporter Name","Owner Contact","RC Book No.","Engine Number","Chassis Number","Current Status","FC Expiry Date","Insurance Expiry Date","Pollution Expiry Date","Permit Expiry Date"');
        vehicles.forEach((v: any, idx: number) => {
          lines.push([
            idx + 1,
            esc(v.vehicle_id),
            esc(v.vehicleNumber),
            esc(v.vehicleType),
            esc(v.wheelType),
            esc(v.vehicleMake),
            esc(v.vehicleModel),
            esc(v.ownerName),
            esc(v.ownerPhone),
            esc(v.rcNumber),
            esc(v.engineNumber),
            esc(v.chassisNumber),
            esc(v.status),
            esc(v.fcExpiryDate),
            esc(v.insuranceExpiryDate),
            esc(v.pollutionExpiryDate),
            esc(v.permitExpiryDate)
          ].join(','));
        });
      }
      lines.push('');

      // ── SECTION 4: VEHICLE COMPLIANCE & LEGAL DOCUMENTS ──
      lines.push('"=========================================================================================================================================================="');
      lines.push('"SECTION 4: VEHICLE COMPLIANCE & STATUTORY CERTIFICATES"');
      lines.push('"=========================================================================================================================================================="');
      const docs = extractedData?.data?.vehicleDocuments || [];
      if (docs.length === 0) {
        lines.push('"Notice: No vehicle compliance documents uploaded."');
      } else {
        lines.push('"S.No.","Document ID","Vehicle ID","Document Type","Document Label","Policy / Certificate No.","Issue Date","Expiry Date","Compliance Status","Days Remaining","File Attachment Name","Storage Location / URI"');
        docs.forEach((d: any, idx: number) => {
          lines.push([
            idx + 1,
            esc(d.doc_id),
            esc(d.vehicle_id),
            esc(d.docType),
            esc(d.docLabel),
            esc(d.docNumber),
            esc(d.issueDate),
            esc(d.expiryDate),
            esc(d.status),
            d.daysLeft !== undefined && d.daysLeft !== null ? d.daysLeft : '',
            esc(d.fileName),
            esc(d.fileUri)
          ].join(','));
        });
      }
      lines.push('');

      // ── SECTION 5: DRIVER WORKFORCE ROSTER ──
      lines.push('"=========================================================================================================================================================="');
      lines.push('"SECTION 5: DRIVER WORKFORCE ROSTER & CREDENTIALS"');
      lines.push('"=========================================================================================================================================================="');
      const drivers = extractedData?.data?.drivers || [];
      if (drivers.length === 0) {
        lines.push('"Notice: No drivers registered in workforce roster."');
      } else {
        lines.push('"S.No.","Driver ID","Full Name","Primary Contact Phone","Driving License No.","Assigned Vehicle No.","Workforce Active Status"');
        drivers.forEach((d: any, idx: number) => {
          lines.push([
            idx + 1,
            esc(d.id),
            esc(d.name),
            esc(d.phone),
            esc(d.license),
            esc(d.vehicleNumber || 'Unassigned'),
            d.active ? '"ACTIVE / ON DUTY"' : '"INACTIVE"'
          ].join(','));
        });
      }
      lines.push('');

      // ── SECTION 6: GC (GOODS CONSIGNMENT) CONSIGNMENT NOTES ──
      lines.push('"=========================================================================================================================================================="');
      lines.push('"SECTION 6: GOODS CONSIGNMENT (GC) INVOICES & NOTES"');
      lines.push('"=========================================================================================================================================================="');
      const gcs = extractedData?.data?.gcNotes || [];
      if (gcs.length === 0) {
        lines.push('"Notice: No GC consignment notes recorded."');
      } else {
        lines.push('"S.No.","GC Note No.","Date","Origin (From)","Destination (To)","Truck No.","Consignor (Sender)","Consignor GSTIN","Consignee (Receiver)","Consignee GSTIN","Gross Freight (INR)","Advance Paid (INR)","Balance Due (INR)","Total Invoice (INR)","Payment Terms","GST Tax Structure"');
        gcs.forEach((g: any, idx: number) => {
          lines.push([
            idx + 1,
            esc(g.noteNumber || g.id),
            esc(g.date),
            esc(g.from),
            esc(g.to),
            esc(g.truckNumber),
            esc(g.consignor),
            esc(g.consignorGst),
            esc(g.consignee),
            esc(g.consigneeGst),
            fmtCurr(g.freight),
            fmtCurr(g.lessAdvance),
            fmtCurr(g.balance),
            fmtCurr(g.total),
            esc(g.paymentType),
            esc(g.taxOption)
          ].join(','));
        });
      }
      lines.push('');

      // ── SECTION 7: OFFICIAL LORRY TRANSPORT MEMOS ──
      lines.push('"=========================================================================================================================================================="');
      lines.push('"SECTION 7: OFFICIAL LORRY TRANSPORT MEMOS"');
      lines.push('"=========================================================================================================================================================="');
      const memos = extractedData?.data?.memoDocuments || [];
      if (memos.length === 0) {
        lines.push('"Notice: No lorry memos recorded."');
      } else {
        lines.push('"S.No.","Memo ID","Memo Date","Issued By","Memo Status","Creation Timestamp","Content Summary"');
        memos.forEach((m: any, idx: number) => {
          lines.push([
            idx + 1,
            esc(m.memoId || m.id),
            esc(m.date),
            esc(m.createdBy || 'Authorized Signatory'),
            esc(m.status || 'ACTIVE'),
            esc(m.createdAt),
            esc(m.contentHtml ? m.contentHtml.replace(/<[^>]+>/g, ' ').substring(0, 150) : '')
          ].join(','));
        });
      }
      lines.push('');

      // ── SECTION 8: LORRY LOAD & FREIGHT BROKERAGE BOOKINGS ──
      lines.push('"=========================================================================================================================================================="');
      lines.push('"SECTION 8: LORRY FREIGHT & BROKERAGE BOOKINGS"');
      lines.push('"=========================================================================================================================================================="');
      const bookings = extractedData?.data?.lorryBookings || [];
      if (bookings.length === 0) {
        lines.push('"Notice: No lorry freight bookings recorded."');
      } else {
        lines.push('"S.No.","Booking Reference ID","Loading Station","Unloading Destination","Vehicle Registration","Owner / Transporter","Vehicle Type","Load Freight (INR)","Lorry Freight (INR)","Net Margin / Profit (INR)","Booking Execution Status"');
        bookings.forEach((b: any, idx: number) => {
          lines.push([
            idx + 1,
            esc(b.id),
            esc(b.from_point),
            esc(b.destination_point),
            esc(b.vehicle_number),
            esc(b.owner_name),
            esc(b.vehicle_type),
            fmtCurr(b.load_freight),
            fmtCurr(b.lorry_freight),
            fmtCurr(b.profit),
            esc(b.status || 'CONFIRMED')
          ].join(','));
        });
      }
      lines.push('');

      // ── SECTION 9: SYSTEM AUDIT TRAIL & TELEMETRY LOGS ──
      lines.push('"=========================================================================================================================================================="');
      lines.push('"SECTION 9: SYSTEM AUDIT TRAIL & TELEMETRY LOGS"');
      lines.push('"=========================================================================================================================================================="');
      const logs = extractedData?.data?.activityLogs || [];
      if (logs.length === 0) {
        lines.push('"Notice: No audit log events recorded."');
      } else {
        lines.push('"S.No.","Log ID","Timestamp","Action Event","Operator / Driver Name","Vehicle Registration","GPS Checkpoint","Origin - Destination","Audit Remarks / Details"');
        logs.forEach((l: any, idx: number) => {
          lines.push([
            idx + 1,
            esc(l.id),
            esc(l.timestamp),
            esc(l.action),
            esc(l.driverName),
            esc(l.vehicleNumber),
            esc(l.currentLocation),
            esc(`${l.startingPoint || ''} -> ${l.destination || ''}`),
            esc(l.details)
          ].join(','));
        });
      }
      lines.push('');

      // ── REPORT FOOTER ──
      lines.push('"=========================================================================================================================================================="');
      lines.push('"*** END OF OFFICIAL REPORT - CONFIDENTIAL & PROPRIETARY TO NEW BALAJI TRANSPORTS ***"');
      lines.push('"This document is generated directly from the live central logistics database for statutory, tax, and operational audit."');
      lines.push('"=========================================================================================================================================================="');

      // Add UTF-8 BOM so Excel opens without any encoding errors
      const fullCsvContent = '\uFEFF' + lines.join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([fullCsvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const baseDir = FileSystemCompat.documentDirectory || FileSystemCompat.cacheDirectory || '';
        const fileUri = `${baseDir}${filename}`;
        await FileSystemCompat.writeAsStringAsync(fileUri, fullCsvContent, {
          encoding: FileSystemCompat.EncodingType?.UTF8 || 'utf8',
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Download NBT Complete Database CSV Report',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('Saved', `CSV saved to: ${fileUri}`);
        }
      }
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Failed to export CSV report.');
    } finally {
      setExporting(false);
    }
  };

  // Open warning modal with shake animation
  const handleResetPress = () => {
    setShowWarning(true);
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(warningShakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(warningShakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(warningShakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(warningShakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(warningShakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }, 100);
  };

  // Run reset
  const handleConfirmReset = async () => {
    setShowWarning(false);
    setResetting(true);
    try {
      await db.resetData();
      setResetting(false);
      showSuccessModal();
    } catch (e: any) {
      setResetting(false);
      setErrorMsg(e?.message || 'Could not reset the shared database. Check your connection and try again.');
      setShowError(true);
    }
  };

  const showSuccessModal = () => {
    scaleAnim.setValue(0);
    checkAnim.setValue(0);
    pulseAnim.setValue(1);
    setShowSuccess(true);

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    });

    setTimeout(() => {
      setShowSuccess(false);
    }, 3500);
  };

  const handleLogoutPress = () => {
    setShowWarning(false);
    setTimeout(() => {
      setShowWarning(false);
    }, 50);
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'LOGOUT', style: 'destructive', onPress: onLogout },
    ]);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Settings & Diagnostics</Text>

        {/* Admin Profile */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={28} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.profileName}>New Balaji Transport Administrator</Text>
              <Text style={styles.profileRole}>Role: Super Admin (Read & Write)</Text>
            </View>
          </View>
        </View>

        {/* Data Extraction & Backup */}
        <View style={[styles.card, styles.backupCard]}>
          <View style={styles.backupHeaderRow}>
            <View style={styles.backupIconWrap}>
              <MaterialIcons name="cloud-download" size={24} color={COLORS.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.backupCardTitle}>DATA BACKUP & EXTRACTION</Text>
              <Text style={styles.backupCardDesc}>
                Extract the entire database data anytime into structured JSON or CSV format.
              </Text>
            </View>
          </View>

          <View style={styles.extractFeatureRow}>
            <View style={styles.extractFeatureItem}>
              <MaterialIcons name="check-circle" size={14} color="#16a34a" />
              <Text style={styles.extractFeatureText}>Trips & Expenses</Text>
            </View>
            <View style={styles.extractFeatureItem}>
              <MaterialIcons name="check-circle" size={14} color="#16a34a" />
              <Text style={styles.extractFeatureText}>Fleet & Documents</Text>
            </View>
            <View style={styles.extractFeatureItem}>
              <MaterialIcons name="check-circle" size={14} color="#16a34a" />
              <Text style={styles.extractFeatureText}>GC Notes & Memos</Text>
            </View>
            <View style={styles.extractFeatureItem}>
              <MaterialIcons name="check-circle" size={14} color="#16a34a" />
              <Text style={styles.extractFeatureText}>Activity Audit Logs</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.extractBtn, extracting && { opacity: 0.7 }]}
            onPress={handleExtractData}
            disabled={extracting}
          >
            {extracting ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.extractBtnText}>EXTRACTING ENTIRE DATABASE...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="file-download" size={20} color="#ffffff" />
                <Text style={styles.extractBtnText}>EXTRACT ALL DATABASE DATA</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* System Diagnostics */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>SYSTEM DIAGNOSTICS</Text>
          <View style={styles.settingsItem}>
            <MaterialIcons name="cloud-done" size={20} color={COLORS.success} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>Central Database Link</Text>
              <Text style={styles.itemDesc}>Connected to Neon Postgres via REST API</Text>
            </View>
            <Text style={styles.itemStatus}>ACTIVE</Text>
          </View>
          <View style={styles.settingsItem}>
            <MaterialIcons name="security" size={20} color={COLORS.secondary} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>Argon2id Authentication</Text>
              <Text style={styles.itemDesc}>Passwords and driver PINs hashed</Text>
            </View>
            <Text style={styles.itemStatus}>SECURED</Text>
          </View>
          <View style={styles.settingsItem}>
            <MaterialIcons name="info" size={20} color={COLORS.primary} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>Application Version</Text>
              <Text style={styles.itemDesc}>New Balaji Transport Admin Console</Text>
            </View>
            <Text style={styles.itemStatus}>V2.4.1</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={[styles.sectionTitle, { color: COLORS.error }]}>DANGER ZONE</Text>

          <TouchableOpacity
            style={[styles.actionRow, resetting && { opacity: 0.6 }]}
            onPress={handleResetPress}
            disabled={resetting}
          >
            <View style={styles.dangerActionLabel}>
              <MaterialIcons name="settings-backup-restore" size={20} color={COLORS.error} />
              <View>
                <Text style={styles.dangerTitle}>Reset Shared Database</Text>
                <Text style={styles.dangerDesc}>
                  Permanently delete all trips, vehicles, drivers, expenses, GC notes, memos & logs
                </Text>
              </View>
            </View>
            {resetting ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <MaterialIcons name="chevron-right" size={20} color={COLORS.error} />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutPress}>
            <MaterialIcons name="logout" size={20} color="#ffffff" />
            <Text style={styles.logoutBtnText}>LOGOUT SESSION</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── DATA EXTRACTION & DUMP MODAL ──────────────────────────────── */}
      <Modal visible={showExtractModal} transparent animationType="slide">
        <View style={styles.overlayCenter}>
          <View style={styles.extractModalBox}>
            {/* Header */}
            <View style={styles.extractModalHeader}>
              <View style={styles.extractModalHeaderLeft}>
                <View style={styles.extractModalIconBadge}>
                  <MaterialIcons name="storage" size={24} color={COLORS.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.extractModalTitle}>Database Extraction Complete</Text>
                  <Text style={styles.extractModalSubtitle} numberOfLines={1}>
                    {extractedData ? new Date(extractedData.extractedAt).toLocaleString() : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowExtractModal(false)}
                style={styles.extractModalCloseBtn}
              >
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Content stats */}
            <ScrollView style={styles.extractModalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.totalBadgeCard}>
                <Text style={styles.totalBadgeLabel}>TOTAL EXTRACTED RECORDS</Text>
                <Text style={styles.totalBadgeValue}>{extractedData?.stats?.totalRecords || 0}</Text>
                <Text style={styles.totalBadgeSub}>Complete live snapshot from database</Text>
              </View>

              <Text style={styles.extractSectionTitle}>DATASET BREAKDOWN</Text>
              <View style={styles.extractGrid}>
                <View style={styles.extractStatCard}>
                  <MaterialIcons name="local-shipping" size={20} color={COLORS.primary} />
                  <Text style={styles.extractStatVal}>{extractedData?.stats?.tripsCount || 0}</Text>
                  <Text style={styles.extractStatLabel}>Trips & Expenses</Text>
                </View>
                <View style={styles.extractStatCard}>
                  <MaterialIcons name="directions-car" size={20} color="#059669" />
                  <Text style={styles.extractStatVal}>{extractedData?.stats?.vehiclesCount || 0}</Text>
                  <Text style={styles.extractStatLabel}>Managed Vehicles</Text>
                </View>
                <View style={styles.extractStatCard}>
                  <MaterialIcons name="description" size={20} color="#7c3aed" />
                  <Text style={styles.extractStatVal}>{extractedData?.stats?.vehicleDocumentsCount || 0}</Text>
                  <Text style={styles.extractStatLabel}>Vehicle Documents</Text>
                </View>
                <View style={styles.extractStatCard}>
                  <MaterialIcons name="badge" size={20} color="#d97706" />
                  <Text style={styles.extractStatVal}>{extractedData?.stats?.driversCount || 0}</Text>
                  <Text style={styles.extractStatLabel}>Active Drivers</Text>
                </View>
                <View style={styles.extractStatCard}>
                  <MaterialIcons name="receipt-long" size={20} color="#dc2626" />
                  <Text style={styles.extractStatVal}>{extractedData?.stats?.gcNotesCount || 0}</Text>
                  <Text style={styles.extractStatLabel}>GC Notes</Text>
                </View>
                <View style={styles.extractStatCard}>
                  <MaterialIcons name="assignment" size={20} color="#0284c7" />
                  <Text style={styles.extractStatVal}>{extractedData?.stats?.memoDocumentsCount || 0}</Text>
                  <Text style={styles.extractStatLabel}>Lorry Memos</Text>
                </View>
                <View style={styles.extractStatCard}>
                  <MaterialIcons name="history" size={20} color="#475569" />
                  <Text style={styles.extractStatVal}>{extractedData?.stats?.activityLogsCount || 0}</Text>
                  <Text style={styles.extractStatLabel}>Audit Logs</Text>
                </View>
                <View style={styles.extractStatCard}>
                  <MaterialIcons name="book-online" size={20} color="#0d9488" />
                  <Text style={styles.extractStatVal}>{extractedData?.stats?.lorryBookingsCount || 0}</Text>
                  <Text style={styles.extractStatLabel}>Lorry Bookings</Text>
                </View>
              </View>
            </ScrollView>

            {/* Export Actions */}
            <View style={styles.extractModalActions}>
              <TouchableOpacity
                style={[styles.exportBtn, styles.exportJsonBtn]}
                onPress={handleExportJson}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="code" size={18} color="#ffffff" />
                    <Text style={styles.exportBtnText}>DOWNLOAD FULL JSON</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportBtn, styles.exportCsvBtn]}
                onPress={handleExportCsv}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="table-view" size={18} color="#ffffff" />
                    <Text style={styles.exportBtnText}>DOWNLOAD TRIPS CSV</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── RESETTING OVERLAY ─────────────────────────────────────────── */}
      <Modal visible={resetting} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={styles.progressBox}>
            <ActivityIndicator size="large" color={COLORS.error} />
            <Text style={styles.progressTitle}>Resetting Database...</Text>
            <Text style={styles.progressDesc}>Deleting all trips, vehicles, drivers & logs</Text>
          </View>
        </View>
      </Modal>

      {/* ── WARNING MODAL ─────────────────────────────────────────────── */}
      <Modal visible={showWarning} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <Animated.View style={[styles.warningBox, { transform: [{ translateX: warningShakeAnim }] }]}>
            {/* Icon */}
            <View style={styles.warningIconCircle}>
              <MaterialIcons name="warning" size={36} color="#dc2626" />
            </View>

            <Text style={styles.warningTitle}>⚠️ Confirm Full Reset</Text>
            <Text style={styles.warningBody}>
              This will <Text style={styles.warningBold}>permanently delete</Text> all data from the shared database:
            </Text>

            <View style={styles.warningList}>
              {['All Trips & GPS history', 'All Drivers & Vehicles', 'All Expenses & Receipts', 'GC Notes, Memos & Lorry Bookings', 'Activity Logs & Documents'].map((item) => (
                <View key={item} style={styles.warningListItem}>
                  <MaterialIcons name="remove-circle" size={14} color="#dc2626" />
                  <Text style={styles.warningListText}>{item}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.warningFootnote}>
              This affects both the Admin Console and the Driver App. This action cannot be undone.
            </Text>

            <View style={styles.warningBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowWarning(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmResetBtn} onPress={handleConfirmReset}>
                <MaterialIcons name="delete-forever" size={16} color="#ffffff" />
                <Text style={styles.confirmResetBtnText}>RESET ALL DATA</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ── SUCCESS MODAL ─────────────────────────────────────────────── */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <Animated.View style={[styles.successBox, { transform: [{ scale: scaleAnim }] }]}>
            <Animated.View style={[styles.successIconCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Animated.View style={{ opacity: checkAnim, transform: [{ scale: checkAnim }] }}>
                <MaterialIcons name="check-circle" size={64} color="#16a34a" />
              </Animated.View>
            </Animated.View>

            <Text style={styles.successTitle}>Database Reset!</Text>
            <Text style={styles.successSubtitle}>All data has been permanently deleted.</Text>

            <View style={styles.successTagRow}>
              {['Trips', 'Vehicles', 'Drivers', 'Expenses', 'Logs'].map((tag) => (
                <View key={tag} style={styles.successTag}>
                  <MaterialIcons name="check" size={12} color="#16a34a" />
                  <Text style={styles.successTagText}>{tag}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.successFootnote}>
              The central server database is now completely fresh.
            </Text>

            <TouchableOpacity style={styles.successDismissBtn} onPress={() => setShowSuccess(false)}>
              <Text style={styles.successDismissBtnText}>DONE</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ── ERROR MODAL ───────────────────────────────────────────────── */}
      <Modal visible={showError} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={48} color="#dc2626" />
            <Text style={styles.errorTitle}>Reset Failed</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <TouchableOpacity style={styles.errorDismissBtn} onPress={() => setShowError(false)}>
              <Text style={styles.errorDismissBtnText}>DISMISS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    padding: SPACING.gutter,
    paddingBottom: 64,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  screenTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginBottom: 16 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.outlineVariant,
    padding: 16, marginBottom: 16, ...SHADOWS.light,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  profileRole: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  sectionTitle: {
    fontSize: 10, fontWeight: 'bold', color: COLORS.textMuted,
    marginBottom: 12, letterSpacing: 0.5,
  },
  settingsItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.surfaceContainerLow, gap: 12,
  },
  itemTextContainer: { flex: 1 },
  itemTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textDark },
  itemDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  itemStatus: { fontSize: 11, fontWeight: 'bold', color: COLORS.textMuted },
  dangerCard: { borderColor: COLORS.error + '30' },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12,
  },
  dangerActionLabel: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dangerTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.error },
  dangerDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, paddingRight: 16 },
  logoutBtn: {
    flexDirection: 'row', backgroundColor: COLORS.primary, height: 48,
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20,
  },
  logoutBtnText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 },

  // Data Extraction Card
  backupCard: {
    borderColor: COLORS.secondary + '40',
    backgroundColor: '#ffffff',
  },
  backupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  backupIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.secondary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backupCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },
  backupCardDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  extractFeatureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainerLow,
  },
  extractFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  extractFeatureText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  extractBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    height: 48,
    borderRadius: 8,
    gap: 8,
    ...SHADOWS.light,
  },
  extractBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Extraction Modal
  extractModalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  extractModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  extractModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  extractModalIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extractModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  extractModalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  extractModalCloseBtn: {
    padding: 6,
  },
  extractModalScroll: {
    marginVertical: 14,
  },
  totalBadgeCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  totalBadgeLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  totalBadgeValue: {
    color: '#38bdf8',
    fontSize: 36,
    fontWeight: '900',
    marginVertical: 4,
  },
  totalBadgeSub: {
    color: '#cbd5e1',
    fontSize: 11,
  },
  extractSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  extractGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  extractStatCard: {
    flexGrow: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  extractStatVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  extractStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  extractModalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 10,
  },
  exportJsonBtn: {
    backgroundColor: COLORS.primary,
  },
  exportCsvBtn: {
    backgroundColor: COLORS.secondary,
  },
  exportBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Overlay
  overlayCenter: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },

  // Progress box
  progressBox: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 32,
    alignItems: 'center', gap: 12, width: '100%', maxWidth: 320,
  },
  progressTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  progressDesc: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },

  // Warning modal
  warningBox: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 380, alignItems: 'center',
    borderTopWidth: 4, borderTopColor: '#dc2626',
  },
  warningIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  warningTitle: { fontSize: 18, fontWeight: '900', color: '#dc2626', marginBottom: 8 },
  warningBody: { fontSize: 13, color: '#374151', textAlign: 'center', marginBottom: 12 },
  warningBold: { fontWeight: '900', color: '#dc2626' },
  warningList: { width: '100%', gap: 6, marginBottom: 14 },
  warningListItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningListText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  warningFootnote: {
    fontSize: 11, color: '#6b7280', textAlign: 'center',
    marginBottom: 20, fontStyle: 'italic',
  },
  warningBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 10, borderWidth: 1.5,
    borderColor: COLORS.outlineVariant, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  confirmResetBtn: {
    flex: 1, height: 46, borderRadius: 10, backgroundColor: '#dc2626',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  confirmResetBtnText: { fontSize: 12, fontWeight: '900', color: '#ffffff', letterSpacing: 0.5 },

  // Success modal
  successBox: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 28,
    width: '100%', maxWidth: 340, alignItems: 'center',
    borderTopWidth: 4, borderTopColor: '#16a34a',
  },
  successIconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  successTitle: { fontSize: 22, fontWeight: '900', color: '#15803d', marginBottom: 6 },
  successSubtitle: { fontSize: 13, color: '#374151', textAlign: 'center', marginBottom: 16 },
  successTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 },
  successTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  successTagText: { fontSize: 11, fontWeight: '700', color: '#15803d' },
  successFootnote: { fontSize: 11, color: '#6b7280', marginBottom: 20 },
  successDismissBtn: {
    width: '100%', height: 46, borderRadius: 10,
    backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center',
  },
  successDismissBtnText: { fontSize: 14, fontWeight: '900', color: '#ffffff', letterSpacing: 1 },

  // Error modal
  errorBox: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 28,
    width: '100%', maxWidth: 340, alignItems: 'center', gap: 10,
    borderTopWidth: 4, borderTopColor: '#dc2626',
  },
  errorTitle: { fontSize: 18, fontWeight: '900', color: '#dc2626' },
  errorMsg: { fontSize: 12, color: '#374151', textAlign: 'center' },
  errorDismissBtn: {
    marginTop: 8, width: '100%', height: 44, borderRadius: 10,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  errorDismissBtnText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
});
