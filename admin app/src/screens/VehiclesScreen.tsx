import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  Platform,
  Linking,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SPACING, SHADOWS } from '../theme';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import {
  db,
  ManagedVehicle,
  ManagedVehicleStatus,
  VehicleDocument,
  DocType,
  Trip,
  normalizeImageUrl,
} from '../db/database';

type VehicleFilter = 'ALL' | 'AVAILABLE' | 'ON TRIP' | 'UNDER MAINTENANCE' | 'INACTIVE';
type DocumentFilter = 'ALL' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING';
type VehicleWheelType = '6 Wheel' | '10 Wheel' | '12 Wheel' | '14 Wheel' | '16 Wheel';
type VehicleMake = 'Ashok Leyland' | 'Tata' | 'Eicher' | 'Bharat Benz' | 'Mahindra' | 'Other';

export interface ComplianceDocSpec {
  key: DocType;
  num: number;
  title: string;
  shortTitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  docNumberPlaceholder: string;
  issueField: keyof ManagedVehicle;
  expiryField: keyof ManagedVehicle;
  urlField: keyof ManagedVehicle;
}

export const COMPLIANCE_DOCS: ComplianceDocSpec[] = [
  {
    key: 'FC',
    num: 1,
    title: 'FC (Fitness Certificate)',
    shortTitle: 'FC',
    icon: 'build-circle',
    color: '#0284c7',
    docNumberPlaceholder: 'e.g. FC-TN38-2024-89',
    issueField: 'fcIssueDate',
    expiryField: 'fcExpiryDate',
    urlField: 'fcUrl',
  },
  {
    key: 'INSURANCE',
    num: 2,
    title: 'INSURANCE',
    shortTitle: 'INS',
    icon: 'verified-user',
    color: '#16a34a',
    docNumberPlaceholder: 'e.g. POL-9923841029',
    issueField: 'insuranceIssueDate',
    expiryField: 'insuranceExpiryDate',
    urlField: 'insuranceUrl',
  },
  {
    key: 'NATIONAL_PERMIT',
    num: 3,
    title: 'NATIONAL PERMIT',
    shortTitle: 'NAT PERMIT',
    icon: 'public',
    color: '#4f46e5',
    docNumberPlaceholder: 'e.g. NP-AUTH-2024-001',
    issueField: 'nationalPermitIssueDate',
    expiryField: 'nationalPermitExpiryDate',
    urlField: 'nationalPermitUrl',
  },
  {
    key: 'FIVE_YEAR_PERMIT',
    num: 4,
    title: '5 YEARS PERMIT',
    shortTitle: '5 YR PERMIT',
    icon: 'fact-check',
    color: '#7c3aed',
    docNumberPlaceholder: 'e.g. PERMIT-5YR-2024-55',
    issueField: 'fiveYearPermitIssueDate',
    expiryField: 'fiveYearPermitExpiryDate',
    urlField: 'fiveYearPermitUrl',
  },
  {
    key: 'QUARTER_TAX',
    num: 5,
    title: 'QUARTER TAX',
    shortTitle: 'QTR TAX',
    icon: 'receipt-long',
    color: '#d97706',
    docNumberPlaceholder: 'e.g. TAX-Q3-2024-77',
    issueField: 'quarterTaxIssueDate',
    expiryField: 'quarterTaxExpiryDate',
    urlField: 'quarterTaxUrl',
  },
  {
    key: 'POLLUTION',
    num: 6,
    title: 'POLLUTION (PUCC)',
    shortTitle: 'POLLUTION',
    icon: 'air',
    color: '#059669',
    docNumberPlaceholder: 'e.g. PUC-2024-9988',
    issueField: 'pollutionIssueDate',
    expiryField: 'pollutionExpiryDate',
    urlField: 'pollutionUrl',
  },
];

export const REGISTRATION_DOCS: Array<{ key: DocType; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { key: 'RC_FRONT', label: 'RC Book – Front Page', icon: 'credit-card' },
  { key: 'RC_BACK', label: 'RC Book – Back Page', icon: 'credit-card' },
];

interface DocFormEntry {
  docNumber: string;
  issueDate: string;
  expiryDate: string;
  fileUri?: string;
  fileName?: string;
  fileType?: string;
}

const createInitialDocEntries = (): Record<string, DocFormEntry> => ({
  FC: { docNumber: '', issueDate: '', expiryDate: '' },
  INSURANCE: { docNumber: '', issueDate: '', expiryDate: '' },
  NATIONAL_PERMIT: { docNumber: '', issueDate: '', expiryDate: '' },
  FIVE_YEAR_PERMIT: { docNumber: '', issueDate: '', expiryDate: '' },
  QUARTER_TAX: { docNumber: '', issueDate: '', expiryDate: '' },
  POLLUTION: { docNumber: '', issueDate: '', expiryDate: '' },
  RC_FRONT: { docNumber: '', issueDate: '', expiryDate: '' },
  RC_BACK: { docNumber: '', issueDate: '', expiryDate: '' },
});

