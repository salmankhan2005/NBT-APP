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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { OCRResultModal, OCRResult } from '../components/OCRResultModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { db, ManagedVehicle, ManagedVehicleStatus, VehicleDocument, DocType, VehicleDocumentHistory, DocumentExpiryStatus, Trip } from '../db/database';

type VehicleFilter = 'ALL' | 'AVAILABLE' | 'ON TRIP' | 'UNDER MAINTENANCE' | 'INACTIVE';
type DocumentFilter = 'ALL' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING';
type VehicleWheelType = '6 Wheel' | '10 Wheel' | '12 Wheel' | '14 Wheel' | '16 Wheel';
type VehicleMake = 'Ashok Leyland' | 'Tata' | 'Eicher';
type PendingDocumentSelection = {
  uri: string;
  name: string;
  mimeType: string;
  extractedDocNumber?: string;
  extractedIssueDate?: string;
  extractedExpiryDate?: string;
};

const DOC_TYPES: Array<{ key: DocType; label: string }> = [
  { key: 'RC_FRONT', label: 'RC Photo – Front' },
  { key: 'RC_BACK', label: 'RC Photo – Back' },
  { key: 'INSURANCE', label: 'Insurance Photo' },
  { key: 'POLLUTION', label: 'Pollution Certificate Photo' },
  { key: 'PERMIT', label: 'Permit Photo' },
  { key: 'FC', label: 'FC Certificate Photo' },
];

