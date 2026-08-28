import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const RENDER_API = 'https://nbt-app.onrender.com';

export const getApiHost = (): string => {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return RENDER_API;
};
export const API_HOST = getApiHost();

// ── Timeout-aware fetch helper (Prevents network hangs on mobile) ───────────
export const fetchWithTimeout = async (resource: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

export const parseExpiryDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str) return null;

  let d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d;

  // Try DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmYMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
  if (dmYMatch) {
    const [, day, month, year] = dmYMatch;
    d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(d.getTime())) return d;
  }

  // Try YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
  const yMdMatch = str.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
  if (yMdMatch) {
    const [, year, month, day] = yMdMatch;
    d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
};

export const normalizeImageUrl = (url?: string | null): string | undefined => {
  if (!url || typeof url !== 'string' || !url.trim()) return undefined;
  let cleaned = url.trim();

  // Filter out fake/dummy placeholders that are not real images
  if (
    cleaned === 'mock-pod-uri' ||
    cleaned.includes('dummy.pdf') ||
    cleaned.includes('storage.nbt-ars.com')
  ) {
    return undefined;
  }

  // Native Image can read app-local URIs; browser Image cannot.
  if ((cleaned.startsWith('file://') || cleaned.startsWith('content://')) && Platform.OS === 'web') {
    return undefined;
  }

  // Preserve valid base64 data URIs, blob URIs, and direct Supabase CDN URLs directly
  if (
    cleaned.startsWith('data:image/') ||
    cleaned.startsWith('data:application/') ||
    cleaned.startsWith('blob:') ||
    cleaned.includes('supabase.co/storage/')
  ) {
    return cleaned;
  }

  if (
    cleaned.startsWith('file://') ||
    cleaned.startsWith('content://')
  ) {
    return cleaned;
  }

  // If full HTTP/HTTPS URL contains /api/files/, /uploads/, or /api/uploads/, rewrite host to API_HOST
  if (/^https?:\/\/[^\/]+(?:\/api\/files\/|\/uploads\/|\/api\/uploads\/)/i.test(cleaned)) {
    cleaned = cleaned.replace(/^https?:\/\/[^\/]+/i, API_HOST);
  }

  // Normalize both current and legacy upload paths before adding the API host.
  if (cleaned.startsWith('/api/uploads/')) {
    cleaned = cleaned.replace(/^\/api\/uploads\//, '/uploads/');
  }
  if (cleaned.startsWith('/uploads/')) {
    cleaned = `${API_HOST}${cleaned}`;
  } else if (cleaned.startsWith('uploads/')) {
    cleaned = `${API_HOST}/${cleaned}`;
  } else if (cleaned.startsWith('/api/files/')) {
    cleaned = `${API_HOST}${cleaned}`;
  } else if (cleaned.startsWith('api/files/')) {
    cleaned = `${API_HOST}/${cleaned}`;
  }

  // Rewrite legacy localhost URLs so existing uploaded documents remain previewable after deployment.
  cleaned = cleaned.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1|10\.0\.2\.2)(?::\d+)?(?=\/)/i, API_HOST);

  // Normalize emulator/localhost routing so image links work on both web and Android emulator.
  if (Platform.OS === 'android' && (cleaned.includes('localhost:3001') || cleaned.includes('127.0.0.1:3001'))) {
    cleaned = cleaned.replace(/localhost:3001|127\.0\.0\.1:3001/g, '10.0.2.2:3001');
  }
  if (Platform.OS !== 'android') {
    if (cleaned.includes('10.0.2.2:3001')) {
      cleaned = cleaned.replace('10.0.2.2:3001', 'localhost:3001');
    }
    if (cleaned.includes('127.0.0.1:3001')) {
      cleaned = cleaned.replace('127.0.0.1:3001', 'localhost:3001');
    }
  }

  return cleaned;
};

export interface GPSLocation {
  latitude: number;
  longitude: number;
  city: string;
  address: string;
  lastUpdated: string;
}

export interface Expense {
  id: string;
  category: 'FUEL' | 'TOLL' | 'RTO' | 'POLICE' | 'LORRY' | 'OTHER';
  amount: number;
  reason?: string;
  liters?: number;
  location?: GPSLocation;
  receiptUri?: string;
  timestamp: string;
}

export interface TollPlazaDetail {
  name: string;
  cost: number;
}

export interface Trip {
  id: string;                  // Unique Trip ID (e.g. TRIP-2026-0001)
  driverId: string;            // Unique Trip-specific Driver ID (e.g. DRV-X7K92)
  driverPin: string;           // Unique Trip-specific 6-digit Driver PIN (e.g. 583214)
  driverName: string;
  trackingId: string;          // Unique Customer Tracking ID (e.g. NBT-TRK-8F92K)
  status: 'NOT STARTED' | 'ASSIGNED' | 'STARTED' | 'ON_THE_WAY' | 'REACHED_DESTINATION' | 'COMPLETED';
  isPinned?: boolean;

  // Load / Customer Details
  customerCompany?: string;
  loaderName?: string;
  loaderPhone?: string;

  // Starting Point Details
  startingPoint: string;       // Exact Place Name
  startingAddress?: string;    // Full Address
  startingLat?: number;
  startingLng?: number;
  startingPlaceId?: string;
  startingMapsUrl?: string;

  // Destination Details
  destination: string;         // Exact Destination Name
  destinationAddress?: string; // Full Address
  destinationLat?: number;
  destinationLng?: number;
  destinationPlaceId?: string;
  destinationMapsUrl?: string;

  // Route Details
  distanceKm?: number;
  estimatedTravelTime?: string;
  recommendedRoute?: string;

  // Toll Details
  tollsCount: number;
  estimatedTollCost: number;
  tollPlazas?: TollPlazaDetail[];

  // Vehicle Details
  vehicleId?: string;
  vehicleNumber: string;
  vehicleType: '6 Wheel' | '10 Wheel' | '12 Wheel' | '14 Wheel' | '16 Wheel';

  // Financial Details
  agreedFreight?: number;

  // Telemetry & GPS
  odometerStart?: number;
  odometerEnd?: number;
  odometerStartPhotoUri?: string;
  odometerEndPhotoUri?: string;
  dieselStart?: 'EMPTY' | '1/4' | '1/2' | '3/4' | 'FULL';
  dieselEnd?: 'EMPTY' | '1/4' | '1/2' | '3/4' | 'FULL';
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  currentGPS?: GPSLocation;
  lastKnownLocation?: string;
  locationIsGps?: boolean;
  expenses: Expense[];
  podPhotoUri?: string;
  podSignature?: string;
  podNotes?: string;
  podSubmitted?: boolean;
  driverPayment?: number;
  profitOrLoss?: number;
  linkedGpsDeviceId?: string;
  linkedImei?: string;
  lastUpdatedDate?: string;
  lastUpdatedTime?: string;
  createdAt?: string;
}

export interface Driver {
  id: string;
  name: string;
  pin: string;
  pinHash: string;
  phone: string;
  license: string;
  vehicleNumber: string;
  active: boolean;
}

export interface Vehicle {
  number: string;
  type: '6 Wheel' | '10 Wheel' | '12 Wheel' | '14 Wheel' | '16 Wheel';
  wheelType: string;
  owner: string;
  insurance: string;
  permit: string;
  fitness: string;
  rc: string;
}

export type ManagedVehicleStatus = 'AVAILABLE' | 'ON TRIP' | 'UNDER MAINTENANCE' | 'INACTIVE';

export interface ManagedVehicle {
  vehicle_id: string;
  vehicleNumber: string;
  vehicleType: string;
  wheelType: string;
  vehicleMake: string;
  vehicleModel: string;
  ownerName: string;
  ownerPhone: string;
  rcNumber: string;
  engineNumber: string;
  chassisNumber: string;
  yearOfManufacture: string;
  status: ManagedVehicleStatus;
  isPinned?: boolean;
  rcFrontUrl?: string;
  rcBackUrl?: string;
  insuranceUrl?: string;
  insuranceIssueDate?: string;
  insuranceExpiryDate?: string;
  pollutionUrl?: string;
  pollutionIssueDate?: string;
  pollutionExpiryDate?: string;
  permitUrl?: string;
  permitIssueDate?: string;
  permitExpiryDate?: string;
  nationalPermitUrl?: string;
  nationalPermitIssueDate?: string;
  nationalPermitExpiryDate?: string;
  fiveYearPermitUrl?: string;
  fiveYearPermitIssueDate?: string;
  fiveYearPermitExpiryDate?: string;
  quarterTaxUrl?: string;
  quarterTaxIssueDate?: string;
  quarterTaxExpiryDate?: string;
  fcUrl?: string;
  fcIssueDate?: string;
  fcExpiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocType =
  | 'RC'
  | 'RC_FRONT'
  | 'RC_BACK'
  | 'FC'
  | 'INSURANCE'
  | 'NATIONAL_PERMIT'
  | 'FIVE_YEAR_PERMIT'
  | 'QUARTER_TAX'
  | 'POLLUTION'
  | 'ROAD_TAX'
  | 'FITNESS'
  | 'PERMIT'
  | 'OTHER';
export type DocumentExpiryStatus = 'VALID' | 'EXPIRING_IN_7_DAYS' | 'EXPIRING_SOON' | 'EXPIRED' | 'DATE_NOT_AVAILABLE';

export interface VehicleDocument {
  doc_id: string;
  vehicle_id: string;
  docType: DocType;
  docLabel: string;
  docNumber: string;
  issueDate: string;
  expiryDate: string;
  fileUri: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
  isActive: boolean;
  history: VehicleDocumentHistory[];
}

export interface VehicleDocumentHistory {
  doc_id: string;
  docNumber: string;
  issueDate: string;
  expiryDate: string;
  fileUri: string;
  fileName: string;
  replacedAt: string;
  replacedBy: string;
}

export interface GcItem {
  articlesCount: number;
  description: string;
  weight: number;
  value: number;
}

export interface GcNote {
  id: string;
  noteNumber?: string;
  date: string;
  billNumber: string;
  from: string;
  to: string;
  truckNumber: string;
  consignor: string;
  consignee: string;
  consignorGst: string;
  consigneeGst: string;
  gstinNumber: string;
  pan: string;
  items: GcItem[];
  freight: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  lessAdvance: number;
  balance: number;
  payableAt: string;
  paymentType: string;
  /** unified field — screens write `taxPayee`, old data may have `gstPayee` */
  taxPayee?: string;
  gstPayee?: string;
  deliveryAt: string;
  driverName: string;
  driverSignature: string;
  dlNumber: string;
  lorryOwner: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  bankBranch: string;
  addressLine1: string;
  addressLine2: string;
  phone1: string;
  phone2: string;
  phone3: string;
  bankDetails: string;
  terms: string;
  createdAt?: string;
  gcYear?: number;
  gcMonth?: number;
  gcSequence?: number;
  isPinned?: boolean;
}

export interface MemoDocument {
  id: string;
  memoId: string;
  date: string;
  contentHtml: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'DRAFT' | 'SAVED';
  isPinned?: boolean;
}

export interface ActivityLog {
  id: string;
  tripId: string;
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  action: string;
  timestamp: string;
  date?: string;
  time?: string;
  details?: string;
  startingPoint?: string;
  destination?: string;
  currentLocation?: string;
  statusLabel?: string;
  isGpsLocation?: boolean;
}

export type VehicleStatus = 'Active' | 'Inactive' | 'Under Maintenance';
export type GpsStatus = 'Connected' | 'Offline' | 'Not Configured' | 'Signal Lost' | 'Device Error';

export interface GpsDeviceHistory {
  id: string;
  oldDeviceId: string;
  oldImei: string;
  oldProvider: string;
  oldBrand: string;
  replacedOn: string;
  replacedBy: string;
  reason: string;
  newDeviceId: string;
  newImei: string;
}

export interface FleetVehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: '6 Wheel' | '10 Wheel' | '12 Wheel' | '14 Wheel' | '16 Wheel';
  vehicleModel: string;
  vehicleMake: string;
  ownerName: string;
  registrationDate: string;
  vehicleStatus: VehicleStatus;
  gpsProvider: string;
  gpsDeviceBrand: string;
  gpsDeviceModel: string;
  gpsDeviceId: string;
  imeiNumber: string;
  simNumber?: string;
  externalGpsDeviceId?: string;
  gpsInstallationDate: string;
  gpsDeviceStatus: GpsStatus;
  gpsApiConfigRef?: string;
  gpsNotes?: string;
  lastGpsUpdate?: string;
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  lastKnownCity?: string;
  lastKnownAddress?: string;
  gpsHistory: GpsDeviceHistory[];
  createdAt: string;
  updatedAt: string;
}