export default function VehiclesScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const isDesktop = width >= 880;
  const numColumns = isDesktop ? 2 : 1;
  // Form columns: 2 on tablet/desktop for side-by-side inputs
  const formCols = isTablet ? 2 : 1;
  // Max width for modal content on wide screens
  const modalMaxWidth = Math.min(width, 720);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<ManagedVehicle[]>([]);
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>('ALL');
  const [documentFilter, setDocumentFilter] = useState<DocumentFilter>('ALL');

  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [docActionModalVisible, setDocActionModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<ManagedVehicle | null>(null);
  const [vehicleDocuments, setVehicleDocuments] = useState<VehicleDocument[]>([]);
  const [allVehicleDocuments, setAllVehicleDocuments] = useState<VehicleDocument[]>([]);

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'VEHICLE' | 'DOCUMENT'; id: string; label?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit / Update document metadata modal
  const [activeDocSpec, setActiveDocSpec] = useState<ComplianceDocSpec | null>(null);
  const [activeDocRecord, setActiveDocRecord] = useState<VehicleDocument | null>(null);
  const [docMetaNumber, setDocMetaNumber] = useState('');
  const [docMetaIssueDate, setDocMetaIssueDate] = useState('');
  const [docMetaExpiryDate, setDocMetaExpiryDate] = useState('');
  const [docMetaSaving, setDocMetaSaving] = useState(false);

  // Trip telemetry
  const [selectedVehicleTrip, setSelectedVehicleTrip] = useState<Trip | null>(null);
  const [selectedVehicleTripImageError, setSelectedVehicleTripImageError] = useState(false);
  const [documentImageErrors, setDocumentImageErrors] = useState<Record<string, boolean>>({});

  // Form State for Add Vehicle
  const [creating, setCreating] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [wheelType, setWheelType] = useState<VehicleWheelType>('12 Wheel');
  const [wheelTypeModalVisible, setWheelTypeModalVisible] = useState(false);
  const [vehicleMake, setVehicleMake] = useState<VehicleMake>('Tata');
  const [vehicleMakeModalVisible, setVehicleMakeModalVisible] = useState(false);
  const [vehicleModel, setVehicleModel] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [yearOfManufacture, setYearOfManufacture] = useState('');
  const [status, setStatus] = useState<ManagedVehicleStatus>('AVAILABLE');

  // Manual Document Entries State for Form
  const [docEntries, setDocEntries] = useState<Record<string, DocFormEntry>>(createInitialDocEntries());
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showFeedback = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setFeedbackMessage({ text, type });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setFeedbackMessage(null), 2400);
    }
  }, []);

  const fetchVehicles = useCallback(async (showIndicator = false) => {
    const cached = db.getCachedManagedVehicles();
    if (cached.length > 0) {
      setVehicles(cached);
      setLoading(false);
    } else if (showIndicator) {
      setLoading(true);
    }
    try {
      const [managedVehicles, documents] = await Promise.all([
        db.getManagedVehicles(),
        db.getAllVehicleDocuments(),
      ]);
      setVehicles(managedVehicles);
      setAllVehicleDocuments(documents);
    } catch (e) {
      console.error('Error fetching vehicles:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles(true);
    const unsubscribe = db.subscribe(() => fetchVehicles(false));
    return () => unsubscribe();
  }, [fetchVehicles]);

  const getExpiryBadgeInfo = (expiryDate?: string) => {
    if (!expiryDate || !expiryDate.trim()) {
      return { label: 'NOT SET', bg: '#f1f5f9', color: '#64748b', borderColor: '#cbd5e1', daysText: 'Date not entered' };
    }
    const status = db.getDocumentExpiryStatus(expiryDate);
    if (status.status === 'EXPIRED') {
      const daysAgo = Math.abs(status.daysLeft ?? 0);
      return {
        label: 'EXPIRED',
        bg: '#fef2f2',
        color: '#dc2626',
        borderColor: '#fca5a5',
        daysText: daysAgo === 0 ? 'Expired today' : `Expired ${daysAgo}d ago`,
      };
    }
    if (status.status === 'EXPIRING_IN_7_DAYS' || status.status === 'EXPIRING_SOON') {
      return {
        label: 'EXPIRING SOON',
        bg: '#fffbeb',
        color: '#d97706',
        borderColor: '#fde68a',
        daysText: `${status.daysLeft} days left`,
      };
    }
    if (status.status === 'VALID') {
      return {
        label: 'VALID',
        bg: '#f0fdf4',
        color: '#16a34a',
        borderColor: '#86efac',
        daysText: `${status.daysLeft} days left`,
      };
    }
    return { label: 'DATE SET', bg: '#f8fafc', color: '#334155', borderColor: '#cbd5e1', daysText: expiryDate };
  };

  const getVehicleOverallDocumentStatus = (vehicle: ManagedVehicle, docs: VehicleDocument[]) => {
    const dates: string[] = [];
    if (vehicle.fcExpiryDate) dates.push(vehicle.fcExpiryDate);
    if (vehicle.insuranceExpiryDate) dates.push(vehicle.insuranceExpiryDate);
    if (vehicle.nationalPermitExpiryDate) dates.push(vehicle.nationalPermitExpiryDate);
    if (vehicle.fiveYearPermitExpiryDate) dates.push(vehicle.fiveYearPermitExpiryDate);
    if (vehicle.quarterTaxExpiryDate) dates.push(vehicle.quarterTaxExpiryDate);
    if (vehicle.pollutionExpiryDate) dates.push(vehicle.pollutionExpiryDate);
    if (vehicle.permitExpiryDate && !vehicle.nationalPermitExpiryDate) dates.push(vehicle.permitExpiryDate);

    for (const doc of docs) {
      if (doc.expiryDate && !dates.includes(doc.expiryDate)) {
        dates.push(doc.expiryDate);
      }
    }

    if (dates.length === 0) return 'MISSING';
    const statuses = dates.map((d) => db.getDocumentExpiryStatus(d).status);
    if (statuses.includes('EXPIRED')) return 'EXPIRED';
    if (statuses.includes('EXPIRING_IN_7_DAYS') || statuses.includes('EXPIRING_SOON')) return 'EXPIRING_SOON';
    return 'VALID';
  };

  const normalizeVehicleNumber = (value?: string) => {
    if (!value || typeof value !== 'string') return '';
    return value.replace(/[^A-Z0-9]/gi, '').trim().toUpperCase();
  };

  const isImageUri = (uri?: string, fileType?: string) => {
    if (!uri) return false;
    if (fileType && fileType.startsWith('image/')) return true;
    const normalized = uri.toLowerCase().split('?')[0].split('#')[0];
    return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/.test(normalized) || normalized.startsWith('data:image/') || normalized.startsWith('blob:');
  };

  const formatDisplayDate = (value?: string) => {
    if (!value || !value.trim()) return '—';
    return value.trim();
  };

  const filteredVehicles = vehicles
    .filter((vehicle) => {
      const searchText = search.toLowerCase();
      const matchesSearch =
        !searchText ||
        [
          vehicle.vehicleNumber,
          vehicle.vehicleType,
          vehicle.vehicleModel,
          vehicle.vehicleMake,
          vehicle.ownerName,
          vehicle.ownerPhone,
          vehicle.rcNumber,
          vehicle.status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchText);

      const matchesVehicleFilter = vehicleFilter === 'ALL' || vehicle.status === vehicleFilter;
      const docs = allVehicleDocuments.filter((doc) => doc.vehicle_id === vehicle.vehicle_id);
      const docStatus = getVehicleOverallDocumentStatus(vehicle, docs);
      const matchesDocFilter = documentFilter === 'ALL' || docStatus === documentFilter;

      return matchesSearch && matchesVehicleFilter && matchesDocFilter;
    })
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  const fetchLatestVehicleTrip = async (vNumber: string): Promise<Trip | null> => {
    try {
      const trips = await db.getTrips();
      const normalizedVehicleNumber = normalizeVehicleNumber(vNumber);
      const matchingTrips = trips
        .filter((trip) => normalizeVehicleNumber(trip.vehicleNumber) === normalizedVehicleNumber)
        .filter((trip) => Boolean(trip.odometerStartPhotoUri));
      if (matchingTrips.length === 0) return null;
      return matchingTrips.sort((a, b) => {
        const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
        return bTime - aTime;
      })[0] || null;
    } catch (err) {
      console.warn('Failed to load latest trip for vehicle:', err);
      return null;
    }
  };

  const openDetails = async (vehicle: ManagedVehicle) => {
    setSelectedVehicle(vehicle);
    setSelectedVehicleTripImageError(false);
    const docs = await db.getAllDocumentsForVehicle(vehicle.vehicle_id);
    setVehicleDocuments(docs);
    const latestTrip = await fetchLatestVehicleTrip(vehicle.vehicleNumber);
    setSelectedVehicleTrip(latestTrip);
    setDetailModalVisible(true);
  };

  const resetForm = () => {
    setFeedbackMessage(null);
    setVehicleNumber('');
    setWheelType('12 Wheel');
    setVehicleMake('Tata');
    setVehicleModel('');
    setOwnerName('');
    setOwnerPhone('');
    setRcNumber('');
    setChassisNumber('');
    setYearOfManufacture('');
    setStatus('AVAILABLE');
    setDocEntries(createInitialDocEntries());
  };

  const handleUpdateDocField = (docKey: string, field: keyof DocFormEntry, value: any) => {
    setDocEntries((prev) => ({
      ...prev,
      [docKey]: {
        ...(prev[docKey] || { docNumber: '', issueDate: '', expiryDate: '' }),
        [field]: value,
      },
    }));
  };

  const handlePickFileForDoc = async (docKey: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file?.uri) return;

      const filename = file.name || file.uri.split('/').pop() || `${docKey}.pdf`;
      handleUpdateDocField(docKey, 'fileUri', file.uri);
      handleUpdateDocField(docKey, 'fileName', filename);
      handleUpdateDocField(docKey, 'fileType', file.mimeType || 'application/octet-stream');
      showFeedback(`File attached for ${docKey.replace(/_/g, ' ')}`, 'success');
    } catch (err) {
      Alert.alert('Error', 'Unable to pick document file.');
    }
  };

  const handleRemoveFileForDoc = (docKey: string) => {
    setDocEntries((prev) => ({
      ...prev,
      [docKey]: {
        ...(prev[docKey] || { docNumber: '', issueDate: '', expiryDate: '' }),
        fileUri: undefined,
        fileName: undefined,
        fileType: undefined,
      },
    }));
  };

  const handleCreateVehicle = async () => {
    const trimmedRcNumber = rcNumber.trim().toUpperCase();
    const trimmedVehicleNumber = vehicleNumber.trim() || trimmedRcNumber || `VEH-${Date.now().toString().slice(-6)}`;
    const trimmedOwnerName = ownerName.trim() || 'Unknown Owner';

    if (!trimmedRcNumber) {
      Alert.alert('Missing Field', 'Please enter the RC / Vehicle Registration Number.');
      return;
    }
    if (!chassisNumber.trim() || chassisNumber.trim().length < 4) {
      Alert.alert('Invalid Chassis Number', 'Please enter the last 4 digits of the chassis number.');
      return;
    }

    setCreating(true);
    try {
      const vehiclePayload: Omit<ManagedVehicle, 'vehicle_id' | 'createdAt' | 'updatedAt'> = {
        vehicleNumber: trimmedVehicleNumber,
        vehicleType: wheelType,
        wheelType,
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        ownerName: trimmedOwnerName,
        ownerPhone: ownerPhone.trim(),
        rcNumber: trimmedRcNumber,
        engineNumber: '',
        chassisNumber: chassisNumber.trim(),
        yearOfManufacture: yearOfManufacture.trim(),
        status,
        fcIssueDate: docEntries.FC?.issueDate.trim() || undefined,
        fcExpiryDate: docEntries.FC?.expiryDate.trim() || undefined,
        insuranceIssueDate: docEntries.INSURANCE?.issueDate.trim() || undefined,
        insuranceExpiryDate: docEntries.INSURANCE?.expiryDate.trim() || undefined,
        nationalPermitIssueDate: docEntries.NATIONAL_PERMIT?.issueDate.trim() || undefined,
        nationalPermitExpiryDate: docEntries.NATIONAL_PERMIT?.expiryDate.trim() || undefined,
        fiveYearPermitIssueDate: docEntries.FIVE_YEAR_PERMIT?.issueDate.trim() || undefined,
        fiveYearPermitExpiryDate: docEntries.FIVE_YEAR_PERMIT?.expiryDate.trim() || undefined,
        quarterTaxIssueDate: docEntries.QUARTER_TAX?.issueDate.trim() || undefined,
        quarterTaxExpiryDate: docEntries.QUARTER_TAX?.expiryDate.trim() || undefined,
        pollutionIssueDate: docEntries.POLLUTION?.issueDate.trim() || undefined,
        pollutionExpiryDate: docEntries.POLLUTION?.expiryDate.trim() || undefined,
        permitExpiryDate: docEntries.NATIONAL_PERMIT?.expiryDate.trim() || docEntries.FIVE_YEAR_PERMIT?.expiryDate.trim() || undefined,
      };

      const res = await db.createManagedVehicle(vehiclePayload);
      if (res.success && res.vehicle) {
        const createdVehicleId = res.vehicle.vehicle_id;

        // Upload attached documents and create VehicleDocument records
        const allDocKeys = [...COMPLIANCE_DOCS.map((d) => d.key), ...REGISTRATION_DOCS.map((d) => d.key)];
        for (const key of allDocKeys) {
          const entry = docEntries[key];
          if (entry && (entry.fileUri || entry.docNumber || entry.issueDate || entry.expiryDate)) {
            const spec = COMPLIANCE_DOCS.find((d) => d.key === key);
            const regSpec = REGISTRATION_DOCS.find((d) => d.key === key);
            const docLabel = spec ? spec.title : regSpec ? regSpec.label : key;

            try {
              if (entry.fileUri) {
                await db.addVehicleDocument({
                  vehicle_id: createdVehicleId,
                  docType: key,
                  docLabel,
                  docNumber: entry.docNumber.trim(),
                  issueDate: entry.issueDate.trim(),
                  expiryDate: entry.expiryDate.trim(),
                  fileUri: entry.fileUri,
                  fileName: entry.fileName || `${key}.pdf`,
                  fileType: entry.fileType || 'application/octet-stream',
                  uploadedBy: 'Admin',
                });
              }
            } catch (err) {
              console.warn(`Error uploading document ${key}:`, err);
            }
          }
        }

        await fetchVehicles(false);
        resetForm();
        setModalVisible(false);
        showFeedback('Vehicle and compliance dates added successfully!', 'success');
      } else {
        showFeedback(res.error || 'Failed to save vehicle.', 'error');
      }
    } catch (e: any) {
      showFeedback(e?.message || 'Failed to save vehicle.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handlePickDocumentForExistingVehicle = async (vehicleId: string, docType: DocType, docLabel: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file?.uri) return;

      const filename = file.name || file.uri.split('/').pop() || `${docType}.pdf`;
      const saved = await db.addVehicleDocument({
        vehicle_id: vehicleId,
        docType,
        docLabel,
        docNumber: '',
        issueDate: '',
        expiryDate: '',
        fileUri: file.uri,
        fileName: filename,
        fileType: file.mimeType || 'application/octet-stream',
        uploadedBy: 'Admin',
      });

      if (saved.success && saved.doc) {
        const freshDocs = await db.getAllDocumentsForVehicle(vehicleId);
        setVehicleDocuments(freshDocs);
        await fetchVehicles(false);
        showFeedback('Document file attached. Tap EDIT DATES to set Issue/Expire dates.', 'success');
      } else {
        Alert.alert('Upload Error', saved.error || 'Failed to upload document file.');
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to pick document file.');
    }
  };

  const openEditDocDatesModal = (spec: ComplianceDocSpec, docRecord: VehicleDocument | null, vehicle: ManagedVehicle) => {
    setActiveDocSpec(spec);
    setActiveDocRecord(docRecord);
    setDocMetaNumber(docRecord?.docNumber || '');
    setDocMetaIssueDate((vehicle[spec.issueField] as string) || docRecord?.issueDate || '');
    setDocMetaExpiryDate((vehicle[spec.expiryField] as string) || docRecord?.expiryDate || '');
    setDocActionModalVisible(true);
  };

  const handleSaveDocDates = async () => {
    if (!activeDocSpec || !selectedVehicle) return;
    setDocMetaSaving(true);
    try {
      const issueVal = docMetaIssueDate.trim();
      const expiryVal = docMetaExpiryDate.trim();
      const numberVal = docMetaNumber.trim();

      // 1. Update vehicle record compliance fields
      await db.updateManagedVehicle(selectedVehicle.vehicle_id, {
        [activeDocSpec.issueField]: issueVal,
        [activeDocSpec.expiryField]: expiryVal,
      });

      // 2. If existing document record exists, update metadata
      if (activeDocRecord) {
        await db.replaceVehicleDocument(
          activeDocRecord.doc_id,
          {
            docNumber: numberVal,
            issueDate: issueVal,
            expiryDate: expiryVal,
          },
          'Admin'
        );
      } else if (numberVal || issueVal || expiryVal) {
        // Create an active document metadata entry even without file
        await db.addVehicleDocument({
          vehicle_id: selectedVehicle.vehicle_id,
          docType: activeDocSpec.key,
          docLabel: activeDocSpec.title,
          docNumber: numberVal,
          issueDate: issueVal,
          expiryDate: expiryVal,
          fileUri: '',
          fileName: '',
          fileType: '',
          uploadedBy: 'Admin',
        });
      }

      // Refresh data
      const updatedVehicles = await db.getManagedVehicles(true);
      setVehicles(updatedVehicles);
      const currentV = updatedVehicles.find((v) => v.vehicle_id === selectedVehicle.vehicle_id);
      if (currentV) setSelectedVehicle(currentV);

      const freshDocs = await db.getAllDocumentsForVehicle(selectedVehicle.vehicle_id);
      setVehicleDocuments(freshDocs);

      setDocActionModalVisible(false);
      showFeedback(`${activeDocSpec.shortTitle} dates updated successfully!`, 'success');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to update document dates.');
    } finally {
      setDocMetaSaving(false);
    }
  };

  const handleViewDocument = async (uri: string) => {
    if (!uri) return;
    const resolvedUri = normalizeImageUrl(uri) || uri;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        if (resolvedUri.startsWith('blob:') || resolvedUri.startsWith('data:')) {
          const anchor = document.createElement('a');
          anchor.href = resolvedUri;
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          return;
        }
        window.open(resolvedUri, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.warn('Unable to open document URL:', err, resolvedUri);
        Alert.alert('Unable to open document', 'This document cannot be opened directly from the browser.');
      }
    } else {
      Linking.openURL(resolvedUri);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const doc = vehicleDocuments.find((d) => d.doc_id === docId);
    setDeleteTarget({
      type: 'DOCUMENT',
      id: docId,
      label: doc ? `${doc.docLabel || doc.docType}` : `Document #${docId}`,
    });
    setDeleteModalVisible(true);
  };

  const handleDeleteVehicle = (vehicle_id: string) => {
    const v = vehicles.find((item) => item.vehicle_id === vehicle_id);
    setDeleteTarget({
      type: 'VEHICLE',
      id: vehicle_id,
      label: v ? `${v.vehicleNumber} (${v.vehicleType})` : `Vehicle ID: ${vehicle_id}`,
    });
    setDeleteModalVisible(true);
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'DOCUMENT') {
        const result = await db.deleteVehicleDocument(deleteTarget.id);
        if (result.success) {
          if (selectedVehicle) {
            const docs = await db.getAllDocumentsForVehicle(selectedVehicle.vehicle_id);
            setVehicleDocuments(docs);
          }
          const documents = await db.getAllVehicleDocuments();
          setAllVehicleDocuments(documents);
          await fetchVehicles(false);
          showFeedback('Document deleted successfully.', 'success');
        } else {
          Alert.alert('Error', result.error || 'Failed to delete document.');
        }
      } else if (deleteTarget.type === 'VEHICLE') {
        const res = await db.deleteManagedVehicle(deleteTarget.id);
        if (res.success) {
          if (selectedVehicle?.vehicle_id === deleteTarget.id) {
            setDetailModalVisible(false);
          }
          await fetchVehicles(false);
          showFeedback('Vehicle deleted successfully.', 'success');
        } else {
          Alert.alert('Error', res.error || 'Failed to delete vehicle.');
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to perform delete operation.');
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
      setDeleteTarget(null);
    }
  };

  const getStatusColor = (st: ManagedVehicleStatus) => {
    switch (st) {
      case 'AVAILABLE':
        return '#16a34a';
      case 'ON TRIP':
        return '#2563eb';
      case 'UNDER MAINTENANCE':
        return '#d97706';
      default:
        return '#64748b';
    }
  };

  const renderVehicleItem = ({ item }: { item: ManagedVehicle }) => {
    const docs = allVehicleDocuments.filter((doc) => doc.vehicle_id === item.vehicle_id);
    const overallDocStatus = getVehicleOverallDocumentStatus(item, docs);
    const overallDocLabel =
      overallDocStatus === 'MISSING'
        ? 'Documents Missing'
        : overallDocStatus === 'EXPIRING_SOON'
        ? 'Expiring Soon'
        : overallDocStatus === 'EXPIRED'
        ? 'Documents Expired'
        : 'All Compliance Valid';
    const statusColor = getStatusColor(item.status);

    return (
      <View style={[styles.vehicleCard, isDesktop && { flex: 1, marginHorizontal: 4 }]}>
        {/* Colored left accent bar */}
        <View style={[styles.vehicleCardAccent, { backgroundColor: statusColor }]} />

        <TouchableOpacity onPress={() => openDetails(item)} activeOpacity={0.85} style={{ flex: 1 }}>
          {/* Card Top Row */}
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.vehicleNumber}>{item.vehicleNumber}</Text>
                {item.isPinned && (
                  <View style={styles.pinnedBadge}>
                    <Text style={styles.pinnedBadgeText}>📌 PINNED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.vehicleMakeModel}>
                {item.vehicleMake || 'Truck'} • {item.vehicleType}{item.vehicleModel ? ` (${item.vehicleModel})` : ''}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '18', borderColor: statusColor + '44', borderWidth: 1 }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>

          {/* Owner Row */}
          <View style={styles.ownerRow}>
            <View style={styles.ownerIconBox}>
              <MaterialIcons name="person" size={12} color={COLORS.primary} />
            </View>
            <Text style={styles.ownerText}>{item.ownerName || 'Owner not set'}</Text>
            {item.ownerPhone ? (
              <View style={styles.ownerPhoneChip}>
                <MaterialIcons name="phone" size={10} color="#64748b" />
                <Text style={styles.ownerPhoneText}>{item.ownerPhone}</Text>
              </View>
            ) : null}
          </View>

          {/* ── 6 COMPLIANCE EXPIRY BADGES ── */}
          <View style={styles.complianceSectionTitleRow}>
            <MaterialIcons name="verified" size={11} color="#64748b" />
            <Text style={styles.complianceSectionTitle}>COMPLIANCE EXPIRY DATES</Text>
          </View>
          <View style={styles.expiryGrid}>
            {COMPLIANCE_DOCS.map((docSpec) => {
              const expiryVal = (item[docSpec.expiryField] as string) || (docSpec.key === 'NATIONAL_PERMIT' ? item.permitExpiryDate : '');
              const badge = getExpiryBadgeInfo(expiryVal);
              return (
                <View key={docSpec.key} style={[
                  styles.expiryGridItem,
                  { borderColor: badge.borderColor || COLORS.outlineVariant, backgroundColor: badge.bg },
                  isTablet && { minWidth: 110 },
                ]}>
                  <View style={styles.expiryGridHeader}>
                    <Text style={[styles.expiryGridDocName, { color: docSpec.color }]} numberOfLines={1}>
                      {docSpec.num}. {docSpec.shortTitle}
                    </Text>
                    <View style={[styles.miniStatusDot, { backgroundColor: badge.color }]} />
                  </View>
                  <Text style={[styles.expiryGridDate, !expiryVal && { color: '#94a3b8', fontStyle: 'italic' }]} numberOfLines={1}>
                    {expiryVal ? expiryVal : 'Not set'}
                  </Text>
                  <Text style={[styles.expiryGridDays, { color: badge.color }]} numberOfLines={1}>{badge.daysText}</Text>
                </View>
              );
            })}
          </View>

          {/* Overall Doc Alert */}
          <View style={[styles.docAlertRow, {
            backgroundColor: overallDocStatus === 'VALID' ? '#f0fdf4' : overallDocStatus === 'EXPIRED' ? '#fef2f2' : '#fffbeb',
            borderColor: overallDocStatus === 'VALID' ? '#86efac' : overallDocStatus === 'EXPIRED' ? '#fca5a5' : '#fde68a',
            borderWidth: 1,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 5,
            marginTop: 10,
          }]}>
            <MaterialIcons
              name={overallDocStatus === 'VALID' ? 'check-circle' : overallDocStatus === 'EXPIRED' ? 'error' : 'warning-amber'}
              size={14}
              color={overallDocStatus === 'VALID' ? '#16a34a' : overallDocStatus === 'EXPIRED' ? '#dc2626' : '#d97706'}
            />
            <Text
              style={[
                styles.docAlertText,
                { color: overallDocStatus === 'VALID' ? '#16a34a' : overallDocStatus === 'EXPIRED' ? '#dc2626' : '#d97706' },
              ]}
            >
              {overallDocLabel}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── CARD ACTION TOOLBAR ── */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity onPress={() => openDetails(item)} style={styles.cardActionBtn}>
            <MaterialIcons name="visibility" size={14} color={COLORS.primary} />
            <Text style={styles.cardActionBtnText}>DETAILS & DOCS</Text>
          </TouchableOpacity>

          <View style={styles.cardActionsRight}>
            <TouchableOpacity
              onPress={async () => {
                await db.togglePinVehicle(item.vehicle_id);
                fetchVehicles(false);
              }}
              style={[styles.cardIconBtn, item.isPinned && { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}
            >
              <MaterialIcons name="push-pin" size={15} color={item.isPinned ? '#d97706' : COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleDeleteVehicle(item.vehicle_id)} style={[styles.cardIconBtn, { borderColor: '#fca5a5', backgroundColor: '#fef2f2' }]}>
              <MaterialIcons name="delete-outline" size={15} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {feedbackMessage ? (
        <View style={[styles.feedbackBanner, feedbackMessage.type === 'error' ? styles.feedbackBannerError : styles.feedbackBannerSuccess]}>
          <Text style={styles.feedbackText}>{feedbackMessage.text}</Text>
        </View>
      ) : null}

      {/* Top Header */}
      <View style={[styles.headerBar, !isDesktop && { flexWrap: 'wrap', gap: 10 }]}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Text style={styles.barTitle}>VEHICLE MANAGEMENT</Text>
          <Text style={styles.barSubtitle}>Fleet compliance dates, permits & document records</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <MaterialIcons name="add-circle" size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>ADD NEW VEHICLE</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={18} color={COLORS.outline} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search vehicle number, owner, make, status..."
            placeholderTextColor={COLORS.outline}
          />
        </View>
      </View>

      {/* Status Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll} contentContainerStyle={styles.pillRow}>
        {(['ALL', 'AVAILABLE', 'ON TRIP', 'UNDER MAINTENANCE', 'INACTIVE'] as VehicleFilter[]).map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.pill, vehicleFilter === option && styles.pillActive]}
            onPress={() => setVehicleFilter(option)}
          >
            <Text style={[styles.pillText, vehicleFilter === option && styles.pillTextActive]}>
              {option === 'ALL' ? 'All Vehicles' : option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Document Expiry Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll} contentContainerStyle={styles.pillRow}>
        {(['ALL', 'VALID', 'EXPIRING_SOON', 'EXPIRED', 'MISSING'] as DocumentFilter[]).map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.pill, documentFilter === option && styles.pillActive]}
            onPress={() => setDocumentFilter(option)}
          >
            <Text style={[styles.pillText, documentFilter === option && styles.pillTextActive]}>
              {option === 'ALL' ? 'All Document Statuses' : option.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading fleet records...</Text>
        </View>
      ) : filteredVehicles.length === 0 ? (
        <View style={styles.centerBox}>
          <MaterialIcons name="directions-bus" size={64} color={COLORS.outline} />
          <Text style={styles.emptyTitle}>No vehicles found</Text>
          <Text style={styles.emptyDesc}>Add vehicles and set up their compliance dates (FC, Insurance, Permits, Tax, Pollution).</Text>
        </View>
      ) : (
        <FlatList
          key={`vehicles-grid-${numColumns}`}
          data={filteredVehicles}
          renderItem={renderVehicleItem}
          keyExtractor={(item) => item.vehicle_id}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { justifyContent: 'space-between', marginBottom: 8 } : undefined}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ADD NEW VEHICLE MODAL (WITH DEDICATED MANUAL ISSUE - EXPIRE DATES)
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.modalTitle}>ADD NEW FLEET VEHICLE</Text>
              <Text style={styles.modalSubtitle}>Fill in details & compliance records</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={[styles.modalContent, isTablet && { alignSelf: 'center', width: '100%', maxWidth: modalMaxWidth }]} keyboardShouldPersistTaps="handled">
            {/* ── CARD 1: VEHICLE SPECIFICATIONS ── */}
            <View style={styles.formCard}>
              <View style={styles.formCardHeader}>
                <View style={[styles.sectionIconBox, { backgroundColor: '#eff6ff' }]}>
                  <MaterialIcons name="local-shipping" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>1. VEHICLE SPECIFICATIONS</Text>
                  <Text style={styles.sectionSubtitle}>Registration, make, model & chassis details</Text>
                </View>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepCircleText}>1</Text>
                </View>
              </View>
              <View style={styles.sectionDivider} />

              <View style={styles.inputGroup}>
                <Text style={styles.label}>VEHICLE REGISTRATION / RC NUMBER *</Text>
                <TextInput
                  style={styles.formInput}
                  value={rcNumber}
                  onChangeText={(val) => {
                    setRcNumber(val.toUpperCase());
                    if (!vehicleNumber) setVehicleNumber(val.toUpperCase());
                  }}
                  placeholder="e.g. TN 38 AB 1234"
                  autoCapitalize="characters"
                />
              </View>

              <View style={formCols === 2 ? styles.inputRow : undefined}>
                <View style={[styles.inputGroup, formCols === 2 && { flex: 1 }]}>
                  <Text style={styles.label}>WHEEL TYPE</Text>
                  <TouchableOpacity style={styles.dropdownInput} onPress={() => setWheelTypeModalVisible(true)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialIcons name="settings" size={15} color={COLORS.primary} />
                      <Text style={styles.dropdownInputText}>{wheelType}</Text>
                    </View>
                    <MaterialIcons name="keyboard-arrow-down" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputGroup, formCols === 2 && { flex: 1 }]}>
                  <Text style={styles.label}>VEHICLE MAKE / MANUFACTURER</Text>
                  <TouchableOpacity style={styles.dropdownInput} onPress={() => setVehicleMakeModalVisible(true)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialIcons name="directions-bus" size={15} color={COLORS.primary} />
                      <Text style={styles.dropdownInputText}>{vehicleMake}</Text>
                    </View>
                    <MaterialIcons name="keyboard-arrow-down" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={formCols === 2 ? styles.inputRow : undefined}>
                <View style={[styles.inputGroup, formCols === 2 && { flex: 1 }]}>
                  <Text style={styles.label}>MODEL / VARIANT</Text>
                  <View style={styles.inputWithIcon}>
                    <MaterialIcons name="article" size={15} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.formInputIcon}
                      value={vehicleModel}
                      onChangeText={(v) => setVehicleModel(v.toUpperCase())}
                      placeholder="e.g. LPT 3118"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, formCols === 2 && { flex: 1 }]}>
                  <Text style={styles.label}>YEAR OF MANUFACTURE</Text>
                  <View style={styles.inputWithIcon}>
                    <MaterialIcons name="calendar-today" size={15} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.formInputIcon}
                      value={yearOfManufacture}
                      onChangeText={setYearOfManufacture}
                      placeholder="e.g. 2023"
                      keyboardType="number-pad"
                      placeholderTextColor="#94a3b8"
                      maxLength={4}
                    />
                  </View>
                </View>
              </View>

              <View style={formCols === 2 ? styles.inputRow : undefined}>
                <View style={[styles.inputGroup, formCols === 2 && { flex: 1 }]}>
                  <Text style={styles.label}>CHASSIS NUMBER (LAST 4 DIGITS) *</Text>
                  <View style={styles.inputWithIcon}>
                    <MaterialIcons name="tag" size={15} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.formInputIcon}
                      value={chassisNumber}
                      onChangeText={(val) => setChassisNumber(val.replace(/\D/g, '').slice(0, 4))}
                      placeholder="e.g. 8492"
                      keyboardType="number-pad"
                      maxLength={4}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, formCols === 2 && { flex: 1 }]}>
                  <Text style={styles.label}>INITIAL STATUS</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {(['AVAILABLE', 'UNDER MAINTENANCE'] as ManagedVehicleStatus[]).map((st) => (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setStatus(st)}
                        style={[
                          styles.statusToggleBtn,
                          status === st && { backgroundColor: getStatusColor(st), borderColor: getStatusColor(st) },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {status === st && <MaterialIcons name="check-circle" size={12} color="#ffffff" />}
                          <Text style={[styles.statusToggleText, status === st && { color: '#ffffff' }]}>
                            {st === 'AVAILABLE' ? 'Available' : 'Maintenance'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* ── CARD 2: OWNER & OPERATOR CONTACT ── */}
            <View style={styles.formCard}>
              <View style={styles.formCardHeader}>
                <View style={[styles.sectionIconBox, { backgroundColor: '#f0fdf4' }]}>
                  <MaterialIcons name="person" size={18} color="#16a34a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>2. OWNER & OPERATOR DETAILS</Text>
                  <Text style={styles.sectionSubtitle}>Owner name and contact number</Text>
                </View>
                <View style={[styles.stepCircle, { backgroundColor: '#16a34a' }]}>
                  <Text style={styles.stepCircleText}>2</Text>
                </View>
              </View>
              <View style={styles.sectionDivider} />

              <View style={formCols === 2 ? styles.inputRow : undefined}>
                <View style={[styles.inputGroup, formCols === 2 && { flex: 1 }]}>
                  <Text style={styles.label}>OWNER FULL NAME</Text>
                  <View style={styles.inputWithIcon}>
                    <MaterialIcons name="account-circle" size={15} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.formInputIcon}
                      value={ownerName}
                      onChangeText={setOwnerName}
                      placeholder="e.g. K. Murugan / NBT Fleet"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, formCols === 2 && { flex: 1 }]}>
                  <Text style={styles.label}>OWNER PHONE NUMBER</Text>
                  <View style={styles.inputWithIcon}>
                    <MaterialIcons name="phone" size={15} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.formInputIcon}
                      value={ownerPhone}
                      onChangeText={setOwnerPhone}
                      placeholder="e.g. 98421 55678"
                      keyboardType="phone-pad"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* ── CARD 3: 6 CORE COMPLIANCE DOCUMENTS (MANUAL ISSUE & EXPIRE DATES) ── */}
            <View style={styles.formCard}>
              <View style={styles.formCardHeader}>
                <View style={[styles.sectionIconBox, { backgroundColor: '#fef3c7' }]}>
                  <MaterialIcons name="verified" size={18} color="#d97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>3. VEHICLE COMPLIANCE & EXPIRY RECORDS</Text>
                  <Text style={styles.sectionSubtitle}>
                    Enter official Issue & Expire dates manually. Attach document photos or PDFs if needed.
                  </Text>
                </View>
                <View style={[styles.stepCircle, { backgroundColor: '#d97706' }]}>
                  <Text style={styles.stepCircleText}>3</Text>
                </View>
              </View>
              <View style={styles.sectionDivider} />

              {COMPLIANCE_DOCS.map((docSpec) => {
                const entry = docEntries[docSpec.key] || { docNumber: '', issueDate: '', expiryDate: '' };
                const badge = getExpiryBadgeInfo(entry.expiryDate);

                return (
                  <View key={docSpec.key} style={styles.docComplianceCard}>
                    {/* Header Row for Document Item */}
                    <View style={styles.docComplianceHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[styles.docNumberCircle, { backgroundColor: docSpec.color }]}>
                          <Text style={styles.docNumberCircleText}>{docSpec.num}</Text>
                        </View>
                        <MaterialIcons name={docSpec.icon} size={18} color={docSpec.color} />
                        <Text style={styles.docComplianceTitle}>{docSpec.title}</Text>
                      </View>

                      {/* Live Expiry Status Pill */}
                      <View style={[styles.liveStatusPill, { backgroundColor: badge.bg, borderColor: badge.borderColor }]}>
                        <Text style={[styles.liveStatusPillText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    </View>

                    {/* 2-Column Issue Date & Expire Date Row */}
                    <View style={styles.inputRow}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>📅 ISSUE DATE (YYYY-MM-DD)</Text>
                        <View style={[styles.dateInputWrapper, { borderColor: '#93c5fd' }]}>
                          <MaterialIcons name="event" size={16} color="#3b82f6" style={{ marginRight: 6 }} />
                          <TextInput
                            style={styles.dateInput}
                            value={entry.issueDate}
                            onChangeText={(val) => handleUpdateDocField(docSpec.key, 'issueDate', val)}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                      </View>

                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>🚨 EXPIRE DATE (YYYY-MM-DD)</Text>
                        <View style={[styles.dateInputWrapper, { borderColor: badge.borderColor || COLORS.outlineVariant }]}>
                          <MaterialIcons name="event-busy" size={16} color={badge.color} style={{ marginRight: 6 }} />
                          <TextInput
                            style={[styles.dateInput, { color: badge.color || COLORS.textDark }]}
                            value={entry.expiryDate}
                            onChangeText={(val) => handleUpdateDocField(docSpec.key, 'expiryDate', val)}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                      </View>
                    </View>

                    {/* Document / Certificate Number */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>🔖 CERTIFICATE / POLICY NUMBER</Text>
                      <View style={styles.inputWithIcon}>
                        <MaterialIcons name="badge" size={14} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.formInputIcon}
                          value={entry.docNumber}
                          onChangeText={(val) => handleUpdateDocField(docSpec.key, 'docNumber', val)}
                          placeholder={docSpec.docNumberPlaceholder}
                          placeholderTextColor="#94a3b8"
                          autoCapitalize="characters"
                        />
                      </View>
                    </View>

                    {/* Attachment Row */}
                    <View style={styles.docAttachmentRow}>
                      {entry.fileUri ? (
                        <View style={styles.fileAttachedBox}>
                          <MaterialIcons name="attach-file" size={16} color={COLORS.primary} />
                          <Text style={styles.fileNameText} numberOfLines={1}>
                            {entry.fileName || 'Attached file'}
                          </Text>
                          <TouchableOpacity onPress={() => handleRemoveFileForDoc(docSpec.key)} style={styles.removeFileBtn}>
                            <MaterialIcons name="close" size={14} color="#dc2626" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.attachBtn}
                          onPress={() => handlePickFileForDoc(docSpec.key)}
                        >
                          <MaterialIcons name="cloud-upload" size={16} color={COLORS.primary} />
                          <Text style={styles.attachBtnText}>ATTACH PHOTO / PDF (OPTIONAL)</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* ── CARD 4: RC BOOK PHOTOS ── */}
            <View style={styles.formCard}>
              <View style={styles.formCardHeader}>
                <View style={[styles.sectionIconBox, { backgroundColor: '#f5f3ff' }]}>
                  <MaterialIcons name="credit-card" size={18} color="#7c3aed" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>4. RC BOOK PHOTOS (FRONT & BACK)</Text>
                  <Text style={styles.sectionSubtitle}>Attach registration certificate scans for quick dispatch verification.</Text>
                </View>
                <View style={[styles.stepCircle, { backgroundColor: '#7c3aed' }]}>
                  <Text style={styles.stepCircleText}>4</Text>
                </View>
              </View>
              <View style={styles.sectionDivider} />

              <View style={styles.inputRow}>
                {REGISTRATION_DOCS.map((regDoc) => {
                  const entry = docEntries[regDoc.key];
                  return (
                    <View key={regDoc.key} style={[styles.rcUploadBox, { flex: 1 }]}>
                      <Text style={styles.rcUploadLabel}>{regDoc.label}</Text>
                      {entry?.fileUri ? (
                        <View style={styles.rcPreviewContainer}>
                          {isImageUri(entry.fileUri, entry.fileType) ? (
                            <Image source={{ uri: entry.fileUri }} style={styles.rcThumbnail} resizeMode="cover" />
                          ) : (
                            <MaterialIcons name="description" size={32} color={COLORS.primary} />
                          )}
                          <Text style={styles.rcFileName} numberOfLines={1}>{entry.fileName || 'Attached'}</Text>
                          <TouchableOpacity onPress={() => handleRemoveFileForDoc(regDoc.key)} style={styles.rcRemoveBtn}>
                            <Text style={styles.rcRemoveBtnText}>REMOVE</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.rcPickBtn} onPress={() => handlePickFileForDoc(regDoc.key)}>
                          <MaterialIcons name="add-photo-alternate" size={24} color="#64748b" />
                          <Text style={styles.rcPickBtnText}>UPLOAD {regDoc.key === 'RC_FRONT' ? 'FRONT' : 'BACK'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Submit Action Button */}
            <TouchableOpacity
              style={[styles.submitBtn, creating && { opacity: 0.6 }]}
              onPress={handleCreateVehicle}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="check-circle" size={20} color="#ffffff" />
                  <Text style={styles.submitBtnText}>SAVE VEHICLE & COMPLIANCE RECORDS</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          VEHICLE DETAILS & DOCUMENT MANAGEMENT MODAL
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={detailModalVisible} animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeBtn}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedVehicle?.vehicleNumber || 'VEHICLE RECORD'}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedVehicle && (
              <>
                {/* Vehicle Passport Card */}
                <View style={styles.formCard}>
                  <View style={styles.cardHeaderRow}>
                    <View>
                      <Text style={styles.detailVehicleNum}>{selectedVehicle.vehicleNumber}</Text>
                      <Text style={styles.detailVehicleSub}>
                        {selectedVehicle.vehicleMake} • {selectedVehicle.vehicleType} {selectedVehicle.vehicleModel ? `(${selectedVehicle.vehicleModel})` : ''}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedVehicle.status) + '18' }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedVehicle.status) }]}>{selectedVehicle.status}</Text>
                    </View>
                  </View>

                  <View style={styles.detailInfoGrid}>
                    <View style={styles.detailGridCol}>
                      <Text style={styles.detailLabel}>RC NUMBER</Text>
                      <Text style={styles.detailValue}>{selectedVehicle.rcNumber || '—'}</Text>
                    </View>
                    <View style={styles.detailGridCol}>
                      <Text style={styles.detailLabel}>CHASSIS (LAST 4)</Text>
                      <Text style={styles.detailValue}>{selectedVehicle.chassisNumber || '—'}</Text>
                    </View>
                    <View style={styles.detailGridCol}>
                      <Text style={styles.detailLabel}>OWNER</Text>
                      <Text style={styles.detailValue}>{selectedVehicle.ownerName || '—'}</Text>
                    </View>
                    <View style={styles.detailGridCol}>
                      <Text style={styles.detailLabel}>PHONE</Text>
                      <Text style={styles.detailValue}>{selectedVehicle.ownerPhone || '—'}</Text>
                    </View>
                    <View style={styles.detailGridCol}>
                      <Text style={styles.detailLabel}>YEAR</Text>
                      <Text style={styles.detailValue}>{selectedVehicle.yearOfManufacture || '—'}</Text>
                    </View>
                    <View style={styles.detailGridCol}>
                      <Text style={styles.detailLabel}>RECORD CREATED</Text>
                      <Text style={styles.detailValue}>{selectedVehicle.createdAt ? selectedVehicle.createdAt.slice(0, 10) : '—'}</Text>
                    </View>
                  </View>
                </View>

                {/* ── 6 CORE COMPLIANCE DOCUMENTS MANAGEMENT ── */}
                <View style={styles.formCard}>
                  <View style={styles.documentsSectionHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionTitle}>VEHICLE COMPLIANCE DOCUMENTS</Text>
                      <Text style={styles.sectionSubtitle}>
                        Issue dates, expiry dates, and attached certificates
                      </Text>
                    </View>
                  </View>

                  {COMPLIANCE_DOCS.map((docSpec) => {
                    const expiryDateVal = (selectedVehicle[docSpec.expiryField] as string) || (docSpec.key === 'NATIONAL_PERMIT' ? selectedVehicle.permitExpiryDate : '');
                    const issueDateVal = selectedVehicle[docSpec.issueField] as string;
                    const attachedDocs = vehicleDocuments.filter((d) => d.docType === docSpec.key);
                    const latestDoc = attachedDocs[0];
                    const badge = getExpiryBadgeInfo(expiryDateVal || latestDoc?.expiryDate);

                    return (
                      <View key={docSpec.key} style={styles.docDetailCard}>
                        {/* Header */}
                        <View style={styles.docDetailCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <View style={[styles.docNumberCircle, { backgroundColor: docSpec.color }]}>
                              <Text style={styles.docNumberCircleText}>{docSpec.num}</Text>
                            </View>
                            <MaterialIcons name={docSpec.icon} size={19} color={docSpec.color} />
                            <Text style={styles.docDetailTitle}>{docSpec.title}</Text>
                          </View>
                          <View style={[styles.liveStatusPill, { backgroundColor: badge.bg, borderColor: badge.borderColor }]}>
                            <Text style={[styles.liveStatusPillText, { color: badge.color }]}>{badge.label}</Text>
                          </View>
                        </View>

                        {/* Dates Grid */}
                        <View style={styles.datesDisplayGrid}>
                          <View style={styles.dateBox}>
                            <Text style={styles.dateBoxLabel}>ISSUE DATE</Text>
                            <Text style={styles.dateBoxValue}>{formatDisplayDate(issueDateVal || latestDoc?.issueDate)}</Text>
                          </View>

                          <View style={[styles.dateBox, { borderLeftWidth: 1, borderLeftColor: COLORS.outlineVariant }]}>
                            <Text style={styles.dateBoxLabel}>EXPIRE DATE</Text>
                            <Text style={[styles.dateBoxValue, { color: badge.color, fontWeight: '800' }]}>
                              {formatDisplayDate(expiryDateVal || latestDoc?.expiryDate)}
                            </Text>
                            <Text style={[styles.dateBoxDays, { color: badge.color }]}>{badge.daysText}</Text>
                          </View>

                          <View style={[styles.dateBox, { borderLeftWidth: 1, borderLeftColor: COLORS.outlineVariant }]}>
                            <Text style={styles.dateBoxLabel}>DOC / POLICY #</Text>
                            <Text style={styles.dateBoxValue}>{latestDoc?.docNumber || '—'}</Text>
                          </View>
                        </View>

                        {/* Attached File Preview if present */}
                        {latestDoc?.fileUri ? (
                          <View style={styles.attachedFileDetailRow}>
                            <MaterialIcons name="insert-drive-file" size={18} color={COLORS.primary} />
                            <Text style={styles.attachedFileName} numberOfLines={1}>
                              {latestDoc.fileName || 'Attached certificate'}
                            </Text>
                            {isImageUri(latestDoc.fileUri, latestDoc.fileType) && !documentImageErrors[latestDoc.doc_id] ? (
                              <Image
                                source={{ uri: normalizeImageUrl(latestDoc.fileUri) || latestDoc.fileUri }}
                                style={styles.inlineThumb}
                                resizeMode="cover"
                                onError={() => setDocumentImageErrors((p) => ({ ...p, [latestDoc.doc_id]: true }))}
                              />
                            ) : null}
                          </View>
                        ) : null}

                        {/* Action buttons row */}
                        <View style={styles.docDetailActionsRow}>
                          <TouchableOpacity
                            style={styles.docActionBtnPrimary}
                            onPress={() => openEditDocDatesModal(docSpec, latestDoc || null, selectedVehicle)}
                          >
                            <MaterialIcons name="edit" size={15} color={COLORS.primary} />
                            <Text style={styles.docActionBtnPrimaryText}>EDIT DATES / DETAILS</Text>
                          </TouchableOpacity>

                          {latestDoc?.fileUri ? (
                            <>
                              <TouchableOpacity
                                style={styles.docActionBtn}
                                onPress={() => handleViewDocument(latestDoc.fileUri)}
                              >
                                <MaterialIcons name="visibility" size={15} color="#475569" />
                                <Text style={styles.docActionBtnText}>VIEW</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.docActionBtnDanger}
                                onPress={() => handleDeleteDocument(latestDoc.doc_id)}
                              >
                                <MaterialIcons name="delete-outline" size={15} color="#dc2626" />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <TouchableOpacity
                              style={styles.docActionBtn}
                              onPress={() => handlePickDocumentForExistingVehicle(selectedVehicle.vehicle_id, docSpec.key, docSpec.title)}
                            >
                              <MaterialIcons name="cloud-upload" size={15} color={COLORS.primary} />
                              <Text style={styles.docActionBtnText}>UPLOAD FILE</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* RC Book Registration Files */}
                <View style={styles.formCard}>
                  <Text style={styles.sectionTitle}>RC REGISTRATION PHOTOS</Text>
                  <View style={styles.inputRow}>
                    {REGISTRATION_DOCS.map((regDoc) => {
                      const docs = vehicleDocuments.filter((d) => d.docType === regDoc.key);
                      const latest = docs[0];
                      return (
                        <View key={regDoc.key} style={[styles.rcDetailBox, { flex: 1 }]}>
                          <Text style={styles.rcDetailLabel}>{regDoc.label}</Text>
                          {latest?.fileUri ? (
                            <View style={styles.rcDetailFileBox}>
                              {isImageUri(latest.fileUri, latest.fileType) ? (
                                <Image source={{ uri: normalizeImageUrl(latest.fileUri) || latest.fileUri }} style={styles.rcPreviewImg} resizeMode="cover" />
                              ) : null}
                              <TouchableOpacity style={styles.viewDocBtn} onPress={() => handleViewDocument(latest.fileUri)}>
                                <MaterialIcons name="visibility" size={14} color="#ffffff" />
                                <Text style={styles.viewDocBtnText}>VIEW</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.rcUploadEmptyBtn}
                              onPress={() => handlePickDocumentForExistingVehicle(selectedVehicle.vehicle_id, regDoc.key, regDoc.label)}
                            >
                              <MaterialIcons name="add-photo-alternate" size={20} color={COLORS.primary} />
                              <Text style={styles.rcUploadEmptyText}>UPLOAD {regDoc.key === 'RC_FRONT' ? 'FRONT' : 'BACK'}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Odometer Telemetry */}
                {selectedVehicleTrip ? (
                  <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>LATEST DRIVER ODOMETER UPLOAD</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Driver</Text>
                      <Text style={styles.detailValue}>{selectedVehicleTrip.driverName || 'Unknown'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Odometer Reading</Text>
                      <Text style={styles.detailValue}>{selectedVehicleTrip.odometerStart ? `${selectedVehicleTrip.odometerStart} km` : 'N/A'}</Text>
                    </View>
                    {isImageUri(selectedVehicleTrip.odometerStartPhotoUri) && !selectedVehicleTripImageError ? (
                      <Image
                        source={{ uri: selectedVehicleTrip.odometerStartPhotoUri! }}
                        style={styles.docPreview}
                        resizeMode="cover"
                        onError={() => setSelectedVehicleTripImageError(true)}
                      />
                    ) : null}
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          EDIT DOCUMENT DATES / METADATA MODAL
         ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={docActionModalVisible} animationType="fade" transparent onRequestClose={() => setDocActionModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.editDocModalCard}>
            <View style={styles.editDocModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {activeDocSpec ? (
                  <View style={[styles.docNumberCircle, { backgroundColor: activeDocSpec.color }]}>
                    <Text style={styles.docNumberCircleText}>{activeDocSpec.num}</Text>
                  </View>
                ) : null}
                <Text style={styles.editDocModalTitle}>
                  EDIT {activeDocSpec?.title || 'DOCUMENT'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDocActionModalVisible(false)}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Live Status Preview */}
            <View style={styles.modalStatusBanner}>
              <Text style={styles.modalStatusBannerLabel}>Calculated Status:</Text>
              <View style={[styles.liveStatusPill, { backgroundColor: getExpiryBadgeInfo(docMetaExpiryDate).bg, borderColor: getExpiryBadgeInfo(docMetaExpiryDate).borderColor }]}>
                <Text style={[styles.liveStatusPillText, { color: getExpiryBadgeInfo(docMetaExpiryDate).color }]}>
                  {getExpiryBadgeInfo(docMetaExpiryDate).label} ({getExpiryBadgeInfo(docMetaExpiryDate).daysText})
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>DOCUMENT / CERTIFICATE / POLICY NUMBER</Text>
              <TextInput
                style={styles.formInput}
                value={docMetaNumber}
                onChangeText={setDocMetaNumber}
                placeholder={activeDocSpec?.docNumberPlaceholder || 'e.g. POL-12345'}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>ISSUE DATE (YYYY-MM-DD)</Text>
                <View style={styles.dateInputWrapper}>
                  <MaterialIcons name="event" size={16} color="#64748b" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.dateInput}
                    value={docMetaIssueDate}
                    onChangeText={setDocMetaIssueDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>EXPIRE DATE (YYYY-MM-DD) *</Text>
                <View style={styles.dateInputWrapper}>
                  <MaterialIcons name="event-busy" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.dateInput}
                    value={docMetaExpiryDate}
                    onChangeText={setDocMetaExpiryDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#f1f5f9' }]}
                onPress={() => setDocActionModalVisible(false)}
              >
                <Text style={[styles.modalActionBtnText, { color: '#475569' }]}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: COLORS.primary }, docMetaSaving && { opacity: 0.6 }]}
                onPress={handleSaveDocDates}
                disabled={docMetaSaving}
              >
                {docMetaSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalActionBtnText, { color: '#ffffff' }]}>SAVE DATES</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Wheel Type Selector Modal */}
      <Modal transparent visible={wheelTypeModalVisible} animationType="fade" onRequestClose={() => setWheelTypeModalVisible(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setWheelTypeModalVisible(false)}>
          <View style={styles.dropdownSheet}>
            <Text style={styles.dropdownSheetTitle}>Select Wheel Configuration</Text>
            {(['6 Wheel', '10 Wheel', '12 Wheel', '14 Wheel', '16 Wheel'] as VehicleWheelType[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.dropdownOption, wheelType === option && { backgroundColor: '#eff6ff' }]}
                onPress={() => {
                  setWheelType(option);
                  setWheelTypeModalVisible(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, wheelType === option && { color: COLORS.primary, fontWeight: 'bold' }]}>
                  {option}
                </Text>
                {wheelType === option ? <MaterialIcons name="check" size={18} color={COLORS.primary} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Vehicle Make Selector Modal */}
      <Modal transparent visible={vehicleMakeModalVisible} animationType="fade" onRequestClose={() => setVehicleMakeModalVisible(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setVehicleMakeModalVisible(false)}>
          <View style={styles.dropdownSheet}>
            <Text style={styles.dropdownSheetTitle}>Select Vehicle Manufacturer</Text>
            {(['Ashok Leyland', 'Tata', 'Eicher', 'Bharat Benz', 'Mahindra', 'Other'] as VehicleMake[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.dropdownOption, vehicleMake === option && { backgroundColor: '#eff6ff' }]}
                onPress={() => {
                  setVehicleMake(option);
                  setVehicleMakeModalVisible(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, vehicleMake === option && { color: COLORS.primary, fontWeight: 'bold' }]}>
                  {option}
                </Text>
                {vehicleMake === option ? <MaterialIcons name="check" size={18} color={COLORS.primary} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        visible={deleteModalVisible}
        title={deleteTarget?.type === 'DOCUMENT' ? 'Delete Document' : 'Delete Vehicle'}
        message={
          deleteTarget?.type === 'DOCUMENT'
            ? 'Are you sure you want to remove this uploaded vehicle document?'
            : 'Are you sure you want to permanently delete this vehicle? This action cannot be undone.'
        }
        itemLabel={deleteTarget?.label}
        isDeleting={isDeleting}
        onConfirm={confirmDeleteAction}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeleteTarget(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.gutter,
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
  },
  barTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff', letterSpacing: 0.5 },
  barSubtitle: { fontSize: 11, color: '#dbeafe', marginTop: 2 },
  feedbackBanner: {
    marginHorizontal: SPACING.gutter,
    marginTop: SPACING.gutter / 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  feedbackBannerSuccess: { backgroundColor: '#ecfdf3', borderColor: '#86efac' },
  feedbackBannerError: { backgroundColor: '#fef2f2', borderColor: '#fda4af' },
  feedbackText: { fontSize: 12, fontWeight: '700', color: COLORS.textDark },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    ...SHADOWS.light,
  },
  addBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  filterRow: { paddingHorizontal: SPACING.gutter, paddingTop: SPACING.gutter / 2, paddingBottom: 6 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    height: 46,
    ...SHADOWS.light,
  },
  searchInput: { flex: 1, fontSize: 13, marginLeft: 8, color: COLORS.textDark },
  pillScroll: { height: 46, flexGrow: 0, flexShrink: 0 },
  pillRow: { paddingHorizontal: SPACING.gutter, paddingVertical: 5, gap: 8, alignItems: 'center' },
  pill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    height: 32,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { color: COLORS.textMuted, fontSize: 11.5, fontWeight: '700' },
  pillTextActive: { color: '#ffffff' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { color: COLORS.textMuted, marginTop: 10, fontSize: 13, fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
  listContent: { padding: SPACING.gutter, paddingBottom: 96 },

  /* ── VEHICLE CARD ── */
  vehicleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    ...SHADOWS.light,
  },
  vehicleCardAccent: {
    width: 4,
    borderRadius: 0,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, paddingBottom: 0 },
  vehicleNumber: { fontSize: 16, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.5 },
  vehicleMakeModel: { fontSize: 12, color: '#475569', fontWeight: '600', marginTop: 2 },
  pinnedBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  pinnedBadgeText: { fontSize: 9, color: '#b45309', fontWeight: 'bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 14 },
  ownerIconBox: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  ownerText: { fontSize: 12, color: COLORS.textDark, fontWeight: '700', flex: 1 },
  ownerPhoneChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ownerPhoneText: { fontSize: 10.5, color: '#64748b', fontWeight: '600' },

  complianceSectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, marginBottom: 6, paddingHorizontal: 14 },
  complianceSectionTitle: { fontSize: 9.5, fontWeight: '800', color: '#64748b', letterSpacing: 0.8 },
  expiryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingHorizontal: 14 },
  expiryGridItem: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 90,
    maxWidth: '33%',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
  },
  expiryGridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expiryGridDocName: { fontSize: 9, fontWeight: '800', flex: 1 },
  miniStatusDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  expiryGridDate: { fontSize: 10, fontWeight: '700', color: COLORS.textDark, marginTop: 3 },
  expiryGridDays: { fontSize: 8, fontWeight: '700', marginTop: 1 },
  docAlertRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 14 },
  docAlertText: { fontSize: 11, fontWeight: '700', flex: 1 },

  cardActionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActionsRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  cardActionBtnText: { fontSize: 11, color: COLORS.primary, fontWeight: '800' },
  cardIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: '#f8fafc',
  },
  cardActionBtnDanger: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  cardActionBtnTextDanger: { fontSize: 11, color: '#dc2626', fontWeight: 'bold' },

  /* ── MODALS ── */
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 62,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)' },
  modalTitle: { fontSize: 14, fontWeight: '900', color: '#ffffff', letterSpacing: 0.5 },
  modalSubtitle: { fontSize: 10, color: '#93c5fd', marginTop: 1 },
  modalContent: { padding: SPACING.gutter, paddingBottom: 64 },

  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    marginBottom: 14,
    ...SHADOWS.light,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepCircleText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  sectionDivider: { height: 1, backgroundColor: COLORS.outlineVariant, marginBottom: 14, opacity: 0.5 },
  formCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 12.5, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.3 },
  sectionSubtitle: { fontSize: 10.5, color: COLORS.textMuted, marginTop: 1, lineHeight: 14 },
  inputGroup: { marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 10, fontWeight: '800', color: '#475569', marginBottom: 5, letterSpacing: 0.4 },

  /* Input with leading icon */
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    height: 44,
    backgroundColor: '#f8fafc',
    paddingRight: 10,
  },
  inputIcon: { paddingHorizontal: 10 },
  formInputIcon: { flex: 1, fontSize: 13, color: COLORS.textDark, fontWeight: '500', height: '100%' },

  formInput: {
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    height: 44,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    fontSize: 13,
    color: COLORS.textDark,
  },
  formInputCompact: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    height: 40,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    fontSize: 12.5,
    color: COLORS.textDark,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    height: 42,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
  },
  dateInput: { flex: 1, fontSize: 13, color: COLORS.textDark, fontWeight: '600' },
  dropdownInput: {
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    height: 44,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownInputText: { fontSize: 13, color: COLORS.textDark, fontWeight: '600' },
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: 24 },
  dropdownSheet: { backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden', padding: 14 },
  dropdownSheetTitle: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginBottom: 10 },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderRadius: 6,
  },
  dropdownOptionText: { fontSize: 13, color: COLORS.textDark },
  statusToggleBtn: {
    flex: 1,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  statusToggleText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textMuted },

  /* ── COMPLIANCE CARD IN ADD VEHICLE ── */
  docComplianceCard: {
    backgroundColor: '#fafbfc',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.light,
  },
  docComplianceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  docNumberCircle: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  docNumberCircleText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  docComplianceTitle: { fontSize: 13, fontWeight: '800', color: COLORS.primary, flexShrink: 1 },
  liveStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  liveStatusPillText: { fontSize: 9.5, fontWeight: '800' },

  docAttachmentRow: { marginTop: 4 },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
  },
  attachBtnText: { fontSize: 10.5, fontWeight: '700', color: COLORS.primary },
  fileAttachedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  fileNameText: { flex: 1, fontSize: 11, color: '#166534', fontWeight: '600', marginHorizontal: 6 },
  removeFileBtn: { padding: 4 },

  /* ── RC PHOTOS IN FORM ── */
  rcUploadBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 10,
    alignItems: 'center',
  },
  rcUploadLabel: { fontSize: 10.5, fontWeight: '800', color: COLORS.primary, marginBottom: 8 },
  rcPickBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 4 },
  rcPickBtnText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  rcPreviewContainer: { alignItems: 'center', gap: 6, width: '100%' },
  rcThumbnail: { width: '100%', height: 70, borderRadius: 4 },
  rcFileName: { fontSize: 9.5, color: '#64748b' },
  rcRemoveBtn: { paddingVertical: 2, paddingHorizontal: 6, backgroundColor: '#fee2e2', borderRadius: 4 },
  rcRemoveBtnText: { fontSize: 9, color: '#dc2626', fontWeight: 'bold' },

  submitBtn: {
    backgroundColor: COLORS.primary,
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    ...SHADOWS.medium,
  },
  submitBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },

  /* ── VEHICLE DETAILS SCREEN ── */
  detailVehicleNum: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  detailVehicleSub: { fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 2 },
  detailInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  detailGridCol: { width: '30%', minWidth: 90 },
  detailLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },
  detailValue: { fontSize: 12, fontWeight: '700', color: COLORS.textDark, marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },

  documentsSectionHeader: { marginBottom: 12 },
  docDetailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 12,
    marginBottom: 10,
  },
  docDetailCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docDetailTitle: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  datesDisplayGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateBox: { flex: 1, paddingHorizontal: 8, alignItems: 'center' },
  dateBoxLabel: { fontSize: 8.5, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 },
  dateBoxValue: { fontSize: 11.5, fontWeight: '700', color: COLORS.textDark, marginTop: 2 },
  dateBoxDays: { fontSize: 8.5, fontWeight: '700', marginTop: 1 },

  attachedFileDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 8,
    gap: 6,
  },
  attachedFileName: { flex: 1, fontSize: 11, color: '#1e40af', fontWeight: '600' },
  inlineThumb: { width: 30, height: 30, borderRadius: 4 },

  docDetailActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end', alignItems: 'center' },
  docActionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  docActionBtnPrimaryText: { fontSize: 10.5, fontWeight: '800', color: COLORS.primary },
  docActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  docActionBtnText: { fontSize: 10.5, fontWeight: '700', color: '#475569' },
  docActionBtnDanger: { padding: 6, borderRadius: 6, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5' },

  rcDetailBox: { backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: COLORS.outlineVariant, padding: 10 },
  rcDetailLabel: { fontSize: 11, fontWeight: '800', color: COLORS.primary, marginBottom: 8 },
  rcDetailFileBox: { alignItems: 'center', gap: 6 },
  rcPreviewImg: { width: '100%', height: 90, borderRadius: 6 },
  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  viewDocBtnText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  rcUploadEmptyBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 4 },
  rcUploadEmptyText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  docPreview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 8, marginTop: 10 },

  /* ── EDIT DOC METADATA MODAL ── */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'center', padding: 20 },
  editDocModalCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 18, ...SHADOWS.medium },
  editDocModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  editDocModalTitle: { fontSize: 13, fontWeight: '900', color: COLORS.primary },
  modalStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalStatusBannerLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  modalActionBtn: { flex: 1, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalActionBtnText: { fontSize: 12, fontWeight: '800' },
});