export default function VehiclesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 880;
  const numColumns = isDesktop ? 2 : 1;
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<ManagedVehicle[]>([]);
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>('ALL');
  const [documentFilter, setDocumentFilter] = useState<DocumentFilter>('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [docActionModalVisible, setDocActionModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<ManagedVehicle | null>(null);
  const [vehicleDocuments, setVehicleDocuments] = useState<VehicleDocument[]>([]);

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'VEHICLE' | 'DOCUMENT'; id: string; label?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeDoc, setActiveDoc] = useState<VehicleDocument | null>(null);
  const [activeDocVehicleId, setActiveDocVehicleId] = useState<string | null>(null);
  const [docMetaNumber, setDocMetaNumber] = useState('');
  const [docMetaIssueDate, setDocMetaIssueDate] = useState('');
  const [docMetaExpiryDate, setDocMetaExpiryDate] = useState('');
  const [docMetaSaving, setDocMetaSaving] = useState(false);
  const [selectedVehicleTrip, setSelectedVehicleTrip] = useState<Trip | null>(null);
  const [selectedVehicleTripImageError, setSelectedVehicleTripImageError] = useState(false);
  const [allVehicleDocuments, setAllVehicleDocuments] = useState<VehicleDocument[]>([]);
  const [creating, setCreating] = useState(false);

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleWheelType>('12 Wheel');
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

  const [uploadingDocType, setUploadingDocType] = useState<DocType | null>(null);
  const [docNumber, setDocNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<Record<DocType, PendingDocumentSelection | null>>({
    RC: null,
    RC_FRONT: null,
    RC_BACK: null,
    INSURANCE: null,
    POLLUTION: null,
    ROAD_TAX: null,
    FITNESS: null,
    PERMIT: null,
    FC: null,
    OTHER: null,
  });
  const [documentExpiryEdits, setDocumentExpiryEdits] = useState<Record<string, string>>({});
  const [documentExtractionState, setDocumentExtractionState] = useState<Record<string, { status: 'idle' | 'extracting' | 'done' | 'failed'; message: string }>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // OCR Processing States
  const [ocrResultModalVisible, setOcrResultModalVisible] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPendingDocType, setOcrPendingDocType] = useState<{ docType: DocType; vehicleId?: string } | null>(null);
  const [ocrPendingFileUri, setOcrPendingFileUri] = useState<string | null>(null);

  const showFeedback = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setFeedbackMessage({ text, type });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setFeedbackMessage(null), 2400);
    }
  }, []);

  /**
   * Process document with OCR to extract metadata
   */
  const processDocumentWithOCR = async (
    fileUri: string,
    docType: DocType,
    vehicleId?: string,
    expectedVehicleNumber?: string
  ) => {
    try {
      setOcrLoading(true);
      setOcrPendingDocType({ docType, vehicleId });
      setOcrPendingFileUri(fileUri);

      // Get API host
      const apiHost = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';

      // Read file and convert to base64
      let imageBase64 = '';
      
      if (fileUri.startsWith('file://')) {
        // File URI - read using fetch and convert to base64
        try {
          const response = await fetch(fileUri);
          const blob = await response.blob();
          const reader = new FileReader();
          
          imageBase64 = await new Promise((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              // Extract base64 part (remove data:image/...;base64, prefix)
              const base64 = result.split(',')[1] || result;
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn('Could not read file URI as base64:', e);
          throw new Error('Could not read image file');
        }
      } else if (fileUri.startsWith('data:')) {
        // Already base64 encoded
        imageBase64 = fileUri.split(',')[1] || fileUri;
      } else {
        // Assume it's a direct base64 string or URL
        imageBase64 = fileUri;
      }

      if (!imageBase64) {
        throw new Error('Could not encode image to base64');
      }

      // Send base64 image to backend for OCR processing
      const ocrResponse = await fetch(`${apiHost}/api/vehicles/process-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          docType,
          vehicleNumber: expectedVehicleNumber,
        }),
      });

      if (!ocrResponse.ok) {
        const errorData = await ocrResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `OCR processing failed: ${ocrResponse.statusText}`);
      }

      const ocrData = (await ocrResponse.json()) as any;

      // Display OCR result
      setOcrResult({
        documentType: ocrData.ocrResult?.documentType || 'UNKNOWN',
        detectedDocumentTypeConfidence: ocrData.ocrResult?.detectedDocumentTypeConfidence || 0,
        mismatchDetected: ocrData.ocrResult?.mismatchDetected || false,
        expectedType: docType,
        extractedData: ocrData.ocrResult?.extractedData || {},
        warnings: ocrData.ocrResult?.warnings || [],
        recommendations: ocrData.recommendations || [],
      });

      setOcrResultModalVisible(true);
      setOcrLoading(false);
    } catch (error: any) {
      console.error('OCR processing error:', error);
      showFeedback(`OCR processing failed: ${error.message || 'Please enter the details manually.'}`, 'error');
      setOcrLoading(false);
      setOcrResultModalVisible(false);
    }
  };

  /**
   * Handle OCR result confirmation
   */
  const handleOCRConfirm = async (expiryDate: string, extraData: Record<string, string>) => {
    try {
      if (!ocrPendingDocType) return;

      const { docType, vehicleId } = ocrPendingDocType;

      // If this is for adding a new document to existing vehicle
      if (vehicleId) {
        setDocMetaExpiryDate(expiryDate);
        setDocMetaNumber(extraData.documentNumber || '');
        setOcrResultModalVisible(false);
        return;
      }

      // If this is for creating a new vehicle
      setDocumentExpiryEdits((prev) => ({
        ...prev,
        [docType]: expiryDate,
      }));

      if (extraData.documentNumber) {
        // Update in pending documents
        setPendingDocuments((prev) => ({
          ...prev,
          [docType]: prev[docType]
            ? {
                ...prev[docType]!,
                extractedDocNumber: extraData.documentNumber,
                extractedExpiryDate: expiryDate,
              }
            : null,
        }));
      }

      showFeedback('Document information extracted and saved.', 'success');
      setOcrResultModalVisible(false);
    } catch (error) {
      console.error('OCR confirmation error:', error);
      showFeedback('Failed to save document information.', 'error');
    } finally {
      setOcrLoading(false);
      setOcrPendingDocType(null);
      setOcrPendingFileUri(null);
    }
  };

  const fetchVehicles = useCallback(async (showIndicator = false) => {
    if (showIndicator) setLoading(true);
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

  const getDocumentSummaryStatus = (docs: VehicleDocument[]) => {
    if (docs.length === 0) return 'MISSING';
    const statuses = docs.map((doc) => db.getDocumentExpiryStatus(doc.expiryDate).status);
    if (statuses.includes('EXPIRED')) return 'EXPIRED';
    if (statuses.includes('EXPIRING_IN_7_DAYS')) return 'EXPIRING_SOON';
    if (statuses.includes('EXPIRING_SOON')) return 'EXPIRING_SOON';
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

  const filteredVehicles = vehicles.filter((vehicle) => {
    const searchText = search.toLowerCase();
    const matchesSearch = !searchText || [
      vehicle.vehicleNumber,
      vehicle.vehicleType,
      vehicle.vehicleModel,
      vehicle.ownerName,
      vehicle.status,
    ].join(' ').toLowerCase().includes(searchText);
    const matchesVehicleFilter = vehicleFilter === 'ALL' || vehicle.status === vehicleFilter;
    const docs = allVehicleDocuments.filter((doc) => doc.vehicle_id === vehicle.vehicle_id);
    const docStatus = getDocumentSummaryStatus(docs);
    const matchesDocFilter = documentFilter === 'ALL' || docStatus === documentFilter;
    return matchesSearch && matchesVehicleFilter && matchesDocFilter;
  }).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  const fetchLatestVehicleTrip = async (vehicleNumber: string): Promise<Trip | null> => {
    try {
      const trips = await db.getTrips();
      const normalizedVehicleNumber = normalizeVehicleNumber(vehicleNumber);
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
    setVehicleType('12 Wheel');
    setWheelType('12 Wheel');
    setVehicleMake('Tata');
    setVehicleModel('');
    setOwnerName('');
    setOwnerPhone('');
    setRcNumber('');
    setChassisNumber('');
    setYearOfManufacture('');
    setStatus('AVAILABLE');
    setPendingDocuments({
      RC: null,
      RC_FRONT: null,
      RC_BACK: null,
      INSURANCE: null,
      POLLUTION: null,
      ROAD_TAX: null,
      FITNESS: null,
      PERMIT: null,
      FC: null,
      OTHER: null,
    });
    setDocumentExpiryEdits({});
    setDocumentExtractionState({});
  };

  const normalizeDateString = (token: string): string | undefined => {
    const cleaned = token.replace(/[^0-9]/g, '');
    if (/^[0-9]{8}$/.test(cleaned)) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6)}`;
    }
    const match1 = token.match(/^([0-9]{4})[-_\/\. ]([0-9]{2})[-_\/\. ]([0-9]{2})$/);
    if (match1) return `${match1[1]}-${match1[2]}-${match1[3]}`;
    const match2 = token.match(/^([0-9]{2})[-_\/\. ]([0-9]{2})[-_\/\. ]([0-9]{4})$/);
    if (match2) return `${match2[3]}-${match2[2]}-${match2[1]}`;
    return undefined;
  };

  const parseDatesFromFilename = (filename: string): string[] => {
    const normalized = filename.replace(/[^0-9\-_/\.]/g, ' ');
    const candidates = normalized.split(/\s+/).filter(Boolean);
    const dates: string[] = [];
    for (const token of candidates) {
      const parsed = normalizeDateString(token);
      if (parsed) dates.push(parsed);
    }
    return dates;
  };

  const extractDocumentMetadataFromFilename = (filename: string, docType: DocType) => {
    const docNumberPatterns: Array<RegExp> = [
      /(?:ins|insurance|insurance_no|policy)[-_ ]?(\d[\w-]*)/i,
      /(?:pollution|puc)[-_ ]?(\d[\w-]*)/i,
      /(?:permit)[-_ ]?(\d[\w-]*)/i,
      /(?:fc|fitness certificate)[-_ ]?(\d[\w-]*)/i,
      /(?:rc)[-_ ]?(\d[\w-]*)/i,
      /([A-Z]{2}\d{2}[A-Z]{2}\d{4})/i,
    ];

    const detectedDates = parseDatesFromFilename(filename);
    let issueDate: string | undefined;
    let expiryDate: string | undefined;
    if (detectedDates.length >= 2) {
      issueDate = detectedDates[0];
      expiryDate = detectedDates[detectedDates.length - 1];
    } else if (detectedDates.length === 1) {
      if (['INSURANCE', 'POLLUTION', 'PERMIT', 'FC'].includes(docType)) {
        expiryDate = detectedDates[0];
      } else {
        issueDate = detectedDates[0];
      }
    }

    let docNumber: string | undefined;
    const searchOrder = [...docNumberPatterns];
    for (const pattern of searchOrder) {
      const match = filename.match(pattern);
      if (match && match[1]) {
        docNumber = match[1].toUpperCase();
        break;
      }
    }

    if (!docNumber) {
      const basename = filename.replace(/\.[^.]+$/, '');
      const parts = basename.split(/[-_ ]+/).filter(Boolean);
      if (parts.length > 1) {
        docNumber = parts[parts.length - 1].toUpperCase();
      }
    }

    return {
      docNumber: docNumber || undefined,
      issueDate,
      expiryDate,
    };
  };

  const handlePickDocument = async (docType: DocType) => {
    try {
      setDocumentExtractionState((prev) => ({
        ...prev,
        [docType]: { status: 'extracting', message: 'Reading document...' },
      }));
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        setDocumentExtractionState((prev) => ({
          ...prev,
          [docType]: { status: 'idle', message: 'Document selection cancelled.' },
        }));
        return;
      }
      const file = result.assets?.[0];
      if (!file?.uri) {
        setDocumentExtractionState((prev) => ({
          ...prev,
          [docType]: { status: 'failed', message: 'Could not resolve selected file URI.' },
        }));
        return;
      }

      const filename = file.name || file.uri.split('/').pop() || `${docType}.pdf`;
      const extracted = extractDocumentMetadataFromFilename(filename, docType);
      
      setPendingDocuments((prev) => ({
        ...prev,
        [docType]: {
          uri: file.uri,
          name: filename,
          mimeType: file.mimeType || 'application/octet-stream',
          extractedDocNumber: extracted.docNumber,
          extractedIssueDate: extracted.issueDate,
          extractedExpiryDate: extracted.expiryDate,
        },
      }));

      // For image files, attempt OCR processing
      if (file.mimeType && file.mimeType.startsWith('image/')) {
        setDocumentExtractionState((prev) => ({
          ...prev,
          [docType]: { status: 'extracting', message: 'Processing with OCR...' },
        }));
        
        // Process with OCR
        await processDocumentWithOCR(file.uri, docType, undefined, vehicleNumber);
        return;
      }

      // For PDFs, fall back to filename extraction
      const labelMap: Record<DocType, string> = {
        INSURANCE: 'Insurance',
        POLLUTION: 'Pollution',
        PERMIT: 'Permit',
        FC: 'FC',
        RC: 'RC',
        RC_FRONT: 'RC Front',
        RC_BACK: 'RC Back',
        ROAD_TAX: 'Road Tax',
        FITNESS: 'Fitness',
        OTHER: 'Other',
      };

      if (extracted.expiryDate) {
        setDocumentExtractionState((prev) => ({
          ...prev,
          [docType]: { status: 'done', message: `Found expiry date from filename: ${extracted.expiryDate}` },
        }));
      } else if (['INSURANCE', 'POLLUTION', 'PERMIT', 'FC'].includes(docType)) {
        setDocumentExtractionState((prev) => ({
          ...prev,
          [docType]: { status: 'failed', message: 'No expiry date found; please enter manually.' },
        }));
      } else {
        setDocumentExtractionState((prev) => ({
          ...prev,
          [docType]: { status: 'done', message: `${labelMap[docType]} document selected successfully.` },
        }));
      }
      setDocumentExpiryEdits((prev) => ({ ...prev, [docType]: extracted.expiryDate ?? '' }));
    } catch (err) {
      console.error('handlePickDocument error:', err);
      setDocumentExtractionState((prev) => ({
        ...prev,
        [docType]: { status: 'failed', message: 'Unable to pick document.' },
      }));
      Alert.alert('Error', 'Unable to pick document.');
    }
  };

  const handleCreateVehicle = async () => {
    if (typeof window !== 'undefined') {
      (window as Window & { __saveVehicleCalled?: boolean; __saveVehicleDebug?: any }).__saveVehicleCalled = true;
      (window as Window & { __saveVehicleCalled?: boolean; __saveVehicleDebug?: any }).__saveVehicleDebug = { step: 'entered' };
    }
    const trimmedRcNumber = rcNumber.trim().toUpperCase();
    const trimmedVehicleNumber = vehicleNumber.trim() || trimmedRcNumber || `VEH-${Date.now().toString().slice(-6)}`;
    const trimmedOwnerName = ownerName.trim() || 'Unknown Owner';

    if (!trimmedRcNumber) {
      Alert.alert('Missing Fields', 'Please enter the RC number.');
      return;
    }
    if (!chassisNumber.trim() || chassisNumber.trim().length < 5) {
      Alert.alert('Invalid Chassis Number', 'Please enter a valid chassis number (at least 5 characters).');
      return;
    }
    setCreating(true);
    try {
      const res = await db.createManagedVehicle({
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
      });
      if (res.success) {
        const optimisticVehicle: ManagedVehicle = {
          vehicle_id: res.vehicle?.vehicle_id || `VEH-${Date.now()}`,
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setVehicles((prev) => [optimisticVehicle, ...prev]);

        const createdVehicleId = res.vehicle?.vehicle_id || optimisticVehicle.vehicle_id;
        if (createdVehicleId) {
          const selectedDocEntries = Object.entries(pendingDocuments) as Array<[DocType, PendingDocumentSelection | null]>;
          const expiryDateByDocType: Partial<Record<DocType, string>> = {};
          for (const [docType, selection] of selectedDocEntries) {
            if (!selection) continue;
            const expiryDate = selection.extractedExpiryDate || documentExpiryEdits[docType] || '';
            expiryDateByDocType[docType as DocType] = expiryDate;
            try {
              await db.addVehicleDocument({
                vehicle_id: createdVehicleId,
                docType,
                docLabel: DOC_TYPES.find((item) => item.key === docType)?.label || 'Document',
                docNumber: selection.extractedDocNumber || '',
                issueDate: selection.extractedIssueDate || '',
                expiryDate,
                fileUri: selection.uri,
                fileName: selection.name,
                fileType: selection.mimeType,
                uploadedBy: 'Admin',
              });
            } catch (docError) {
              console.error('Document save failed', docError);
            }
          }
          if (expiryDateByDocType.INSURANCE || expiryDateByDocType.POLLUTION || expiryDateByDocType.PERMIT || expiryDateByDocType.FC) {
            await db.updateManagedVehicle(createdVehicleId, {
              insuranceExpiryDate: expiryDateByDocType.INSURANCE || optimisticVehicle.insuranceExpiryDate,
              pollutionExpiryDate: expiryDateByDocType.POLLUTION || optimisticVehicle.pollutionExpiryDate,
              permitExpiryDate: expiryDateByDocType.PERMIT || optimisticVehicle.permitExpiryDate,
              fcExpiryDate: expiryDateByDocType.FC || optimisticVehicle.fcExpiryDate,
              rcFrontUrl: pendingDocuments.RC_FRONT ? pendingDocuments.RC_FRONT.uri : optimisticVehicle.rcFrontUrl,
              rcBackUrl: pendingDocuments.RC_BACK ? pendingDocuments.RC_BACK.uri : optimisticVehicle.rcBackUrl,
              insuranceUrl: pendingDocuments.INSURANCE ? pendingDocuments.INSURANCE.uri : optimisticVehicle.insuranceUrl,
              pollutionUrl: pendingDocuments.POLLUTION ? pendingDocuments.POLLUTION.uri : optimisticVehicle.pollutionUrl,
              permitUrl: pendingDocuments.PERMIT ? pendingDocuments.PERMIT.uri : optimisticVehicle.permitUrl,
              fcUrl: pendingDocuments.FC ? pendingDocuments.FC.uri : optimisticVehicle.fcUrl,
            });
          }
        }

        await fetchVehicles(false);
        resetForm();
        setModalVisible(false);
        showFeedback('Vehicle added successfully.', 'success');
      } else {
        showFeedback(res.error || 'Failed to save vehicle.', 'error');
      }
    } catch (e) {
      showFeedback('Failed to save vehicle.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const pickDocument = async (vehicleId: string, docType: DocType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file?.uri) return;

      // Open metadata modal pre-filled so user can enter expiry/number before saving
      setDocMetaNumber('');
      setDocMetaIssueDate('');
      setDocMetaExpiryDate('');
      setActiveDoc(null);
      setActiveDocVehicleId(vehicleId);

      const filename = file.name || file.uri.split('/').pop() || `${docType}.pdf`;
      const extracted = extractDocumentMetadataFromFilename(filename, docType);
      setDocMetaNumber(extracted.docNumber || '');
      setDocMetaIssueDate(extracted.issueDate || '');
      setDocMetaExpiryDate(extracted.expiryDate || '');
      setUploadingDocType(docType);
      setUploading(true);
      const saved = await db.addVehicleDocument({
        vehicle_id: vehicleId,
        docType,
        docLabel: DOC_TYPES.find((item) => item.key === docType)?.label || 'Document',
        docNumber: extracted.docNumber || '',
        issueDate: extracted.issueDate || '',
        expiryDate: extracted.expiryDate || '',
        fileUri: file.uri,
        fileName: filename,
        fileType: file.mimeType || 'application/octet-stream',
        uploadedBy: 'Admin',
      });
      if (saved.success) {
        const [managedVehicles, documents] = await Promise.all([
          db.getManagedVehicles(),
          db.getAllVehicleDocuments(),
        ]);
        setVehicles(managedVehicles);
        setAllVehicleDocuments(documents);
        const freshDocs = await db.getAllDocumentsForVehicle(vehicleId);
        setVehicleDocuments(freshDocs);
        showFeedback('Document uploaded. Use UPDATE to add expiry/number.', 'success');
        // Open metadata modal on the newly saved doc so user can fill in details
        if (saved.doc) {
          openDocActions(saved.doc, vehicleId);
        }
      } else {
        Alert.alert('Error', saved.error || 'Failed to upload document.');
      }
    } catch {
      Alert.alert('Error', 'Unable to pick document.');
    } finally {
      setUploading(false);
      setUploadingDocType(null);
    }
  };

  const handleViewDocument = async (uri: string) => {
    if (!uri) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        if (uri.startsWith('blob:') || uri.startsWith('data:')) {
          const anchor = document.createElement('a');
          anchor.href = uri;
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          return;
        }
        window.open(uri, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.warn('Unable to open document URL:', err, uri);
        Alert.alert('Unable to open document', 'This document cannot be opened directly from the browser. Please use a supported document type or upload it again.');
      }
    } else {
      Linking.openURL(uri);
    }
  };

  const handleTripImageError = () => {
    setSelectedVehicleTripImageError(true);
  };

  const openDocActions = (doc: VehicleDocument, vehicleId: string) => {
    setActiveDoc(doc);
    setActiveDocVehicleId(vehicleId);
    setDocMetaNumber(doc.docNumber || '');
    setDocMetaIssueDate(doc.issueDate || '');
    setDocMetaExpiryDate(doc.expiryDate || '');
    setDocActionModalVisible(true);
  };

  const handleSaveDocumentMetadata = async () => {
    if (!activeDoc || !activeDocVehicleId) return;
    setDocMetaSaving(true);
    try {
      const result = await db.replaceVehicleDocument(
        activeDoc.doc_id,
        {
          docNumber: docMetaNumber.trim(),
          issueDate: docMetaIssueDate.trim(),
          expiryDate: docMetaExpiryDate.trim(),
        },
        'Admin'
      );
      if (result.success) {
        // Sync expiry date back to vehicle record for expiry summary cards
        const expiryVal = docMetaExpiryDate.trim();
        if (expiryVal) {
          const expiryFieldMap: Partial<Record<DocType, string>> = {
            INSURANCE: 'insuranceExpiryDate',
            POLLUTION: 'pollutionExpiryDate',
            PERMIT: 'permitExpiryDate',
            FC: 'fcExpiryDate',
          };
          const field = expiryFieldMap[activeDoc.docType as DocType];
          if (field) {
            await db.updateManagedVehicle(activeDocVehicleId, { [field]: expiryVal });
          }
        }
        setDocActionModalVisible(false);
        const docs = await db.getAllDocumentsForVehicle(activeDocVehicleId);
        setVehicleDocuments(docs);
        await fetchVehicles(false);
        showFeedback('Document details updated.', 'success');
      } else {
        Alert.alert('Error', result.error || 'Unable to update document.');
      }
    } finally {
      setDocMetaSaving(false);
    }
  };

  const handleReplaceDocument = async (doc: VehicleDocument) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file?.uri) return;
      const saved = await db.replaceVehicleDocument(
        doc.doc_id,
        {
          fileUri: file.uri,
          fileName: file.name || `${doc.docType}.pdf`,
          fileType: file.mimeType || 'application/octet-stream',
        },
        'Admin'
      );
      if (saved.success) {
        const docs = await db.getAllDocumentsForVehicle(doc.vehicle_id);
        setVehicleDocuments(docs);
        Alert.alert('Replaced', 'Document file replaced successfully.');
      } else {
        Alert.alert('Error', saved.error || 'Unable to replace document.');
      }
    } catch {
      Alert.alert('Error', 'Unable to replace document.');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const doc = vehicleDocuments.find(d => d.doc_id === docId);
    setDeleteTarget({
      type: 'DOCUMENT',
      id: docId,
      label: doc ? `${doc.docLabel || doc.docType}` : `Document #${docId}`,
    });
    setDeleteModalVisible(true);
  };

  const handleDeleteVehicle = (vehicle_id: string) => {
    const v = vehicles.find(item => item.vehicle_id === vehicle_id);
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

  const getStatusColor = (status: ManagedVehicleStatus) => {
    switch (status) {
      case 'AVAILABLE': return '#16a34a';
      case 'ON TRIP': return '#2563eb';
      case 'UNDER MAINTENANCE': return '#d97706';
      default: return '#64748b';
    }
  };

  const getDocumentStatusBadge = (doc: VehicleDocument) => {
    const status = db.getDocumentExpiryStatus(doc.expiryDate).status;
    switch (status) {
      case 'VALID': return { label: 'VALID', color: '#16a34a' };
      case 'EXPIRING_SOON': return { label: 'EXPIRING SOON', color: '#d97706' };
      case 'EXPIRED': return { label: 'EXPIRED', color: '#dc2626' };
      case 'DATE_NOT_AVAILABLE': return { label: 'UNKNOWN', color: '#64748b' };
      default: return { label: 'NOT UPLOADED', color: '#64748b' };
    }
  };

  const renderVehicleItem = ({ item }: { item: ManagedVehicle }) => {
    const docs = allVehicleDocuments.filter((doc) => doc.vehicle_id === item.vehicle_id);
    const docStatus = getDocumentSummaryStatus(docs);
    const docLabel = docStatus === 'MISSING' ? 'Documents Missing' : docStatus === 'EXPIRING_SOON' ? 'Expiring Soon' : docStatus === 'EXPIRED' ? 'Expired' : 'All Documents Valid';
    return (
      <View style={[styles.vehicleCard, isDesktop && { flex: 1, marginHorizontal: 4 }]}>
        <TouchableOpacity onPress={() => openDetails(item)}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.vehicleNumber}>{item.vehicleNumber}</Text>
              {item.isPinned && (
                <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#f59e0b' }}>
                  <Text style={{ fontSize: 9, color: '#b45309', fontWeight: 'bold' }}>📌 PINNED</Text>
                </View>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}> 
              <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.ownerText}>{item.ownerName || 'Owner not set'}</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>MODEL</Text>
              <Text style={styles.metaValue}>{item.vehicleModel || '—'}</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>OWNER PHONE</Text>
              <Text style={styles.metaValue}>{item.ownerPhone || '—'}</Text>
            </View>
          </View>
          <View style={styles.expirySummaryRow}>
            <View style={styles.expirySummaryBox}>
              <Text style={styles.expirySummaryLabel}>FC</Text>
              <Text style={styles.expirySummaryValue}>{item.fcExpiryDate ? item.fcExpiryDate : '—'}</Text>
            </View>
            <View style={styles.expirySummaryBox}>
              <Text style={styles.expirySummaryLabel}>INS</Text>
              <Text style={styles.expirySummaryValue}>{item.insuranceExpiryDate ? item.insuranceExpiryDate : '—'}</Text>
            </View>
            <View style={styles.expirySummaryBox}>
              <Text style={styles.expirySummaryLabel}>POLL</Text>
              <Text style={styles.expirySummaryValue}>{item.pollutionExpiryDate ? item.pollutionExpiryDate : '—'}</Text>
            </View>
            <View style={styles.expirySummaryBox}>
              <Text style={styles.expirySummaryLabel}>PERMIT</Text>
              <Text style={styles.expirySummaryValue}>{item.permitExpiryDate ? item.permitExpiryDate : '—'}</Text>
            </View>
          </View>
          <View style={styles.docAlertRow}>
            <MaterialIcons name="warning-amber" size={14} color={docStatus === 'VALID' ? '#16a34a' : '#d97706'} />
            <Text style={styles.docAlertText}>{docLabel}</Text>
          </View>
        </TouchableOpacity>

        {/* ── CARD ACTION TOOLS (EDIT, PIN, DOWNLOAD, DELETE) ── */}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.outlineVariant, paddingTop: 8, marginTop: 8, justifyContent: 'space-around' }}>
          <TouchableOpacity onPress={() => openDetails(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
            <MaterialIcons name="edit" size={16} color={COLORS.primary} />
            <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: 'bold' }}>EDIT</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={async () => { await db.togglePinVehicle(item.vehicle_id); fetchVehicles(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
            <MaterialIcons name="push-pin" size={16} color={item.isPinned ? '#d97706' : COLORS.textMuted} />
            <Text style={{ fontSize: 11, color: item.isPinned ? '#d97706' : COLORS.textMuted, fontWeight: 'bold' }}>{item.isPinned ? 'UNPIN' : 'PIN'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { Alert.alert('Vehicle Passport', `Vehicle: ${item.vehicleNumber}\nRC: ${item.rcNumber || 'N/A'}\nMake/Model: ${item.vehicleMake || ''} ${item.vehicleModel || ''}\nStatus: ${item.status}`); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
            <MaterialIcons name="file-download" size={16} color={COLORS.secondary} />
            <Text style={{ fontSize: 11, color: COLORS.secondary, fontWeight: 'bold' }}>EXPORT</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleDeleteVehicle(item.vehicle_id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
            <MaterialIcons name="delete-outline" size={16} color="#dc2626" />
            <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: 'bold' }}>DELETE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleWheelTypeSelect = (value: VehicleWheelType) => {
    setWheelType(value);
    setVehicleType(value);
    setWheelTypeModalVisible(false);
  };

  const handleVehicleMakeSelect = (value: VehicleMake) => {
    setVehicleMake(value);
    setVehicleMakeModalVisible(false);
  };

  const handleChassisNumberChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 5);
    setChassisNumber(digitsOnly);
  };

  const renderWheelTypeDropdown = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>WHEEL TYPE</Text>
      <TouchableOpacity style={styles.dropdownInput} onPress={() => setWheelTypeModalVisible(true)}>
        <Text style={styles.dropdownInputText}>{wheelType}</Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
      <Modal transparent visible={wheelTypeModalVisible} animationType="fade" onRequestClose={() => setWheelTypeModalVisible(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setWheelTypeModalVisible(false)}>
          <View style={styles.dropdownSheet}>
            {(['6 Wheel', '10 Wheel', '12 Wheel', '14 Wheel', '16 Wheel'] as VehicleWheelType[]).map((option) => (
              <TouchableOpacity key={option} style={styles.dropdownOption} onPress={() => handleWheelTypeSelect(option)}>
                <Text style={styles.dropdownOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  const renderVehicleMakeDropdown = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>VEHICLE MAKE</Text>
      <TouchableOpacity style={styles.dropdownInput} onPress={() => setVehicleMakeModalVisible(true)}>
        <Text style={styles.dropdownInputText}>{vehicleMake}</Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
      <Modal transparent visible={vehicleMakeModalVisible} animationType="fade" onRequestClose={() => setVehicleMakeModalVisible(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setVehicleMakeModalVisible(false)}>
          <View style={styles.dropdownSheet}>
            {(['Ashok Leyland', 'Tata', 'Eicher', 'Bharat Benz'] as VehicleMake[]).map((option) => (
              <TouchableOpacity key={option} style={styles.dropdownOption} onPress={() => handleVehicleMakeSelect(option)}>
                <Text style={styles.dropdownOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  return (
    <View style={styles.container}>
      {feedbackMessage ? (
        <View style={[styles.feedbackBanner, feedbackMessage.type === 'error' ? styles.feedbackBannerError : styles.feedbackBannerSuccess]}>
          <Text style={styles.feedbackText}>{feedbackMessage.text}</Text>
        </View>
      ) : null}

      <View style={styles.headerBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barTitle}>VEHICLE MANAGEMENT</Text>
          <Text style={styles.barSubtitle}>Admin-managed fleet records and documents</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <MaterialIcons name="add" size={20} color="#ffffff" />
          <Text style={styles.addBtnText}>ADD NEW VEHICLE</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={18} color={COLORS.outline} />
          <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search vehicle, owner, status" placeholderTextColor={COLORS.outline} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll} contentContainerStyle={styles.pillRow}>
        {(['ALL', 'AVAILABLE', 'ON TRIP', 'UNDER MAINTENANCE', 'INACTIVE'] as VehicleFilter[]).map((option) => (
          <TouchableOpacity key={option} style={[styles.pill, vehicleFilter === option && styles.pillActive]} onPress={() => setVehicleFilter(option)}>
            <Text style={[styles.pillText, vehicleFilter === option && styles.pillTextActive]}>{option === 'ALL' ? 'All Vehicles' : option}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll} contentContainerStyle={styles.pillRow}>
        {(['ALL', 'VALID', 'EXPIRING_SOON', 'EXPIRED', 'MISSING'] as DocumentFilter[]).map((option) => (
          <TouchableOpacity key={option} style={[styles.pill, documentFilter === option && styles.pillActive]} onPress={() => setDocumentFilter(option)}>
            <Text style={[styles.pillText, documentFilter === option && styles.pillTextActive]}>{option === 'ALL' ? 'All Documents' : option.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centerBox}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Loading fleet records...</Text></View>
      ) : filteredVehicles.length === 0 ? (
        <View style={styles.centerBox}><MaterialIcons name="directions-bus" size={64} color={COLORS.outline} /><Text style={styles.emptyTitle}>No vehicles yet</Text><Text style={styles.emptyDesc}>Add the first vehicle to begin managing fleet documents and trip assignment.</Text></View>
      ) : (
        <FlatList data={filteredVehicles} renderItem={renderVehicleItem} keyExtractor={(item) => item.vehicle_id} numColumns={numColumns} columnWrapperStyle={isDesktop ? { justifyContent: 'space-between', marginBottom: 8 } : undefined} contentContainerStyle={styles.listContent} />
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}><MaterialIcons name="close" size={24} color={COLORS.primary} /></TouchableOpacity>
            <Text style={styles.modalTitle}>ADD NEW VEHICLE</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.formCard}>
              <View style={styles.inputGroup}><Text style={styles.label}>RC NUMBER *</Text><TextInput style={styles.formInput} value={rcNumber} onChangeText={(value) => setRcNumber(value.toUpperCase())} placeholder="TN38AB1234" autoCapitalize="characters" /></View>
              {renderWheelTypeDropdown()}
              <View style={styles.inputGroup}><Text style={styles.label}>CHASSIS NUMBER (LAST 5 DIGITS) *</Text><TextInput style={styles.formInput} value={chassisNumber} onChangeText={handleChassisNumberChange} placeholder="12345" keyboardType="number-pad" maxLength={5} /></View>
              {renderVehicleMakeDropdown()}
              <View style={styles.inputGroup}><Text style={styles.label}>VEHICLE MODEL</Text><TextInput style={styles.formInput} value={vehicleModel} onChangeText={(v) => setVehicleModel(v.toUpperCase())} placeholder="LPT 3118" /></View>
              <View style={styles.inputGroup}><Text style={styles.label}>YEAR OF MANUFACTURE</Text><TextInput style={styles.formInput} value={yearOfManufacture} onChangeText={setYearOfManufacture} placeholder="2022" /></View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>DOCUMENTS UPLOAD (OPTIONAL)</Text>
                {DOC_TYPES.map((docType) => {
                  const selection = pendingDocuments[docType.key];
                  const extractionState = documentExtractionState[docType.key];
                  const expiryValue = documentExpiryEdits[docType.key] || '';
                  const shouldShowExpiry = ['INSURANCE', 'POLLUTION', 'PERMIT', 'FC'].includes(docType.key);
                  return (
                    <View key={docType.key} style={styles.docUploadRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docUploadLabel}>{docType.label}</Text>
                        <Text style={styles.docUploadValue}>{selection ? selection.name : 'Not selected'}</Text>
                        {selection && (selection.extractedDocNumber || selection.extractedIssueDate) ? (
                          <View style={{ marginTop: 6 }}>
                            {selection.extractedDocNumber ? <Text style={styles.docUploadValue}>Detected Document #: {selection.extractedDocNumber}</Text> : null}
                            {selection.extractedIssueDate ? <Text style={styles.docUploadValue}>Detected Issue Date: {selection.extractedIssueDate}</Text> : null}
                          </View>
                        ) : null}
                        {shouldShowExpiry && selection ? (
                          <View style={{ marginTop: 6 }}>
                            <Text style={styles.docUploadValue}>{extractionState?.message || 'Expiry date could not be detected. Please enter manually.'}</Text>
                            {expiryValue ? (
                              <Text style={styles.docUploadValue}>Detected/Selected Expiry: {expiryValue}</Text>
                            ) : null}
                            <TextInput
                              style={[styles.formInput, { marginTop: 6, height: 36 }]}
                              value={expiryValue}
                              onChangeText={(value) => setDocumentExpiryEdits((prev) => ({ ...prev, [docType.key]: value }))}
                              placeholder="YYYY-MM-DD"
                            />
                          </View>
                        ) : null}
                      </View>
                      <TouchableOpacity style={styles.smallBtn} onPress={() => handlePickDocument(docType.key)}>
                        <Text style={styles.smallBtnText}>{selection ? 'CHANGE' : 'UPLOAD'}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
              <TouchableOpacity style={[styles.submitBtn, creating && { opacity: 0.6 }]} onPress={handleCreateVehicle} disabled={creating}>{creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>SAVE VEHICLE</Text>}</TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── UPDATE DOCUMENT METADATA MODAL ── */}
      <Modal visible={docActionModalVisible} animationType="fade" transparent onRequestClose={() => setDocActionModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>UPDATE DOCUMENT</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>DOCUMENT NUMBER</Text>
              <TextInput style={styles.formInput} value={docMetaNumber} onChangeText={setDocMetaNumber} placeholder="e.g. INS-2024-001" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ISSUE DATE (YYYY-MM-DD)</Text>
              <TextInput style={styles.formInput} value={docMetaIssueDate} onChangeText={setDocMetaIssueDate} placeholder="2024-01-01" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EXPIRY DATE (YYYY-MM-DD)</Text>
              <TextInput style={styles.formInput} value={docMetaExpiryDate} onChangeText={setDocMetaExpiryDate} placeholder="2025-12-31" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={[styles.submitBtn, { flex: 1, backgroundColor: COLORS.textMuted }]} onPress={() => setDocActionModalVisible(false)}>
                <Text style={styles.submitBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { flex: 1 }, docMetaSaving && { opacity: 0.6 }]} onPress={handleSaveDocumentMetadata} disabled={docMetaSaving}>
                {docMetaSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>SAVE</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={detailModalVisible} animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeBtn}><MaterialIcons name="arrow-back" size={24} color={COLORS.primary} /></TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedVehicle?.vehicleNumber || 'VEHICLE DETAILS'}</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedVehicle && (
              <>
                <View style={styles.formCard}><Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>{['vehicleNumber','vehicleType','wheelType','vehicleMake','vehicleModel','ownerName','ownerPhone','rcNumber','engineNumber','chassisNumber','yearOfManufacture','status'].map((field) => (<View key={field} style={styles.detailRow}><Text style={styles.detailLabel}>{field.replace(/([A-Z])/g, ' $1').toUpperCase()}</Text><Text style={styles.detailValue}>{selectedVehicle[field as keyof ManagedVehicle] as string}</Text></View>))}</View>
                {selectedVehicleTrip ? (
                  <View style={[styles.formCard, { borderColor: COLORS.secondary, borderWidth: 1 }]}> 
                    <Text style={styles.sectionTitle}>LATEST ODOMETER UPLOAD</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Driver</Text>
                      <Text style={styles.detailValue}>{selectedVehicleTrip.driverName || 'Unknown'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Trip ID</Text>
                      <Text style={styles.detailValue}>{selectedVehicleTrip.id}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Odometer Start</Text>
                      <Text style={styles.detailValue}>{selectedVehicleTrip.odometerStart ? `${selectedVehicleTrip.odometerStart} km` : 'N/A'}</Text>
                    </View>
                    {isImageUri(selectedVehicleTrip.odometerStartPhotoUri) && !selectedVehicleTripImageError ? (
                      <Image
                        source={{ uri: selectedVehicleTrip.odometerStartPhotoUri! }}
                        style={styles.docPreview}
                        resizeMode="cover"
                        onError={handleTripImageError}
                      />
                    ) : null}
                    {selectedVehicleTripImageError ? (
                      <Text style={styles.imageErrorText}>Unable to preview this image. Tap VIEW to open externally.</Text>
                    ) : null}
                    <TouchableOpacity style={[styles.uploadBtn, { marginTop: 10 }]} onPress={() => selectedVehicleTrip.odometerStartPhotoUri && handleViewDocument(selectedVehicleTrip.odometerStartPhotoUri)}>
                      <Text style={styles.uploadBtnText}>VIEW ODOMETER PHOTO</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.formCard, { borderColor: COLORS.outlineVariant, borderWidth: 1 }]}> 
                    <Text style={styles.sectionTitle}>LATEST ODOMETER UPLOAD</Text>
                    <Text style={styles.docMeta}>No driver odometer upload found for this vehicle yet.</Text>
                  </View>
                )}
                <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>VEHICLE DOCUMENTS</Text>
                {DOC_TYPES.map((docType) => {
                  const docs = vehicleDocuments.filter((doc) => doc.docType === docType.key);
                  const latest = docs[0];
                  const docStatus = latest ? getDocumentStatusBadge(latest) : null;

                  return (
                    <View key={docType.key} style={styles.docCard}>
                      <View style={styles.docCardHeader}>
                        <Text style={styles.docType}>{docType.label}</Text>
                        {docStatus ? (
                          <View style={[styles.docStatusBadge, { backgroundColor: `${docStatus.color}15` }]}>
                            <Text style={[styles.docStatusText, { color: docStatus.color }]}>{docStatus.label}</Text>
                          </View>
                        ) : null}
                      </View>

                      {latest ? (
                        <View style={styles.docCardInfo}>
                          <View style={styles.docRow}>
                            <Text style={styles.docLabel}>Document #</Text>
                            <Text style={styles.docDetail}>{latest.docNumber || '—'}</Text>
                          </View>
                          <View style={styles.docRow}>
                            <Text style={styles.docLabel}>Issue Date</Text>
                            <Text style={styles.docDetail}>{latest.issueDate || '—'}</Text>
                          </View>
                          <View style={styles.docRow}>
                            <Text style={styles.docLabel}>Expiry Date</Text>
                            <Text style={styles.docDetail}>{latest.expiryDate || '—'}</Text>
                          </View>
                          <View style={styles.docRow}>
                            <Text style={styles.docLabel}>File</Text>
                            <Text style={styles.docDetail}>{latest.fileName || 'Unknown'}</Text>
                          </View>
                          {isImageUri(latest.fileUri, latest.fileType) ? (
                            <Image
                              source={{ uri: latest.fileUri }}
                              style={styles.docPreview}
                              resizeMode="cover"
                            />
                          ) : null}
                        </View>
                      ) : (
                        <View style={styles.docCardInfo}>
                          <Text style={styles.docMeta}>This document is not uploaded yet.</Text>
                        </View>
                      )}

                      <View style={styles.docActionsRow}>
                        {latest ? (
                          <>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleViewDocument(latest.fileUri)}>
                              <Text style={styles.actionBtnText}>VIEW</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => openDocActions(latest, selectedVehicle.vehicle_id)}>
                              <Text style={styles.actionBtnText}>UPDATE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleReplaceDocument(latest)}>
                              <Text style={styles.actionBtnText}>REPLACE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteDocument(latest.doc_id)}>
                              <Text style={styles.actionBtnText}>DELETE</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity style={styles.uploadBtn} onPress={() => pickDocument(selectedVehicle.vehicle_id, docType.key)}>
                            <Text style={styles.uploadBtnText}>UPLOAD</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* OCR Result Modal */}
      <OCRResultModal
        visible={ocrResultModalVisible}
        result={ocrResult}
        loading={ocrLoading}
        onClose={() => {
          setOcrResultModalVisible(false);
          setOcrResult(null);
          setOcrPendingDocType(null);
          setOcrPendingFileUri(null);
          setOcrLoading(false);
        }}
        onConfirm={handleOCRConfirm}
      />

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
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.gutter, backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'ios' ? 12 : 8 },
  barTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  barSubtitle: { fontSize: 11, color: '#dbeafe', marginTop: 2 },
  feedbackBanner: { marginHorizontal: SPACING.gutter, marginTop: SPACING.gutter / 2, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  feedbackBannerSuccess: { backgroundColor: '#ecfdf3', borderColor: '#86efac' },
  feedbackBannerError: { backgroundColor: '#fef2f2', borderColor: '#fda4af' },
  feedbackText: { fontSize: 12, fontWeight: '700', color: COLORS.textDark },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, gap: 4 },
  addBtnText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  filterRow: { paddingHorizontal: SPACING.gutter, paddingTop: SPACING.gutter / 2, paddingBottom: 6 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.outlineVariant, borderRadius: 8, paddingHorizontal: 10, backgroundColor: '#ffffff', height: 44 },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 6 },
  pillScroll: { maxHeight: 44 },
  pillRow: { paddingHorizontal: SPACING.gutter, paddingVertical: 6, gap: 8 },
  pill: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.outlineVariant },
  pillActive: { backgroundColor: COLORS.primary },
  pillText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  pillTextActive: { color: '#ffffff' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { color: COLORS.textMuted, marginTop: 10, fontSize: 13, fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
  listContent: { padding: SPACING.gutter, paddingBottom: 96 },
  vehicleCard: { backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: COLORS.outlineVariant, padding: 14, marginBottom: 12, ...SHADOWS.light },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vehicleNumber: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  vehicleType: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
  ownerText: { fontSize: 12, color: COLORS.textDark, marginTop: 8, fontWeight: '700' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
  metaBlock: { flexGrow: 1, minWidth: '45%' },
  metaLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700', marginBottom: 2 },
  metaValue: { fontSize: 12, color: COLORS.textDark },
  expirySummaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  expirySummaryBox: { flexGrow: 1, minWidth: 70, backgroundColor: COLORS.surfaceContainerLow, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
  expirySummaryLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '800' },
  expirySummaryValue: { fontSize: 11, color: COLORS.textDark, marginTop: 2 },
  docAlertRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  docAlertText: { fontSize: 12, color: COLORS.textMuted },
  docPreview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: COLORS.outlineVariant, backgroundColor: COLORS.surfaceContainerLow },
  imageErrorText: { color: '#991b1b', fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant, paddingHorizontal: 16 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  modalContent: { padding: SPACING.gutter, paddingBottom: 48 },
  formCard: { backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: COLORS.outlineVariant, padding: 16, marginBottom: 10, ...SHADOWS.light },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: COLORS.primary, marginBottom: 10 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, marginBottom: 6, letterSpacing: 0.5 },
  formInput: { borderWidth: 1, borderColor: COLORS.outlineVariant, borderRadius: 6, height: 46, backgroundColor: COLORS.surfaceContainerLow, paddingHorizontal: 12, fontSize: 14, color: COLORS.textDark },
  dropdownInput: { borderWidth: 1, borderColor: COLORS.outlineVariant, borderRadius: 6, height: 46, backgroundColor: COLORS.surfaceContainerLow, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownInputText: { fontSize: 14, color: COLORS.textDark },
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'center', padding: SPACING.gutter },
  dropdownSheet: { backgroundColor: '#ffffff', borderRadius: 10, overflow: 'hidden' },
  dropdownOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant },
  dropdownOptionText: { fontSize: 14, color: COLORS.textDark },
  selectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerChip: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: COLORS.outlineVariant, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  pickerChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  pickerChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  pickerChipTextActive: { color: '#ffffff' },
  submitBtn: { backgroundColor: COLORS.secondary, height: 52, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  detailValue: { fontSize: 12, color: COLORS.textDark, flex: 1, textAlign: 'right' },
  docCard: { backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: COLORS.outlineVariant, padding: 16, marginBottom: 12, ...SHADOWS.light },
  docCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docCardInfo: { marginTop: 12 },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceContainerLow },
  docLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  docDetail: { fontSize: 12, color: COLORS.textDark, textAlign: 'right', flexShrink: 1, marginLeft: 12 },
  docType: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
  docValue: { fontSize: 12, color: COLORS.textDark, marginTop: 2 },
  docMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 8 },
  docActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.surfaceContainerLow, minWidth: 80, alignItems: 'center' },
  actionBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  uploadBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.secondary, minWidth: 100, alignItems: 'center' },
  uploadBtnText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
  docUploadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant },
  docUploadLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  docUploadValue: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  smallBtn: { backgroundColor: COLORS.surfaceContainerLow, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginTop: 2 },
  smallBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  docStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginTop: 6 },
  docStatusText: { fontSize: 10, fontWeight: '800' },
});