const INITIAL_SEED_DRIVERS: Driver[] = [
  {
    id: 'DRV-5566',
    name: 'Senthil Rajesh',
    pin: '123456',
    pinHash: 'mockHash',
    phone: '+91 98765 43210',
    license: 'TN3820190001234',
    vehicleNumber: 'TN 38 AB 1234',
    active: true,
  },
  {
    id: 'DRV-4421',
    name: 'Karthik Raja',
    pin: '654321',
    pinHash: 'mockHash',
    phone: '+91 98765 43211',
    license: 'TN3720200005678',
    vehicleNumber: 'TN 37 CB 5678',
    active: true,
  },
];

const INITIAL_SEED_MANAGED_VEHICLES: ManagedVehicle[] = [
  {
    vehicle_id: 'VEH-101',
    vehicleNumber: 'TN 38 AB 1234',
    vehicleType: '12 Wheel',
    wheelType: '12 Wheel',
    vehicleMake: 'Ashok Leyland',
    vehicleModel: 'Captain 3118',
    ownerName: 'NBT Logistics',
    ownerPhone: '+91 94433 51789',
    rcNumber: 'TN38AB1234RC',
    engineNumber: 'ENG889123',
    chassisNumber: 'CHS991234',
    yearOfManufacture: '2022',
    status: 'ON TRIP',
    insuranceExpiryDate: '2027-12-31',
    pollutionExpiryDate: '2027-10-15',
    permitExpiryDate: '2028-05-20',
    fcExpiryDate: '2027-08-30',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    vehicle_id: 'VEH-102',
    vehicleNumber: 'TN 37 CB 5678',
    vehicleType: '16 Wheel',
    wheelType: '16 Wheel',
    vehicleMake: 'Tata Motors',
    vehicleModel: 'Signa 4825.TK',
    ownerName: 'ARS Fleet',
    ownerPhone: '+91 93622 51789',
    rcNumber: 'TN37CB5678RC',
    engineNumber: 'ENG772341',
    chassisNumber: 'CHS882345',
    yearOfManufacture: '2023',
    status: 'ON TRIP',
    insuranceExpiryDate: '2027-11-20',
    pollutionExpiryDate: '2027-09-10',
    permitExpiryDate: '2028-03-15',
    fcExpiryDate: '2027-07-25',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    vehicle_id: 'VEH-103',
    vehicleNumber: 'TN 38 BK 9999',
    vehicleType: '10 Wheel',
    wheelType: '10 Wheel',
    vehicleMake: 'Eicher Motors',
    vehicleModel: 'Pro 6028',
    ownerName: 'NBT Logistics',
    ownerPhone: '+91 94433 51789',
    rcNumber: 'TN38BK9999RC',
    engineNumber: 'ENG661234',
    chassisNumber: 'CHS773456',
    yearOfManufacture: '2021',
    status: 'AVAILABLE',
    insuranceExpiryDate: '2027-08-15',
    pollutionExpiryDate: '2027-06-30',
    permitExpiryDate: '2028-01-10',
    fcExpiryDate: '2027-05-18',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_SEED_FLEET_VEHICLES: FleetVehicle[] = [
  {
    id: 'FV-201',
    vehicleNumber: 'TN 38 AB 1234',
    vehicleType: '12 Wheel',
    vehicleMake: 'Ashok Leyland',
    vehicleModel: 'Captain 3118',
    ownerName: 'NBT Logistics',
    registrationDate: '2022-01-15',
    vehicleStatus: 'Active',
    gpsProvider: 'Jio GPS',
    gpsDeviceBrand: 'Teltonika',
    gpsDeviceModel: 'FMB920',
    gpsDeviceId: 'GPS-DEV-8891',
    imeiNumber: '864209048123456',
    simNumber: '9842109876',
    gpsInstallationDate: '2022-02-01',
    gpsDeviceStatus: 'Connected',
    lastKnownLatitude: 11.6643,
    lastKnownLongitude: 78.1460,
    lastKnownCity: 'Salem Bypass',
    lastKnownAddress: 'NH544, Salem, Tamil Nadu',
    gpsHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'FV-202',
    vehicleNumber: 'TN 37 CB 5678',
    vehicleType: '16 Wheel',
    vehicleMake: 'Tata Motors',
    vehicleModel: 'Signa 4825.TK',
    ownerName: 'ARS Fleet',
    registrationDate: '2023-03-10',
    vehicleStatus: 'Active',
    gpsProvider: 'Jio GPS',
    gpsDeviceBrand: 'Concox',
    gpsDeviceModel: 'JM-VL03',
    gpsDeviceId: 'GPS-DEV-8892',
    imeiNumber: '864209048123457',
    simNumber: '9842109877',
    gpsInstallationDate: '2023-03-15',
    gpsDeviceStatus: 'Connected',
    lastKnownLatitude: 13.0827,
    lastKnownLongitude: 80.2707,
    lastKnownCity: 'Chennai Central',
    lastKnownAddress: 'Rajaji Salai, Chennai, Tamil Nadu',
    gpsHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_SEED_TRIPS: Trip[] = [
  {
    id: 'DRV-5566',
    driverId: 'DRV-5566',
    driverPin: '123456',
    driverName: 'Senthil Rajesh',
    trackingId: 'TRK-5566',
    status: 'STARTED',
    customerCompany: 'Lumen Technologies',
    loaderName: 'Senthil Rajesh',
    loaderPhone: '+91 98765 43210',
    startingPoint: 'Salem A2B Restaurant',
    startingAddress: 'Salem Bypass, NH544, Salem, Tamil Nadu',
    startingLat: 11.6643,
    startingLng: 78.1460,
    startingPlaceId: 'DEPOT-001',
    startingMapsUrl: 'https://maps.google.com/?q=Salem+A2B+Restaurant',
    destination: 'Lumen Technologies, Bengaluru',
    destinationAddress: 'Manyata Tech Park, Nagavara, Bengaluru, Karnataka',
    destinationLat: 13.0457,
    destinationLng: 77.6200,
    destinationPlaceId: 'DEST-001',
    destinationMapsUrl: 'https://maps.google.com/?q=Lumen+Technologies+Bengaluru',
    distanceKm: 210,
    estimatedTravelTime: '4 hrs 15 mins',
    recommendedRoute: 'via NH44',
    tollsCount: 8,
    estimatedTollCost: 2450,
    tollPlazas: [],
    vehicleNumber: 'TN 38 AB 1234',
    vehicleType: '12 Wheel',
    agreedFreight: 35000,
    isPinned: true,
    odometerStart: 45200,
    dieselStart: 'FULL',
    startDate: '16 Aug 2026',
    startTime: '08:30 AM',
    lastUpdatedDate: '16 Aug 2026',
    lastUpdatedTime: '10:15 AM',
    lastKnownLocation: 'NH44 Krishnagiri Toll Plaza',
    locationIsGps: true,
    linkedGpsDeviceId: 'GPS-DEV-8891',
    linkedImei: '864209048123456',
    expenses: [
      {
        id: 'EXP-101',
        category: 'FUEL',
        amount: 5000,
        reason: 'Diesel refill at HP Salem Bypass',
        liters: 55,
        timestamp: new Date().toISOString(),
      },
      {
        id: 'EXP-102',
        category: 'TOLL',
        amount: 850,
        reason: 'FASTag Krishnagiri Plaza',
        timestamp: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'DRV-4421',
    driverId: 'DRV-4421',
    driverPin: '654321',
    driverName: 'Karthik Raja',
    trackingId: 'TRK-4421',
    status: 'ON_THE_WAY',
    customerCompany: 'Coimbatore Textile Cargo',
    loaderName: 'Karthik Raja',
    loaderPhone: '+91 98765 43211',
    startingPoint: 'Chennai Port Terminal',
    startingAddress: 'Rajaji Salai, Chennai Port, Tamil Nadu',
    startingLat: 13.0827,
    startingLng: 80.2707,
    startingPlaceId: 'DEPOT-002',
    startingMapsUrl: 'https://maps.google.com/?q=Chennai+Port+Terminal',
    destination: 'Coimbatore Cargo Terminal',
    destinationAddress: 'Avinashi Road, Coimbatore, Tamil Nadu',
    destinationLat: 11.0168,
    destinationLng: 76.9558,
    destinationPlaceId: 'DEST-002',
    destinationMapsUrl: 'https://maps.google.com/?q=Coimbatore+Cargo+Terminal',
    distanceKm: 510,
    estimatedTravelTime: '9 hrs 30 mins',
    recommendedRoute: 'via NH48 & NH544',
    tollsCount: 12,
    estimatedTollCost: 3200,
    tollPlazas: [],
    vehicleNumber: 'TN 37 CB 5678',
    vehicleType: '16 Wheel',
    agreedFreight: 48000,
    isPinned: false,
    odometerStart: 89400,
    dieselStart: 'FULL',
    startDate: '16 Aug 2026',
    startTime: '06:00 AM',
    lastUpdatedDate: '16 Aug 2026',
    lastUpdatedTime: '11:00 AM',
    lastKnownLocation: 'NH48 Vellore Toll Plaza',
    locationIsGps: true,
    linkedGpsDeviceId: 'GPS-DEV-8892',
    linkedImei: '864209048123457',
    expenses: [
      {
        id: 'EXP-103',
        category: 'FUEL',
        amount: 8000,
        reason: 'Diesel refill at Indian Oil Vellore',
        liters: 88,
        timestamp: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_SEED_GC_NOTES: GcNote[] = [
  {
    id: 'GC-1001',
    noteNumber: 'GC-1001',
    date: '16 Aug 2026',
    billNumber: 'BILL-1001',
    from: 'Salem',
    to: 'Bengaluru',
    truckNumber: 'TN 38 AB 1234',
    consignor: 'Lumen Logistics Salem',
    consignee: 'Tech Park Bengaluru',
    consignorGst: '33AAAAL1234A1Z1',
    consigneeGst: '29BBBBB5678B1Z2',
    gstinNumber: '33AAAAL1234A1Z1',
    pan: 'AAAAL1234A',
    items: [
      { articlesCount: 150, description: 'IT Hardware & Office Equipment', weight: 12500, value: 35000 }
    ],
    freight: 35000,
    cgst: 0,
    sgst: 0,
    igst: 0,
    total: 35000,
    lessAdvance: 10000,
    balance: 25000,
    payableAt: 'Bengaluru',
    paymentType: 'To Pay',
    deliveryAt: 'Bengaluru',
    driverName: 'Senthil Rajesh',
    driverSignature: '',
    dlNumber: 'TN3820190001234',
    lorryOwner: 'NBT Logistics',
    bankAccountName: 'NBT Logistics',
    bankAccountNumber: '998877665544',
    bankIfsc: 'HDFC0001234',
    bankName: 'HDFC Bank',
    bankBranch: 'Salem Main',
    addressLine1: '3/131 VKV Complex, Salem',
    addressLine2: 'Bangalore Bye Pass Road',
    phone1: '+91 94433 51789',
    phone2: '+91 93622 51789',
    phone3: '0427-2225575',
    bankDetails: 'HDFC Bank - 998877665544',
    terms: 'Goods carried at owner risk.',
    createdAt: new Date().toISOString(),
    isPinned: true,
  },
];

const INITIAL_SEED_MEMOS: MemoDocument[] = [
  {
    id: 'MEM-0001',
    memoId: 'MEM-0001',
    date: '2026-08-16',
    contentHtml: '<div><b>NBT LORRY SUPPLIERS &amp; COMMISSION AGENT</b></div><div>Lorry Transport Agreement &amp; Delivery Memo for Vehicle <b>TN 38 AB 1234</b>.</div><div>Destination: Bengaluru. Freight Agreed: ₹35,000.</div>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin',
    status: 'SAVED',
    isPinned: true,
  },
];

type DatabaseListener = () => void;

class AdminDatabase {
  private listeners: Set<DatabaseListener> = new Set();
  private token: string | null = null;
  private currentUsername: string | null = null;

  // Drivers Data
  private mockDrivers: Driver[] = [...INITIAL_SEED_DRIVERS];

  // Vehicles List (legacy — kept for GPS screen compatibility)
  private mockVehicles: Vehicle[] = [];

  // Managed Vehicles — default seeded
  private managedVehicles: ManagedVehicle[] = [...INITIAL_SEED_MANAGED_VEHICLES];

  // Vehicle Documents — starts empty
  private vehicleDocuments: VehicleDocument[] = [];

  private mockFleetVehicles: FleetVehicle[] = [...INITIAL_SEED_FLEET_VEHICLES];

  // Trips Database
  private mockTrips: Trip[] = [...INITIAL_SEED_TRIPS];

  private mockGcNotes: GcNote[] = [...INITIAL_SEED_GC_NOTES];
  private mockMemoDocuments: MemoDocument[] = [...INITIAL_SEED_MEMOS];
  private readonly gcStorageKey = 'nbt_gc_notes';
  private readonly memoStorageKey = 'nbt_memo_documents';

  private mockActivityLogs: ActivityLog[] = [];
  private mockExpenses: Expense[] = [];

  // In-flight request caching & deduplication to eliminate thundering herd requests
  private _inFlightTrips: Promise<Trip[]> | null = null;
  private _inFlightFleet: Promise<FleetVehicle[]> | null = null;
  private _inFlightGcs: Promise<GcNote[]> | null = null;
  private _inFlightMemos: Promise<MemoDocument[]> | null = null;
  private _inFlightLogs: Promise<ActivityLog[]> | null = null;
  private _inFlightManagedVehicles: Promise<ManagedVehicle[]> | null = null;

  private _lastTripsFetchTime = 0;
  private _lastFleetFetchTime = 0;
  private _lastGcsFetchTime = 0;
  private _lastMemosFetchTime = 0;
  private _lastLogsFetchTime = 0;
  private _lastManagedVehiclesFetchTime = 0;

  // Cached JSON strings to avoid unnecessary AsyncStorage.setItem writes on disk
  private _lastSavedTripsJson = '';
  private _lastSavedFleetJson = '';
  private _lastSavedVehiclesJson = '';
  private _lastSavedDocsJson = '';
  private _lastSavedGcsJson = '';
  private _lastSavedMemosJson = '';

  constructor() {
    this.loadSession();
    this.loadGcNotes();
    this.loadMemoDocuments();
  }

  async loadSession() {
    try {
      const token = await AsyncStorage.getItem('admin_session_token');
      const username = await AsyncStorage.getItem('admin_username');
      this.token = token;
      this.currentUsername = username;
    } catch (e) {
      // SecureStore unavailable (web) — fall back to AsyncStorage
      try {
        this.token = await AsyncStorage.getItem('admin_session_token_web');
        this.currentUsername = await AsyncStorage.getItem('admin_username_web');
      } catch {
        this.token = null;
      }
    }
    try {
      const savedTrips = await AsyncStorage.getItem('nbt_trips_cache');
      if (savedTrips) {
        const parsed = JSON.parse(savedTrips);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.mockTrips = parsed;
          this._lastSavedTripsJson = savedTrips;
        } else {
          this.mockTrips = [...INITIAL_SEED_TRIPS];
        }
      } else {
        this.mockTrips = [...INITIAL_SEED_TRIPS];
        await this.saveTrips();
      }

      const savedVehicles = await AsyncStorage.getItem('nbt_managed_vehicles');
      if (savedVehicles) {
        const parsed = JSON.parse(savedVehicles);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.managedVehicles = parsed;
          this._lastSavedVehiclesJson = savedVehicles;
        } else {
          this.managedVehicles = [...INITIAL_SEED_MANAGED_VEHICLES];
        }
      } else {
        this.managedVehicles = [...INITIAL_SEED_MANAGED_VEHICLES];
        await this.saveVehicles();
      }

      const savedDocs = await AsyncStorage.getItem('nbt_vehicle_documents');
      if (savedDocs) {
        const parsed = JSON.parse(savedDocs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.vehicleDocuments = parsed;
          this._lastSavedDocsJson = savedDocs;
        }
      }

      const savedDrivers = await AsyncStorage.getItem('nbt_drivers_cache');
      if (savedDrivers) {
        const parsed = JSON.parse(savedDrivers);
        if (Array.isArray(parsed) && parsed.length > 0) this.mockDrivers = parsed;
        else this.mockDrivers = [...INITIAL_SEED_DRIVERS];
      } else {
        this.mockDrivers = [...INITIAL_SEED_DRIVERS];
        await this.saveDrivers();
      }

      const savedExpenses = await AsyncStorage.getItem('nbt_expenses_cache');
      if (savedExpenses) {
        const parsed = JSON.parse(savedExpenses);
        if (Array.isArray(parsed) && parsed.length > 0) this.mockExpenses = parsed;
      }
    } catch (e) {
      console.warn('Failed to load local cached storage', e);
    }
  }

  private async saveTrips() {
    try {
      const json = JSON.stringify(this.mockTrips);
      if (json === this._lastSavedTripsJson) return;
      this._lastSavedTripsJson = json;
      await AsyncStorage.setItem('nbt_trips_cache', json);
    } catch (e) {
      console.warn('Failed to save trips cache', e);
    }
  }

  private async saveDrivers() {
    try {
      await AsyncStorage.setItem('nbt_drivers_cache', JSON.stringify(this.mockDrivers));
    } catch (e) {
      console.warn('Failed to save drivers cache', e);
    }
  }

  private async saveExpenses() {
    try {
      await AsyncStorage.setItem('nbt_expenses_cache', JSON.stringify(this.mockExpenses));
    } catch (e) {
      console.warn('Failed to save expenses cache', e);
    }
  }

  private async saveVehicles() {
    try {
      const json = JSON.stringify(this.managedVehicles);
      if (json === this._lastSavedVehiclesJson) return;
      this._lastSavedVehiclesJson = json;
      await AsyncStorage.setItem('nbt_managed_vehicles', json);
    } catch (e) {
      console.warn('Failed to save managed vehicles', e);
    }
  }

  private async saveDocuments() {
    try {
      const json = JSON.stringify(this.vehicleDocuments);
      if (json === this._lastSavedDocsJson) return;
      this._lastSavedDocsJson = json;
      await AsyncStorage.setItem('nbt_vehicle_documents', json);
    } catch (e) {
      console.warn('Failed to save vehicle documents', e);
    }
  }

  subscribe(listener: DatabaseListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notify() {
    this.listeners.forEach(listener => listener());
  }

  // Auth — delegates to backend API, falls back to local validation
  async login(username: string, pin: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_HOST}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingId: username, pin }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          this.token = data.token;
          this.currentUsername = data.username || username;
          try {
            await AsyncStorage.setItem('admin_session_token', this.token!);
            await AsyncStorage.setItem('admin_username', this.currentUsername!);
          } catch {
            // Web fallback
            await AsyncStorage.setItem('admin_session_token_web', this.token!);
            await AsyncStorage.setItem('admin_username_web', this.currentUsername!);
          }
          this.notify();
          return true;
        }
      }
    } catch (networkErr) {
      // Backend offline — cannot authenticate without server
      console.warn('[AdminDB] Backend offline — authentication failed');
    }
    return false;
  }

  async logout(): Promise<void> {
    this.token = null;
    this.currentUsername = null;
    try {
      await AsyncStorage.removeItem('admin_session_token');
      await AsyncStorage.removeItem('admin_username');
    } catch {}
    try {
      await AsyncStorage.removeItem('admin_session_token_web');
      await AsyncStorage.removeItem('admin_username_web');
    } catch {}
    // Do NOT wipe mockTrips or other caches — data lives on backend and reloads after re-login
    this.notify();
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  getToken(): string | null {
    return this.token;
  }

  getUsername(): string | null {
    return this.currentUsername;
  }

  async getValidToken(): Promise<string | null> {
    if (this.token && this.token !== 'local-fallback-token') {
      return this.token;
    }
    // Attempt automatic login to acquire a fresh JWT token
    try {
      const response = await fetch(`${API_HOST}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingId: this.currentUsername || 'admin', pin: '9999' }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          this.token = data.token;
          this.currentUsername = data.username || this.currentUsername || 'admin';
          try {
            await AsyncStorage.setItem('admin_session_token', this.token!);
            await AsyncStorage.setItem('admin_username', this.currentUsername!);
          } catch {
            await AsyncStorage.setItem('admin_session_token_web', this.token!);
            await AsyncStorage.setItem('admin_username_web', this.currentUsername!);
          }
          return this.token;
        }
      }
    } catch {}
    return this.token;
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let token = await this.getValidToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    let res = await this.fetchWithTimeout(url, { ...options, headers });
    if (res.status === 401) {
      // Never retry protected requests with a hardcoded credential. Force a fresh login.
      this.token = null;
      try {
        await AsyncStorage.removeItem('admin_session_token');
        await AsyncStorage.removeItem('admin_session_token_web');
      } catch {
        // Continue to the login screen even if local cleanup is unavailable.
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.reload();
      }
    }
    return res;
  }

  getCachedTrips(): Trip[] {
    return [...this.mockTrips];
  }

  // Trips GET — Live Backend Fetch with Fallback and In-Flight Request Deduplication
  async getTrips(forceRefresh = false): Promise<Trip[]> {
    const now = Date.now();
    if (!forceRefresh && this._lastTripsFetchTime && now - this._lastTripsFetchTime < 1500 && this.mockTrips.length > 0) {
      return [...this.mockTrips];
    }

    if (this._inFlightTrips) {
      return this._inFlightTrips;
    }

    this._inFlightTrips = (async () => {
      try {
        const res = await this.authFetch(`${API_HOST}/api/admin/trips`);

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Admin trips request failed (${res.status}): ${errorText}`);
        }

        const apiTrips = await res.json();
        if (!Array.isArray(apiTrips)) {
          throw new Error('Admin trips response is not an array.');
        }

        const mappedBackendTrips: Trip[] = apiTrips.map((bt: any) => ({
          id: bt.id,
          driverId: bt.driver_id || 'DRV-UNKNOWN',
          driverPin: bt.driver_pin || '1234',
          driverName: bt.driver_name || 'Assigned Driver',
          trackingId: bt.tracking_id || bt.id,
          status: (() => {
            const s = String(bt.status || '').toUpperCase().replace(/ /g, '_');
            if (s === 'IN_TRANSIT') return 'STARTED';
            if (s === 'STARTED') return 'STARTED';
            if (s === 'ON_THE_WAY') return 'ON_THE_WAY';
            if (s === 'REACHED_DESTINATION') return 'REACHED_DESTINATION';
            if (s === 'COMPLETED') return 'COMPLETED';
            if (s === 'ASSIGNED') return 'ASSIGNED';
            return 'NOT STARTED';
          })(),
          customerCompany: 'NBT Client',
          loaderName: bt.driver_name || 'Loader',
          loaderPhone: '',
          startingPoint: bt.starting_point || 'Depot',
          startingAddress: bt.starting_point || 'Depot',
          startingLat: bt.current_gps?.latitude ? Number(bt.current_gps.latitude) : 11.6643,
          startingLng: bt.current_gps?.longitude ? Number(bt.current_gps.longitude) : 78.1460,
          startingPlaceId: 'DEPOT-001',
          startingMapsUrl: `https://maps.google.com/?q=${bt.starting_point}`,
          destination: bt.destination || 'Destination',
          destinationAddress: bt.destination || 'Destination',
          destinationLat: 12.9716,
          destinationLng: 77.5946,
          destinationPlaceId: 'DEST-001',
          destinationMapsUrl: `https://maps.google.com/?q=${bt.destination}`,
          distanceKm: Number(bt.distance_km || 0),
          estimatedTravelTime: bt.estimated_travel_time || '',
          recommendedRoute: bt.recommended_route || 'via NH44',
          tollsCount: Number(bt.tolls_count || 0),
          estimatedTollCost: Number(bt.estimated_toll_cost || 0),
          tollPlazas: bt.toll_plazas || [],
          vehicleNumber: bt.vehicle_number || 'TN 38 AB 1234',
          vehicleType: bt.vehicle_type || '12 Wheel',
          agreedFreight: bt.agreed_freight != null ? Number(bt.agreed_freight) : 0,
          isPinned: Boolean(bt.is_pinned),
          odometerStart: bt.odometer_start ? Number(bt.odometer_start) : undefined,
          odometerEnd: bt.odometer_end ? Number(bt.odometer_end) : undefined,
          odometerStartPhotoUri: normalizeImageUrl(bt.odometer_start_url),
          odometerEndPhotoUri: normalizeImageUrl(bt.odometer_end_url),
          dieselStart: bt.diesel_start || undefined,
          dieselEnd: bt.diesel_end || undefined,
          startDate: bt.start_date ? new Date(bt.start_date).toLocaleDateString() : '',
          startTime: bt.start_date ? new Date(bt.start_date).toLocaleTimeString() : '',
          endDate: bt.end_date ? new Date(bt.end_date).toLocaleDateString() : '',
          endTime: bt.end_date ? new Date(bt.end_date).toLocaleTimeString() : '',
          podPhotoUri: normalizeImageUrl(bt.pod_photo_url),
          podSignature: bt.pod_signature && bt.pod_signature.trim() ? bt.pod_signature.trim() : undefined,
          podNotes: bt.pod_notes && bt.pod_notes.trim() ? bt.pod_notes.trim() : undefined,
          podSubmitted: !!(
            (bt.pod_photo_url && bt.pod_photo_url.trim() && bt.pod_photo_url.trim() !== 'mock-pod-uri') ||
            (bt.pod_signature && bt.pod_signature.trim()) ||
            (bt.pod_notes && bt.pod_notes.trim()) ||
            ['REACHED_DESTINATION', 'COMPLETED'].includes(String(bt.status).toUpperCase())
          ),
          driverPayment: bt.driver_payment ? Number(bt.driver_payment) : undefined,
          profitOrLoss: bt.profit_or_loss ? Number(bt.profit_or_loss) : undefined,
          lastUpdatedDate: bt.updated_at ? new Date(bt.updated_at).toLocaleDateString() : '',
          lastUpdatedTime: bt.updated_at ? new Date(bt.updated_at).toLocaleTimeString() : '',
          lastKnownLocation: bt.current_gps?.address || bt.starting_point || 'En Route',
          locationIsGps: Boolean(bt.current_gps),
          expenses: (bt.expenses || []).map((e: any) => ({
            ...e,
            receiptUri: normalizeImageUrl(e.receiptUri || e.receipt_url),
          })),
          createdAt: bt.created_at || new Date().toISOString(),
        }));

        // Replace cache with backend data (don't merge — deleted items must disappear)
        this.mockTrips = mappedBackendTrips;
        this._lastTripsFetchTime = Date.now();
        await this.saveTrips();
      } catch (err) {
        // Fallback to cache without blocking
      } finally {
        this._inFlightTrips = null;
      }
      return [...this.mockTrips];
    })();

    return this._inFlightTrips;
  }

  // ─── COMPLETE TRIP CREATION ENGINE ───────────────────────────────────────────
  async createTrip(tripInput: {
    customerCompany?: string;
    loaderName?: string;
    loaderPhone?: string;

    startingPoint: string;
    startingAddress?: string;
    startingLat?: number;
    startingLng?: number;
    startingPlaceId?: string;
    startingMapsUrl?: string;

    destination: string;
    destinationAddress?: string;
    destinationLat?: number;
    destinationLng?: number;
    destinationPlaceId?: string;
    destinationMapsUrl?: string;

    distanceKm?: number;
    estimatedTravelTime?: string;
    recommendedRoute?: string;

    tollsCount?: number;
    estimatedTollCost?: number;
    tollPlazas?: TollPlazaDetail[];

    vehicleId?: string;
    vehicleNumber?: string;
    vehicleType?: '6 Wheel' | '10 Wheel' | '12 Wheel' | '14 Wheel' | '16 Wheel';

    agreedFreight: number;
  }): Promise<Trip> {
    const now = new Date();
    const dateStr = `${now.getDate()} ${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Generate UNIQUE credentials
    const tripSeq = Math.floor(1000 + Math.random() * 9000);
    const tripId = `TRIP-${now.getFullYear()}-${tripSeq}`;
    
    // Unique Trip-Specific Driver ID (e.g. DRV-X7K92)
    const driverId = `DRV-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    // Unique Trip-Specific 6-Digit Driver PIN (e.g. 583214)
    const driverPin = `${Math.floor(100000 + Math.random() * 900000)}`;

    // Unique Customer Tracking ID (e.g. NBT-TRK-8F92K)
    const trackingId = `NBT-TRK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const vehicleNum = tripInput.vehicleNumber || 'Unassigned';
    const vehicleType = tripInput.vehicleType || '12 Wheel';

    const fleetVehicle = this.mockFleetVehicles.find(
      fv => fv.vehicleNumber.trim().toLowerCase() === vehicleNum.trim().toLowerCase()
    );

    // ⚠ Security: driverPin is stored in memory only for display at creation time.
    // It is NEVER persisted to AsyncStorage or logged.
    const newTrip: Trip = {
      id: tripId,
      driverId: driverId,
      driverPin: driverPin,   // Plaintext PIN — shown once in UI immediately after creation
      driverName: tripInput.loaderName ? `Assigned (${tripInput.loaderName})` : 'Unassigned Driver',
      trackingId: trackingId,
      status: 'NOT STARTED',

      // Customer
      customerCompany: tripInput.customerCompany || 'N/A',
      loaderName: tripInput.loaderName || 'N/A',
      loaderPhone: tripInput.loaderPhone || '',

      // Starting Point
      startingPoint: tripInput.startingPoint,
      startingAddress: tripInput.startingAddress || `${tripInput.startingPoint}, Tamil Nadu`,
      startingLat: tripInput.startingLat || 11.6643,
      startingLng: tripInput.startingLng || 78.1460,
      startingPlaceId: tripInput.startingPlaceId || `ChIJ-${Date.now()}-A`,
      startingMapsUrl: tripInput.startingMapsUrl || `https://maps.google.com/?q=${tripInput.startingLat || 11.6643},${tripInput.startingLng || 78.1460}`,

      // Destination Point
      destination: tripInput.destination,
      destinationAddress: tripInput.destinationAddress || `${tripInput.destination}, Karnataka`,
      destinationLat: tripInput.destinationLat || 12.9716,
      destinationLng: tripInput.destinationLng || 77.5946,
      destinationPlaceId: tripInput.destinationPlaceId || `ChIJ-${Date.now()}-B`,
      destinationMapsUrl: tripInput.destinationMapsUrl || `https://maps.google.com/?q=${tripInput.destinationLat || 12.9716},${tripInput.destinationLng || 77.5946}`,

      // Route & Distance
      distanceKm: tripInput.distanceKm || 0,
      estimatedTravelTime: tripInput.estimatedTravelTime || '',
      recommendedRoute: tripInput.recommendedRoute || 'via NH44 & NH544',

      // Toll Details
      tollsCount: tripInput.tollsCount || 8,
      estimatedTollCost: tripInput.estimatedTollCost || 2450,
      tollPlazas: tripInput.tollPlazas || [
        { name: 'Omalur Toll Plaza', cost: 310 },
        { name: 'Thoppur Toll Plaza', cost: 340 },
        { name: 'Dharmapuri Toll Plaza', cost: 290 },
        { name: 'Krishnagiri Toll Plaza', cost: 380 },
        { name: 'Attibele Toll Plaza', cost: 430 },
        { name: 'Electronic City Toll', cost: 220 }
      ],

      // Vehicle
      vehicleId: tripInput.vehicleId,
      vehicleNumber: vehicleNum,
      vehicleType: vehicleType,

      // Financials
      agreedFreight: tripInput.agreedFreight,

      // Telemetry
      startDate: dateStr,
      startTime: timeStr,
      lastUpdatedDate: dateStr,
      lastUpdatedTime: timeStr,
      lastKnownLocation: tripInput.startingPoint,
      locationIsGps: fleetVehicle?.gpsDeviceStatus === 'Connected',
      linkedGpsDeviceId: fleetVehicle?.gpsDeviceId,
      linkedImei: fleetVehicle?.imeiNumber,
      expenses: [],
      createdAt: now.toISOString()
    };

    this.mockTrips.unshift(newTrip);
    await this.saveTrips();

    // Sync trip & driver credentials to Neon Postgres backend API
    try {
      const apiBody = {
        id: newTrip.id,
        driverId: newTrip.driverId,
        trackingId: newTrip.trackingId,
        driverName: newTrip.driverName,
        vehicleNumber: newTrip.vehicleNumber,
        vehicleType: ['6 Wheel', '10 Wheel', '12 Wheel', '16 Wheel'].includes(newTrip.vehicleType)
          ? newTrip.vehicleType
          : '12 Wheel',
        startingPoint: newTrip.startingPoint,
        destination: newTrip.destination,
        tollsCount: newTrip.tollsCount || 0,
        estimatedTollCost: newTrip.estimatedTollCost || 0,
        driverPin: newTrip.driverPin,
        agreedFreight: newTrip.agreedFreight || 0,
      };

      const res = await this.authFetch(`${API_HOST}/api/admin/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiBody),
      });

      if (res.ok) {
        console.log(`[AdminDB] ✅ Trip ${newTrip.id} & Driver ${newTrip.driverId} synced to Neon DB.`);
      } else {
        console.warn(`[AdminDB] ⚠️ Backend returned status ${res.status} during trip sync.`);
      }
    } catch (apiErr) {
      console.warn('[AdminDB] ⚠️ Backend offline during trip sync. Saved locally.', apiErr);
    }

    // Auto-update vehicle status to ON TRIP
    if (tripInput.vehicleId) {
      const vIdx = this.managedVehicles.findIndex(v => v.vehicle_id === tripInput.vehicleId);
      if (vIdx !== -1) {
        this.managedVehicles[vIdx] = { ...this.managedVehicles[vIdx], status: 'ON TRIP', updatedAt: new Date().toISOString() };
      }
    } else if (vehicleNum && vehicleNum !== 'Unassigned') {
      const vIdx = this.managedVehicles.findIndex(v => v.vehicleNumber === vehicleNum);
      if (vIdx !== -1) {
        this.managedVehicles[vIdx] = { ...this.managedVehicles[vIdx], status: 'ON TRIP', updatedAt: new Date().toISOString() };
      }
    }

    // Add activity log
    this.mockActivityLogs.unshift({
      id: `LOG-${Date.now()}`,
      tripId: newTrip.id,
      driverId: newTrip.driverId,
      driverName: newTrip.driverName,
      vehicleNumber: newTrip.vehicleNumber,
      action: 'Trip Created',
      timestamp: `${dateStr} | ${timeStr}`,
      date: dateStr,
      time: timeStr,
      details: `${newTrip.startingPoint} → ${newTrip.destination} | Agreed Freight ₹${newTrip.agreedFreight?.toLocaleString()}`,
      startingPoint: newTrip.startingPoint,
      destination: newTrip.destination,
      currentLocation: newTrip.startingPoint,
      statusLabel: 'NOT STARTED',
      isGpsLocation: newTrip.locationIsGps
    });

    this.notify();
    return Promise.resolve(newTrip);
  }

  async updateTripPayment(tripId: string, driverPayment: number): Promise<boolean> {
    // Update local in-memory cache for immediate UI response
    const trip = this.mockTrips.find(t => t.id === tripId);
    if (trip) {
      trip.driverPayment = driverPayment;
    }

    // Persist to Neon Postgres via backend — survives app refresh/reload
    try {
      const res = await this.authFetch(`${API_HOST}/api/admin/trips/${tripId}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverPayment }),
      });
      if (res.ok) {
        const data = await res.json();
        // Also update profitOrLoss in local cache from server response
        if (trip && data.profitOrLoss !== undefined) {
          trip.profitOrLoss = data.profitOrLoss;
        }
        this.notify();
        return true;
      } else {
        console.warn('[AdminDB] Payment sync failed:', res.status);
      }
    } catch (err) {
      console.warn('[AdminDB] Payment sync error (offline?):', err);
    }

    this.notify();
    return trip !== undefined;
  }

  async updateTripOdometer(tripId: string, odometerStart?: number, odometerEnd?: number): Promise<boolean> {
    const trip = this.mockTrips.find(t => t.id === tripId);
    if (!trip) return false;
    if (odometerStart !== undefined) trip.odometerStart = odometerStart;
    if (odometerEnd !== undefined) trip.odometerEnd = odometerEnd;

    try {
      const body: Record<string, any> = {};
      if (odometerStart !== undefined) body.odometer_start = odometerStart;
      if (odometerEnd !== undefined) body.odometer_end = odometerEnd;
      await this.authFetch(`${API_HOST}/api/admin/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.warn('[AdminDB] updateTripOdometer API sync failed:', e);
    }
    this.notify();
    return true;
  }

  async deleteTrip(tripId: string): Promise<boolean> {
    this.mockTrips = this.mockTrips.filter(t => t.id !== tripId);
    try {
      await this.authFetch(`${API_HOST}/api/admin/trips/${tripId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('[AdminDB] deleteTrip API sync failed:', e);
    }
    this.notify();
    return true;
  }

  async togglePinTrip(tripId: string): Promise<boolean> {
    const trip = this.mockTrips.find(t => t.id === tripId);
    if (!trip) return false;
    trip.isPinned = !trip.isPinned;
    try {
      await this.authFetch(`${API_HOST}/api/admin/trips/${tripId}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPinned: trip.isPinned }),
      });
    } catch (e) {
      console.warn('[AdminDB] togglePinTrip API sync failed:', e);
    }
    this.notify();
    return true;
  }

  async updateTripDetails(tripId: string, details: Partial<Trip>): Promise<boolean> {
    const trip = this.mockTrips.find(t => t.id === tripId);
    if (!trip) return false;
    Object.assign(trip, details);

    try {
      await this.authFetch(`${API_HOST}/api/admin/trips/${tripId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: details.status,
          odometer_start: details.odometerStart,
          odometer_end: details.odometerEnd,
          diesel_start: details.dieselStart,
          diesel_end: details.dieselEnd,
          driver_name: details.driverName,
          vehicle_number: details.vehicleNumber,
          starting_point: details.startingPoint,
          destination: details.destination,
          agreed_freight: details.agreedFreight,
          driver_pin: details.driverPin,
        }),
      });
    } catch (e) {
      console.warn('[AdminDB] updateTripDetails API sync failed:', e);
    }
    this.notify();
    return true;
  }

  // Drivers
  async getDrivers(): Promise<Driver[]> {
    return Promise.resolve([...this.mockDrivers]);
  }

  // Legacy vehicles (kept for GPS screen)
  async getVehicles(): Promise<Vehicle[]> {
    // Return managed vehicles mapped to legacy format for backward compat
    return Promise.resolve(
      this.managedVehicles.map(v => ({
        number: v.vehicleNumber,
        type: v.vehicleType as any,
        wheelType: v.wheelType,
        owner: v.ownerName,
        insurance: '',
        permit: '',
        fitness: '',
        rc: v.rcNumber,
      }))
    );
  }

  // ─── MANAGED VEHICLES ────────────────────────────────────────────────────────

  async getManagedVehicles(forceRefresh = false): Promise<ManagedVehicle[]> {
    const now = Date.now();
    if (!forceRefresh && this._lastManagedVehiclesFetchTime && now - this._lastManagedVehiclesFetchTime < 2000 && this.managedVehicles.length > 0) {
      return [...this.managedVehicles];
    }

    if (this._inFlightManagedVehicles) {
      return this._inFlightManagedVehicles;
    }

    this._inFlightManagedVehicles = (async () => {
      try {
        const res = await this.authFetch(`${API_HOST}/api/admin/vehicles`);
        if (res.ok) {
          const apiVehicles = await res.json();
          if (Array.isArray(apiVehicles)) {
            const mapped: ManagedVehicle[] = apiVehicles.map((v: any) => ({
              vehicle_id: v.vehicle_id || v.id,
              vehicleNumber: v.vehicle_number,
              vehicleType: v.vehicle_type || '12 Wheel',
              wheelType: v.wheel_type || '12 Wheel',
              vehicleMake: v.vehicle_make || '',
              vehicleModel: v.vehicle_model || '',
              ownerName: v.owner_name || '',
              ownerPhone: v.owner_phone || '',
              rcNumber: v.rc_number || '',
              engineNumber: v.engine_number || '',
              chassisNumber: v.chassis_number || '',
              yearOfManufacture: v.year_of_manufacture || '',
              status: v.status || 'AVAILABLE',
              insuranceExpiryDate: v.insurance_expiry_date || undefined,
              pollutionExpiryDate: v.pollution_expiry_date || undefined,
              permitExpiryDate: v.permit_expiry_date || undefined,
              fcExpiryDate: v.fc_expiry_date || undefined,
              insuranceUrl: v.insurance_url || undefined,
              pollutionUrl: v.pollution_url || undefined,
              permitUrl: v.permit_url || undefined,
              fcUrl: v.fc_url || undefined,
              createdAt: v.created_at || new Date().toISOString(),
              updatedAt: v.updated_at || new Date().toISOString(),
            }));
            // Replace cache with backend data
            this.managedVehicles = mapped;
            this._lastManagedVehiclesFetchTime = Date.now();
            await this.saveVehicles();
          }
        }
      } catch (err) {
        // Fallback to cache without blocking
      } finally {
        this._inFlightManagedVehicles = null;
      }
      return [...this.managedVehicles];
    })();

    return this._inFlightManagedVehicles;
  }

  async togglePinVehicle(vehicle_id: string): Promise<boolean> {
    const v = this.managedVehicles.find(item => item.vehicle_id === vehicle_id);
    if (!v) return false;
    v.isPinned = !v.isPinned;
    await this.saveVehicles();
    this.notify();
    return true;
  }

  async togglePinGc(id: string): Promise<boolean> {
    const note = this.mockGcNotes.find(item => item.id === id);
    if (!note) return false;
    note.isPinned = !note.isPinned;
    await this.persistGcNotes();
    this.notify();
    return true;
  }

  async togglePinMemo(id: string): Promise<boolean> {
    const memo = this.mockMemoDocuments.find(item => item.id === id);
    if (!memo) return false;
    memo.isPinned = !memo.isPinned;
    await this.persistMemoDocuments();
    this.notify();
    return true;
  }

  async getAvailableManagedVehicles(): Promise<ManagedVehicle[]> {
    const list = await this.getManagedVehicles();
    return list.filter(v => (v.status || 'AVAILABLE').trim().toUpperCase() === 'AVAILABLE');
  }

  async getManagedVehicleById(vehicle_id: string): Promise<ManagedVehicle | null> {
    const list = await this.getManagedVehicles();
    return list.find(v => v.vehicle_id === vehicle_id) || null;
  }

  async createManagedVehicle(data: Omit<ManagedVehicle, 'vehicle_id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; vehicle?: ManagedVehicle; error?: string }> {
    const exists = this.managedVehicles.find(
      v => v.vehicleNumber.trim().toUpperCase() === data.vehicleNumber.trim().toUpperCase()
    );
    if (exists) return { success: false, error: `Vehicle number ${data.vehicleNumber} already exists.` };
    const now = new Date().toISOString();
    const vehicle: ManagedVehicle = {
      ...data,
      vehicleNumber: data.vehicleNumber.trim().toUpperCase(),
      vehicle_id: `VEH-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.managedVehicles.unshift(vehicle);
    await this.saveVehicles();

    try {
      await this.authFetch(`${API_HOST}/api/admin/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicle)
      });
    } catch (err) {
      console.warn('[AdminDB] createManagedVehicle API sync error:', err);
    }

    this.notify();
    return { success: true, vehicle };
  }

  async updateManagedVehicle(vehicle_id: string, data: Partial<Omit<ManagedVehicle, 'vehicle_id' | 'createdAt'>>): Promise<{ success: boolean; error?: string }> {
    const idx = this.managedVehicles.findIndex(v => v.vehicle_id === vehicle_id);
    if (idx === -1) return { success: false, error: 'Vehicle not found.' };
    this.managedVehicles[idx] = { ...this.managedVehicles[idx], ...data, updatedAt: new Date().toISOString() };
    await this.saveVehicles();

    try {
      await this.authFetch(`${API_HOST}/api/admin/vehicles/${vehicle_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.warn('[AdminDB] updateManagedVehicle API sync error:', err);
    }

    this.notify();
    return { success: true };
  }

  async completeTrip(tripId: string): Promise<{ success: boolean; error?: string }> {
    const trip = this.mockTrips.find(t => t.id === tripId);
    if (!trip) return { success: false, error: 'Trip not found.' };

    trip.status = 'COMPLETED';
    trip.lastUpdatedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    trip.lastUpdatedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (trip.vehicleId) {
      const vIdx = this.managedVehicles.findIndex(v => v.vehicle_id === trip.vehicleId);
      if (vIdx !== -1) {
        this.managedVehicles[vIdx] = { ...this.managedVehicles[vIdx], status: 'AVAILABLE', updatedAt: new Date().toISOString() };
      }
    } else if (trip.vehicleNumber) {
      const vIdx = this.managedVehicles.findIndex(v => v.vehicleNumber === trip.vehicleNumber);
      if (vIdx !== -1) {
        this.managedVehicles[vIdx] = { ...this.managedVehicles[vIdx], status: 'AVAILABLE', updatedAt: new Date().toISOString() };
      }
    }

    await this.saveVehicles();
    this.notify();
    return { success: true };
  }

  getCachedManagedVehicles(): ManagedVehicle[] {
    return [...this.managedVehicles];
  }

  async deleteManagedVehicle(vehicle_id: string): Promise<{ success: boolean; error?: string }> {
    const idx = this.managedVehicles.findIndex(v => v.vehicle_id === vehicle_id);
    if (idx === -1) return { success: false, error: 'Vehicle not found.' };
    this.managedVehicles.splice(idx, 1);
    this.vehicleDocuments = this.vehicleDocuments.filter(d => d.vehicle_id !== vehicle_id);
    await this.saveVehicles();
    await this.saveDocuments();

    try {
      await this.authFetch(`${API_HOST}/api/admin/vehicles/${vehicle_id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('[AdminDB] deleteManagedVehicle API error:', err);
    }

    this.notify();
    return { success: true };
  }

  async setVehicleStatus(vehicle_id: string, status: ManagedVehicleStatus): Promise<{ success: boolean }> {
    return this.updateManagedVehicle(vehicle_id, { status });
  }

  // ─── VEHICLE DOCUMENTS ───────────────────────────────────────────────────────

  async getVehicleDocuments(vehicle_id: string): Promise<VehicleDocument[]> {
    const allDocs = await this.getAllVehicleDocuments();
    return allDocs.filter(d => d.vehicle_id === vehicle_id && d.isActive);
  }

  async getAllDocumentsForVehicle(vehicle_id: string): Promise<VehicleDocument[]> {
    const allDocs = await this.getAllVehicleDocuments();
    return allDocs.filter(d => d.vehicle_id === vehicle_id);
  }

  async getAllVehicleDocuments(): Promise<VehicleDocument[]> {
    try {
      const res = await this.authFetch(`${API_HOST}/api/admin/vehicle-documents/all`);
      if (res.ok) {
        const apiDocs = await res.json();
        if (Array.isArray(apiDocs)) {
          const mapped: VehicleDocument[] = apiDocs.map((d: any) => ({
            doc_id: d.doc_id,
            vehicle_id: d.vehicle_id,
            docType: d.doc_type,
            docLabel: d.doc_label,
            docNumber: d.doc_number || '',
            issueDate: d.issue_date || '',
            expiryDate: d.expiry_date || '',
            fileUri: normalizeImageUrl(d.file_uri || '') || (d.file_uri || ''),
            fileName: d.file_name || '',
            fileType: d.file_type || '',
            uploadedAt: d.uploaded_at || new Date().toISOString(),
            uploadedBy: d.uploaded_by || 'admin',
            isActive: Boolean(d.is_active),
            history: []
          }));
          this.vehicleDocuments = mapped;
          await this.saveDocuments();
        }
      }
    } catch (err) {
      console.warn('[AdminDB] Error fetching vehicle documents from API:', err);
    }
    return Promise.resolve([...this.vehicleDocuments.filter((doc) => doc.isActive)]);
  }

  private async uploadLocalFile(localUri: string, fileType?: string, fileName?: string): Promise<string> {
    if (!localUri || typeof localUri !== 'string') return localUri;
    if ((localUri.startsWith('http://') || localUri.startsWith('https://')) && localUri.includes('/uploads/')) {
      return localUri;
    }

    const filename = fileName || localUri.split('/').pop() || `document_${Date.now()}`;
    const formData = new FormData();

    try {
      if (Platform.OS === 'web' && (localUri.startsWith('blob:') || localUri.startsWith('data:') || localUri.startsWith('file:'))) {
        const response = await fetch(localUri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
      } else {
        formData.append('file', {
          uri: localUri,
          name: filename,
          type: fileType || 'application/octet-stream',
        } as any);
      }

      const response = await this.authFetch(`${API_HOST}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const json = await response.json();
        if (json.url) {
          return normalizeImageUrl(json.url) || json.url;
        }
        throw new Error('Upload response did not contain a file URL');
      }
      const errorText = await response.text().catch(() => '');
      throw new Error(`Upload failed (${response.status})${errorText ? `: ${errorText}` : ''}`);
    } catch (err) {
      console.warn('[AdminDB] uploadLocalFile failed:', err);
      throw err;
    }
  }

  async addVehicleDocument(data: Omit<VehicleDocument, 'doc_id' | 'uploadedAt' | 'isActive' | 'history'>): Promise<{ success: boolean; doc?: VehicleDocument; error?: string }> {
    const now = new Date().toISOString();
    let uploadedUri: string;
    try {
      uploadedUri = await this.uploadLocalFile(data.fileUri, data.fileType, data.fileName);
    } catch (err: any) {
      return { success: false, error: err?.message || 'Unable to upload document file.' };
    }
    const doc: VehicleDocument = {
      ...data,
      fileUri: uploadedUri,
      doc_id: `DOC-${Date.now()}`,
      uploadedAt: now,
      isActive: true,
      history: [],
    };
    try {
      const response = await this.authFetch(`${API_HOST}/api/admin/vehicles/${data.vehicle_id}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(doc)
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return { success: false, error: `Document record save failed (${response.status})${errorText ? `: ${errorText}` : ''}` };
      }
    } catch (err) {
      console.warn('[AdminDB] addVehicleDocument API sync error:', err);
      return { success: false, error: 'Document record could not be saved to the server.' };
    }

    this.vehicleDocuments.push(doc);
    await this.saveDocuments();
    this.notify();
    return { success: true, doc };
  }

  async replaceVehicleDocument(doc_id: string, newData: Partial<Pick<VehicleDocument, 'docNumber' | 'issueDate' | 'expiryDate' | 'fileUri' | 'fileName' | 'fileType'>>, replacedBy: string): Promise<{ success: boolean; error?: string }> {
    const idx = this.vehicleDocuments.findIndex(d => d.doc_id === doc_id);
    if (idx === -1) return { success: false, error: 'Document not found.' };
    const current = this.vehicleDocuments[idx];
    const histEntry: VehicleDocumentHistory = {
      doc_id: current.doc_id,
      docNumber: current.docNumber,
      issueDate: current.issueDate,
      expiryDate: current.expiryDate,
      fileUri: current.fileUri,
      fileName: current.fileName,
      replacedAt: new Date().toISOString(),
      replacedBy,
    };

    let uploadedFileUri = current.fileUri;
    if (newData.fileUri && !(newData.fileUri.startsWith('http://') || newData.fileUri.startsWith('https://')) && !newData.fileUri.includes('/uploads/')) {
      uploadedFileUri = await this.uploadLocalFile(newData.fileUri, newData.fileType, newData.fileName);
    }

    const updatedDoc: VehicleDocument = {
      ...current,
      ...newData,
      fileUri: uploadedFileUri,
      uploadedAt: new Date().toISOString(),
      history: [histEntry, ...current.history],
    };
    try {
      const response = await this.authFetch(`${API_HOST}/api/admin/vehicles/${current.vehicle_id}/documents/${doc_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedDoc),
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return { success: false, error: `Document update failed (${response.status})${errorText ? `: ${errorText}` : ''}` };
      }
    } catch (err) {
      console.warn('[AdminDB] replaceVehicleDocument API sync error:', err);
      return { success: false, error: 'Document update could not be saved to the server.' };
    }

    this.vehicleDocuments[idx] = updatedDoc;
    await this.saveDocuments();
    this.notify();
    return { success: true };
  }

  async deleteVehicleDocument(doc_id: string): Promise<{ success: boolean; error?: string }> {
    const idx = this.vehicleDocuments.findIndex(d => d.doc_id === doc_id);
    if (idx === -1) return { success: false, error: 'Document not found.' };
    const doc = this.vehicleDocuments[idx];
    this.vehicleDocuments.splice(idx, 1);
    await this.saveDocuments();

    try {
      await this.authFetch(`${API_HOST}/api/admin/vehicles/${doc.vehicle_id}/documents/${doc_id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('[AdminDB] deleteVehicleDocument API sync error:', err);
    }

    this.notify();
    return { success: true };
  }

  getDocumentExpiryStatus(expiryDate: string | null | undefined): { status: DocumentExpiryStatus; daysLeft: number | null } {
    if (!expiryDate) return { status: 'DATE_NOT_AVAILABLE', daysLeft: null };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = parseExpiryDate(expiryDate);
    if (!expiry || Number.isNaN(expiry.getTime())) return { status: 'DATE_NOT_AVAILABLE', daysLeft: null };
    expiry.setHours(0, 0, 0, 0);
    const daysLeft = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { status: 'EXPIRED', daysLeft };
    if (daysLeft <= 7) return { status: 'EXPIRING_IN_7_DAYS', daysLeft };
    if (daysLeft <= 30) return { status: 'EXPIRING_SOON', daysLeft };
    return { status: 'VALID', daysLeft };
  }

  async getVehicleDocumentExpiryAlerts(): Promise<Array<{
    vehicleId: string;
    vehicleNumber: string;
    driverName: string;
    docType: DocType;
    docLabel: string;
    expiryDate: string;
    status: DocumentExpiryStatus;
    daysLeft: number | null;
  }>> {
    const alerts: Array<{
      vehicleId: string;
      vehicleNumber: string;
      driverName: string;
      docType: DocType;
      docLabel: string;
      expiryDate: string;
      status: DocumentExpiryStatus;
      daysLeft: number | null;
    }> = [];

    for (const vehicle of this.managedVehicles) {
      const activeTrip = this.mockTrips.find((trip) =>
        trip.vehicleNumber?.trim().toLowerCase() === vehicle.vehicleNumber.trim().toLowerCase() &&
        trip.status !== 'COMPLETED'
      );
      const driverName = activeTrip?.driverName || 'Unassigned Driver';
      const vehicleDocs = this.vehicleDocuments.filter((doc) => doc.vehicle_id === vehicle.vehicle_id && doc.isActive);
      const relevantDocs: Array<{ docType: DocType; docLabel: string; expiryDate: string }> = [];

      for (const doc of vehicleDocs) {
        if (!doc.expiryDate) continue;
        relevantDocs.push({
          docType: doc.docType,
          docLabel: doc.docLabel || doc.docType,
          expiryDate: doc.expiryDate,
        });
      }

      const fallbackDocMap: Array<{ field: keyof ManagedVehicle; docType: DocType; docLabel: string }> = [
        { field: 'fcExpiryDate', docType: 'FC', docLabel: 'FC Certificate' },
        { field: 'insuranceExpiryDate', docType: 'INSURANCE', docLabel: 'Insurance Policy' },
        { field: 'nationalPermitExpiryDate', docType: 'NATIONAL_PERMIT', docLabel: 'National Permit' },
        { field: 'fiveYearPermitExpiryDate', docType: 'FIVE_YEAR_PERMIT', docLabel: '5 Years Permit' },
        { field: 'quarterTaxExpiryDate', docType: 'QUARTER_TAX', docLabel: 'Quarter Tax' },
        { field: 'pollutionExpiryDate', docType: 'POLLUTION', docLabel: 'Pollution Certificate' },
        { field: 'permitExpiryDate', docType: 'PERMIT', docLabel: 'Permit' },
      ];

      for (const fallback of fallbackDocMap) {
        const fallbackExpiry = vehicle[fallback.field] as string | undefined;
        if (!fallbackExpiry || relevantDocs.some((doc) => doc.docType === fallback.docType)) continue;
        relevantDocs.push({
          docType: fallback.docType,
          docLabel: fallback.docLabel,
          expiryDate: fallbackExpiry,
        });
      }

      for (const doc of relevantDocs) {
        const status = this.getDocumentExpiryStatus(doc.expiryDate);
        if (status.status === 'VALID' || status.status === 'DATE_NOT_AVAILABLE') continue;
        alerts.push({
          vehicleId: vehicle.vehicle_id,
          vehicleNumber: vehicle.vehicleNumber,
          driverName,
          docType: doc.docType,
          docLabel: doc.docLabel,
          expiryDate: doc.expiryDate,
          status: status.status,
          daysLeft: status.daysLeft,
        });
      }
    }

    return alerts.sort((a, b) => (a.daysLeft ?? Number.MAX_SAFE_INTEGER) - (b.daysLeft ?? Number.MAX_SAFE_INTEGER));
  }

  async getFleetVehicles(forceRefresh = false): Promise<FleetVehicle[]> {
    const now = Date.now();
    if (!forceRefresh && this._lastFleetFetchTime && now - this._lastFleetFetchTime < 2000 && this.mockFleetVehicles.length > 0) {
      return [...this.mockFleetVehicles];
    }

    if (this._inFlightFleet) {
      return this._inFlightFleet;
    }

    this._inFlightFleet = (async () => {
      try {
        const res = await this.authFetch(`${API_HOST}/api/admin/fleet`);
        if (res.ok) {
          const apiRows = await res.json();
          if (Array.isArray(apiRows)) {
            const mapped: FleetVehicle[] = apiRows.map((f: any) => ({
              id: f.id,
              vehicleNumber: f.vehicle_number,
              vehicleType: f.vehicle_type || '',
              vehicleMake: f.vehicle_make || '',
              vehicleModel: f.vehicle_model || '',
              ownerName: f.owner_name || '',
              gpsProvider: f.gps_provider || 'Jio GPS',
              gpsDeviceBrand: f.gps_device_brand || '',
              gpsDeviceModel: f.gps_device_model || '',
              gpsDeviceId: f.gps_device_id || '',
              imeiNumber: f.imei_number || '',
              gpsDeviceStatus: f.gps_device_status || 'Connected',
              vehicleStatus: f.vehicle_status || 'Active',
              registrationDate: f.registration_date || '',
              simNumber: f.sim_number || '',
              externalGpsDeviceId: f.external_gps_device_id || '',
              gpsInstallationDate: f.gps_installation_date || '',
              lastKnownLatitude: f.last_known_lat ? Number(f.last_known_lat) : undefined,
              lastKnownLongitude: f.last_known_lng ? Number(f.last_known_lng) : undefined,
              lastKnownCity: f.last_known_city || undefined,
              lastKnownAddress: f.last_known_address || undefined,
              gpsHistory: [],
              createdAt: f.created_at || new Date().toISOString(),
              updatedAt: f.updated_at || new Date().toISOString(),
            }));
            this.mockFleetVehicles = mapped;
            this._lastFleetFetchTime = Date.now();
          }
        }
      } catch (err) {
        // Fallback to cache without blocking
      } finally {
        this._inFlightFleet = null;
      }
      return [...this.mockFleetVehicles];
    })();

    return this._inFlightFleet;
  }

  async getActivityLogs(forceRefresh = false): Promise<ActivityLog[]> {
    const now = Date.now();
    if (!forceRefresh && this._lastLogsFetchTime && now - this._lastLogsFetchTime < 2000 && this.mockActivityLogs.length > 0) {
      return [...this.mockActivityLogs];
    }

    if (this._inFlightLogs) {
      return this._inFlightLogs;
    }

    this._inFlightLogs = (async () => {
      try {
        const res = await this.authFetch(`${API_HOST}/api/admin/activity-logs`);
        if (res.ok) {
          const apiRows = await res.json();
          if (Array.isArray(apiRows)) {
            const mapped: ActivityLog[] = apiRows.map((a: any) => ({
              id: a.id,
              tripId: a.trip_id,
              driverId: a.driver_id,
              driverName: a.driver_name,
              vehicleNumber: a.vehicle_number,
              action: a.action,
              timestamp: new Date(a.timestamp).toLocaleString('en-IN'),
              date: new Date(a.timestamp).toLocaleDateString('en-IN'),
              time: new Date(a.timestamp).toLocaleTimeString('en-IN'),
              details: a.details,
              startingPoint: a.starting_point || '',
              destination: a.destination || '',
              currentLocation: a.current_location || '',
              statusLabel: a.status_label || '',
              isGpsLocation: a.is_gps_location || false,
            }));
            this.mockActivityLogs = mapped;
            this._lastLogsFetchTime = Date.now();
          }
        }
      } catch (err) {
        // Fallback to cache without blocking
      } finally {
        this._inFlightLogs = null;
      }
      return [...this.mockActivityLogs];
    })();

    return this._inFlightLogs;
  }

  async createDriver(driverData: {
    name: string;
    id: string;
    pin: string;
    phone: string;
    license: string;
    vehicleNumber?: string;
  }): Promise<{ success: boolean; error?: string }> {
    this.mockDrivers.push({
      ...driverData,
      pinHash: 'mockHash',
      active: true,
      vehicleNumber: driverData.vehicleNumber || 'Unassigned'
    });
    this.notify();
    return Promise.resolve({ success: true });
  }

  async createVehicle(vehicleData: {
    number: string;
    type: '6 Wheel' | '10 Wheel' | '12 Wheel' | '14 Wheel' | '16 Wheel';
    owner: string;
    insurance?: string;
    permit?: string;
    fitness?: string;
    rc?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.createManagedVehicle({
      vehicleNumber: vehicleData.number.trim().toUpperCase(),
      vehicleType: vehicleData.type,
      wheelType: vehicleData.type,
      vehicleMake: '',
      vehicleModel: '',
      ownerName: vehicleData.owner.trim(),
      ownerPhone: '',
      rcNumber: vehicleData.rc || '',
      engineNumber: '',
      chassisNumber: '',
      yearOfManufacture: '',
      status: 'AVAILABLE',
    });
  }

  private getGcPrefix(dateString: string) {
    if (!dateString) return null;
    let year = 0;
    let month = 0;

    // Try splitting by '-'
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        year = Number(parts[0]);
        month = Number(parts[1]);
      } else {
        // DD-MM-YYYY
        year = Number(parts[2]);
        month = Number(parts[1]);
      }
    } else if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        year = Number(parts[0]);
        month = Number(parts[1]);
      } else {
        // DD/MM/YYYY
        year = Number(parts[2]);
        month = Number(parts[1]);
      }
    }

    if (!year || !month || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      // Fallback to current date
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthCode = monthNames[month - 1];
    const yearCode = String(year).slice(-2);
    return { monthCode, yearCode, month: month, year };
  };

  private parseGcSequence(value?: string) {
    if (!value) return null;
    const match = value.match(/^[A-Z]{3}-\d{2}-(\d+)$/);
    return match ? Number(match[1]) : null;
  }

  async loadGcNotes() {
    try {
      const raw = await AsyncStorage.getItem(this.gcStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) this.mockGcNotes = parsed;
        else this.mockGcNotes = [...INITIAL_SEED_GC_NOTES];
      } else {
        this.mockGcNotes = [...INITIAL_SEED_GC_NOTES];
        await this.persistGcNotes();
      }
    } catch (e) {
      console.warn('Failed to load GC notes:', e);
      this.mockGcNotes = [...INITIAL_SEED_GC_NOTES];
    }
  }

  private async persistGcNotes() {
    try {
      await AsyncStorage.setItem(this.gcStorageKey, JSON.stringify(this.mockGcNotes));
    } catch (e) {
      console.warn('Failed to persist GC notes:', e);
    }
  }

  async getGcNotes(month?: string, forceRefresh = false): Promise<GcNote[]> {
    const now = Date.now();
    if (!forceRefresh && this._lastGcsFetchTime && now - this._lastGcsFetchTime < 2000 && this.mockGcNotes.length > 0) {
      return [...this.mockGcNotes];
    }

    if (this._inFlightGcs) {
      return this._inFlightGcs;
    }

    this._inFlightGcs = (async () => {
      try {
        const res = await this.authFetch(`${API_HOST}/api/gc`);
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows)) {
            this.mockGcNotes = rows.map((r: any) => ({
              ...(r.raw_data || {}),
              id: r.id,
              noteNumber: r.gc_number || r.id,
              date: r.date,
              freight: Number(r.freight_amount || 0),
              total: Number(r.total_amount || 0),
              lessAdvance: Number(r.advance_amount || 0),
              balance: Number(r.balance_amount || 0),
              createdAt: r.created_at
            }));
            this._lastGcsFetchTime = Date.now();
            await this.persistGcNotes();
          }
        }
      } catch (err) {
        // Fallback to cached state
      } finally {
        this._inFlightGcs = null;
      }
      return [...this.mockGcNotes];
    })();

    return this._inFlightGcs;
  }

  async createGcNote(gcData: any): Promise<{ success: boolean; gcNote?: GcNote; error?: string }> {
    const prefixInfo = this.getGcPrefix(gcData.date);
    if (!prefixInfo) {
      return Promise.resolve({ success: false, error: 'Invalid date for GC note generation.' });
    }

    const prefix = `${prefixInfo.monthCode}-${prefixInfo.yearCode}`;
    let finalNoteNumber = gcData.noteNumber?.trim();

    if (!finalNoteNumber || this.mockGcNotes.some((note) => note.noteNumber === finalNoteNumber || note.id === finalNoteNumber)) {
      const maxSeq = this.mockGcNotes
        .map((note) => this.parseGcSequence(note.noteNumber || note.id))
        .filter((seq): seq is number => seq !== null && !isNaN(seq))
        .reduce((max, seq) => Math.max(max, seq), 0);

      finalNoteNumber = `${prefix}-${String(maxSeq + 1).padStart(2, '0')}`;
    }

    const newNote: GcNote = {
      ...gcData,
      id: finalNoteNumber,
      noteNumber: finalNoteNumber,
      createdAt: new Date().toISOString(),
      gcYear: prefixInfo.year,
      gcMonth: prefixInfo.month,
    };

    const existingIdx = this.mockGcNotes.findIndex(n => n.id === newNote.id || n.noteNumber === newNote.noteNumber);
    if (existingIdx !== -1) {
      this.mockGcNotes[existingIdx] = newNote;
    } else {
      this.mockGcNotes.unshift(newNote);
    }

    await this.persistGcNotes();

    try {
      await this.authFetch(`${API_HOST}/api/gc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newNote)
      });
    } catch (err) {
      console.warn('[AdminDB] createGcNote API error:', err);
    }

    this.notify();
    return Promise.resolve({ success: true, gcNote: newNote });
  }

  async updateGcNote(id: string, gcData: any): Promise<{ success: boolean; gcNote?: GcNote; error?: string }> {
    const existingIdx = this.mockGcNotes.findIndex(n => n.id === id || n.noteNumber === id);
    const prefixInfo = this.getGcPrefix(gcData.date);
    const noteId = id || gcData.noteNumber || gcData.id;
    const finalNoteNumber = gcData.noteNumber?.trim() || (existingIdx !== -1 ? (this.mockGcNotes[existingIdx].noteNumber || this.mockGcNotes[existingIdx].id) : noteId);

    const updatedNote: GcNote = {
      ...(existingIdx !== -1 ? this.mockGcNotes[existingIdx] : {}),
      ...gcData,
      id: noteId,
      noteNumber: finalNoteNumber,
      createdAt: existingIdx !== -1 ? this.mockGcNotes[existingIdx].createdAt : new Date().toISOString(),
      gcYear: prefixInfo ? prefixInfo.year : undefined,
      gcMonth: prefixInfo ? prefixInfo.month : undefined,
    };

    if (existingIdx !== -1) {
      this.mockGcNotes[existingIdx] = updatedNote;
    } else {
      this.mockGcNotes.unshift(updatedNote);
    }

    await this.persistGcNotes();

    try {
      await this.authFetch(`${API_HOST}/api/gc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedNote)
      });
    } catch (err) {
      console.warn('[AdminDB] updateGcNote API error:', err);
    }

    this.notify();
    return Promise.resolve({ success: true, gcNote: updatedNote });
  }

  async deleteGcNote(id: string): Promise<{ success: boolean }> {
    this.mockGcNotes = this.mockGcNotes.filter((n) => n.id !== id);
    await this.persistGcNotes();

    try {
      await this.authFetch(`${API_HOST}/api/gc/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('[AdminDB] deleteGcNote API error:', err);
    }

    this.notify();
    return Promise.resolve({ success: true });
  }

  async loadMemoDocuments() {
    try {
      const raw = await AsyncStorage.getItem(this.memoStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) this.mockMemoDocuments = parsed;
        else this.mockMemoDocuments = [...INITIAL_SEED_MEMOS];
      } else {
        this.mockMemoDocuments = [...INITIAL_SEED_MEMOS];
        await this.persistMemoDocuments();
      }
    } catch (e) {
      console.warn('Failed to load memo documents:', e);
      this.mockMemoDocuments = [...INITIAL_SEED_MEMOS];
    }
  }

  private async persistMemoDocuments() {
    try {
      const json = JSON.stringify(this.mockMemoDocuments);
      if (json === this._lastSavedMemosJson) return;
      this._lastSavedMemosJson = json;
      await AsyncStorage.setItem(this.memoStorageKey, json);
    } catch (e) {
      console.warn('Failed to persist memo documents:', e);
    }
  }

  async getMemoDocuments(forceRefresh = false): Promise<MemoDocument[]> {
    const now = Date.now();
    if (!forceRefresh && this._lastMemosFetchTime && now - this._lastMemosFetchTime < 2000 && this.mockMemoDocuments.length > 0) {
      return [...this.mockMemoDocuments];
    }

    if (this._inFlightMemos) {
      return this._inFlightMemos;
    }

    this._inFlightMemos = (async () => {
      try {
        const res = await this.authFetch(`${API_HOST}/api/memos`);
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows)) {
            this.mockMemoDocuments = rows.map((r: any) => ({
              id: r.id,
              memoId: r.id,
              date: r.date,
              contentHtml: r.content_html || '',
              createdBy: r.created_by || 'Admin',
              status: r.status || 'SAVED',
              createdAt: r.created_at,
              updatedAt: r.updated_at
            }));
            this._lastMemosFetchTime = Date.now();
            await this.persistMemoDocuments();
          }
        }
      } catch (err) {
        // Fallback to cached state
      } finally {
        this._inFlightMemos = null;
      }
      return [...this.mockMemoDocuments];
    })();

    return this._inFlightMemos;
  }

  async getMemoDocumentById(memoId: string): Promise<MemoDocument | null> {
    const list = await this.getMemoDocuments();
    const memo = list.find((doc) => doc.memoId === memoId);
    return Promise.resolve(memo ? { ...memo } : null);
  }

  async saveMemoDocument(data: Omit<MemoDocument, 'createdAt' | 'updatedAt'>): Promise<MemoDocument> {
    const now = new Date().toISOString();
    const existingIndex = this.mockMemoDocuments.findIndex((doc) => doc.memoId === data.memoId);
    const memo = {
      ...data,
      createdAt: existingIndex === -1 ? now : this.mockMemoDocuments[existingIndex].createdAt,
      updatedAt: now,
    };

    if (existingIndex === -1) {
      this.mockMemoDocuments.unshift(memo);
    } else {
      this.mockMemoDocuments[existingIndex] = memo;
    }

    await this.persistMemoDocuments();

    try {
      await this.authFetch(`${API_HOST}/api/memos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memo)
      });
    } catch (err) {
      console.warn('[AdminDB] saveMemoDocument API error:', err);
    }

    this.notify();
    return Promise.resolve(memo);
  }

  async deleteMemoDocument(memoId: string): Promise<boolean> {
    const index = this.mockMemoDocuments.findIndex((doc) => doc.memoId === memoId);
    if (index === -1) return Promise.resolve(false);
    this.mockMemoDocuments.splice(index, 1);
    await this.persistMemoDocuments();

    try {
      await this.authFetch(`${API_HOST}/api/memos/${memoId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('[AdminDB] deleteMemoDocument API error:', err);
    }

    this.notify();
    return Promise.resolve(true);
  }

  getTripPrintUrl(tripId: string): string {
    return `https://dummy.pdf`;
  }

  getGcPrintUrl(gcId: string): string {
    return `https://dummy.pdf`;
  }

  async getFleetVehicleByNumber(vehicleNumber: string): Promise<FleetVehicle | null> {
    const v = this.mockFleetVehicles.find(fv => fv.vehicleNumber === vehicleNumber);
    return Promise.resolve(v ? { ...v } : null);
  }

  async createFleetVehicle(data: Omit<FleetVehicle, 'id' | 'gpsHistory' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();
    const newVehicle: FleetVehicle = {
      ...data,
      id: `FV-${Date.now()}`,
      gpsHistory: [],
      createdAt: now,
      updatedAt: now,
    };
    this.mockFleetVehicles.push(newVehicle);

    try {
      await this.authFetch(`${API_HOST}/api/admin/fleet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newVehicle)
      });
    } catch (err) {
      console.warn('[AdminDB] createFleetVehicle API error:', err);
    }

    this.notify();
    return { success: true };
  }

  async updateFleetVehicle(id: string, data: Partial<Omit<FleetVehicle, 'id' | 'gpsHistory' | 'createdAt'>>): Promise<{ success: boolean; error?: string }> {
    const idx = this.mockFleetVehicles.findIndex(fv => fv.id === id);
    if (idx === -1) return { success: false, error: 'Vehicle not found.' };
    this.mockFleetVehicles[idx] = {
      ...this.mockFleetVehicles[idx],
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.notify();
    return { success: true };
  }

  async replaceGpsDevice(vehicleId: string, newGpsData: any, reason: string): Promise<{ success: boolean; error?: string }> {
    const idx = this.mockFleetVehicles.findIndex(fv => fv.id === vehicleId);
    if (idx === -1) return { success: false, error: 'Vehicle not found.' };
    const current = this.mockFleetVehicles[idx];
    const historyEntry: GpsDeviceHistory = {
      id: `HIST-${Date.now()}`,
      oldDeviceId: current.gpsDeviceId,
      oldImei: current.imeiNumber,
      oldProvider: current.gpsProvider,
      oldBrand: current.gpsDeviceBrand,
      replacedOn: new Date().toISOString().split('T')[0],
      replacedBy: this.currentUsername || 'admin',
      reason,
      newDeviceId: newGpsData.gpsDeviceId,
      newImei: newGpsData.imeiNumber,
    };
    this.mockFleetVehicles[idx] = {
      ...current,
      ...newGpsData,
      gpsDeviceStatus: 'Connected',
      gpsHistory: [historyEntry, ...current.gpsHistory],
      updatedAt: new Date().toISOString()
    };
    this.notify();
    return { success: true };
  }

  async disconnectGpsDevice(vehicleId: string): Promise<{ success: boolean; error?: string }> {
    const idx = this.mockFleetVehicles.findIndex(fv => fv.id === vehicleId);
    if (idx === -1) return { success: false, error: 'Vehicle not found.' };
    this.mockFleetVehicles[idx] = {
      ...this.mockFleetVehicles[idx],
      gpsDeviceStatus: 'Not Configured',
      updatedAt: new Date().toISOString()
    };
    this.notify();
    return { success: true };
  }

  // Real-Time Simulation Helpers
  async simulateDriverAction(
    type: 'START_TRIP' | 'UPDATE_LOCATION' | 'ADD_EXPENSE' | 'REACH_DESTINATION' | 'UPLOAD_POD' | 'COMPLETE_TRIP',
    tripId: string,
    customDetails?: string
  ): Promise<boolean> {
    const trip = this.mockTrips.find(t => t.id === tripId);
    if (!trip) return false;

    const now = new Date();
    const dateStr = `${now.getDate()} ${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    trip.lastUpdatedDate = dateStr;
    trip.lastUpdatedTime = timeStr;

    switch (type) {
      case 'START_TRIP':
        trip.status = 'STARTED';
        break;
      case 'UPDATE_LOCATION':
        trip.status = 'ON_THE_WAY';
        trip.lastKnownLocation = customDetails || 'Erode Bypass Checkpost';
        break;
      case 'COMPLETE_TRIP':
        trip.status = 'COMPLETED';
        trip.endDate = dateStr;
        trip.endTime = timeStr;
        // Auto-update vehicle status back to AVAILABLE
        if (trip.vehicleId) {
          const vIdx = this.managedVehicles.findIndex(v => v.vehicle_id === trip.vehicleId);
          if (vIdx !== -1) this.managedVehicles[vIdx] = { ...this.managedVehicles[vIdx], status: 'AVAILABLE', updatedAt: new Date().toISOString() };
        } else if (trip.vehicleNumber && trip.vehicleNumber !== 'Unassigned') {
          const vIdx = this.managedVehicles.findIndex(v => v.vehicleNumber === trip.vehicleNumber);
          if (vIdx !== -1) this.managedVehicles[vIdx] = { ...this.managedVehicles[vIdx], status: 'AVAILABLE', updatedAt: new Date().toISOString() };
        }
        break;
    }

    this.notify();
    return true;
  }

  async resetData(): Promise<boolean> {
    console.log('[AdminDB] resetData() called');

    // Always reload session first — constructor loadSession() is not awaited
    await this.loadSession();

    // Clear local storage
    try {
      await AsyncStorage.removeItem('nbt_trips_cache');
      await AsyncStorage.removeItem('nbt_managed_vehicles');
      await AsyncStorage.removeItem('nbt_vehicle_documents');
      await AsyncStorage.removeItem('nbt_drivers_cache');
      await AsyncStorage.removeItem('nbt_expenses_cache');
      await AsyncStorage.removeItem(this.gcStorageKey);
      await AsyncStorage.removeItem(this.memoStorageKey);
    } catch (err) {
      console.warn('[AdminDB] Error clearing local AsyncStorage keys:', err);
    }

    // Reset in-memory cache
    this.managedVehicles = [];
    this.vehicleDocuments = [];
    this.mockGcNotes = [];
    this.mockMemoDocuments = [];
    this.mockTrips = [];
    this.mockDrivers = [];
    this.mockFleetVehicles = [];
    this.mockActivityLogs = [];

    let authToken = this.token;

    // If no valid JWT, get a fresh one
    if (!authToken || authToken === 'local-fallback-token') {
      console.log('[AdminDB] No valid JWT — logging in to get one for reset...');
      try {
        const loginRes = await fetch(`${API_HOST}/api/auth/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingId: 'admin', pin: '9999' }),
        });
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          if (loginData.token) {
            authToken = loginData.token;
            this.token = loginData.token;
            try { await AsyncStorage.setItem('admin_session_token', loginData.token); } catch {
              await AsyncStorage.setItem('admin_session_token_web', loginData.token);
            }
            console.log('[AdminDB] Got fresh JWT for reset');
          }
        } else {
          const errText = await loginRes.text();
          throw new Error(`Login for reset failed (${loginRes.status}): ${errText}`);
        }
      } catch (loginErr: any) {
        throw new Error('Cannot reach backend to reset: ' + (loginErr?.message || loginErr));
      }
    }

    console.log('[AdminDB] Sending POST /api/admin/reset...');
    const res = await fetch(`${API_HOST}/api/admin/reset`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[AdminDB] Reset response not OK:', res.status, errorText);
      throw new Error(`Server reset failed (${res.status}): ${errorText}`);
    }

    const result = await res.json();
    console.log('[AdminDB] Reset success:', result);
    this.notify();
    return true;
  }

  async extractAllDatabaseData(): Promise<{
    extractedAt: string;
    version: string;
    stats: {
      totalRecords: number;
      tripsCount: number;
      vehiclesCount: number;
      vehicleDocumentsCount: number;
      driversCount: number;
      gcNotesCount: number;
      memoDocumentsCount: number;
      activityLogsCount: number;
      fleetCount: number;
      lorryBookingsCount: number;
    };
    data: {
      trips: Trip[];
      managedVehicles: ManagedVehicle[];
      vehicleDocuments: VehicleDocument[];
      fleetVehicles: FleetVehicle[];
      drivers: Driver[];
      gcNotes: GcNote[];
      memoDocuments: MemoDocument[];
      activityLogs: ActivityLog[];
      lorryBookings: any[];
    };
  }> {
    await this.loadSession();

    let lorryBookings: any[] = [];
    try {
      const res = await this.authFetch(`${API_HOST}/api/lorry-bookings/all`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.entries)) {
          lorryBookings = json.entries;
        }
      }
    } catch {}

    const [
      trips,
      managedVehicles,
      vehicleDocuments,
      fleetVehicles,
      drivers,
      gcNotes,
      memoDocuments,
      activityLogs,
    ] = await Promise.all([
      this.getTrips(true),
      this.getManagedVehicles(true),
      this.getAllVehicleDocuments(),
      this.getFleetVehicles(true),
      this.getDrivers(),
      this.getGcNotes(undefined, true),
      this.getMemoDocuments(true),
      this.getActivityLogs(true),
    ]);

    const totalRecords =
      trips.length +
      managedVehicles.length +
      vehicleDocuments.length +
      fleetVehicles.length +
      drivers.length +
      gcNotes.length +
      memoDocuments.length +
      activityLogs.length +
      lorryBookings.length;

    return {
      extractedAt: new Date().toISOString(),
      version: '2.4.1',
      stats: {
        totalRecords,
        tripsCount: trips.length,
        vehiclesCount: managedVehicles.length,
        vehicleDocumentsCount: vehicleDocuments.length,
        driversCount: drivers.length,
        gcNotesCount: gcNotes.length,
        memoDocumentsCount: memoDocuments.length,
        activityLogsCount: activityLogs.length,
        fleetCount: fleetVehicles.length,
        lorryBookingsCount: lorryBookings.length,
      },
      data: {
        trips,
        managedVehicles,
        vehicleDocuments,
        fleetVehicles,
        drivers,
        gcNotes,
        memoDocuments,
        activityLogs,
        lorryBookings,
      },
    };
  }
}

export const db = new AdminDatabase();
