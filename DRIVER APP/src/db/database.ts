// NBT-ARS DatabaseService v3.2 — Open Auth Mode (Accepts Any Credentials)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { SHA256 } from 'crypto-js';

// ── API Host Configuration ──────────────────────────────────────────────────
const DEFAULT_API_HOST = 'https://nbt-app.onrender.com';
export const API_HOST = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')
  : DEFAULT_API_HOST;

// ── Secure storage helpers (Dual-write for robust persistence across reloads) ───
const safeGetItem = async (key: string): Promise<string | null> => {
  return AsyncStorage.getItem(key);
};

const safeSetItem = async (key: string, value: string): Promise<void> => {
  try { await AsyncStorage.setItem(key, value); } catch {}
};

const safeDeleteItem = async (key: string): Promise<void> => {
  try { await AsyncStorage.removeItem(key); } catch {}
};

// SHA256 for PIN hashing (no server required)
function sha256(text: string): string {
  return SHA256(text).toString();
}

// Strip HTML tags and control characters to prevent injection attacks
export function sanitizeInput(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/[\r\n\x00-\x1F]/g, ' ')
    .trim();
}

// ── Data interfaces ──────────────────────────────────────────────────────────
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

export interface VehicleDocumentItem {
  docId: string;
  docType: string;
  docLabel: string;
  docNumber: string;
  issueDate?: string;
  expiryDate?: string;
  fileUri: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  isActive: boolean;
}

export interface VehicleDetailsItem {
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  vehicleMake?: string;
  vehicleModel?: string;
  ownerName?: string;
  ownerPhone?: string;
  rcNumber?: string;
  rcFrontUrl?: string;
  rcBackUrl?: string;
  insuranceUrl?: string;
  insuranceExpiryDate?: string;
  pollutionUrl?: string;
  pollutionExpiryDate?: string;
  permitUrl?: string;
  permitExpiryDate?: string;
  fcUrl?: string;
  fcExpiryDate?: string;
}

export interface Trip {
  id: string;
  driverId: string;
  driverPinHash?: string; // SECURED: never exposed to the UI layer
  driverName: string;
  vehicleNumber: string;
  vehicleType: '6 Wheel' | '10 Wheel' | '12 Wheel' | '16 Wheel';
  startingPoint: string;
  destination: string;
  distanceKm?: number;
  estimatedTravelTime?: string;
  tollsCount: number;
  estimatedTollCost: number;
  status:
    | 'ASSIGNED' | 'IN_TRANSIT' | 'ON_THE_WAY'
    | 'REACHED_DESTINATION' | 'COMPLETED' | 'CANCELLED'
    | 'STARTED' | 'dispatched' | 'acknowledged'
    | 'in_transit' | 'completed';
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
  expenses: Expense[];
  podPhotoUri?: string;
  podSignature?: string;
  podNotes?: string;
  trackingId: string;
  vehicleDetails?: VehicleDetailsItem;
  vehicleDocuments?: VehicleDocumentItem[];
}

export const normalizeImageUrl = (url?: string | null): string | undefined => {
  if (!url || typeof url !== 'string' || !url.trim()) return undefined;
  let cleaned = url.trim();

  if (
    cleaned === 'mock-pod-uri' ||
    cleaned.includes('dummy.pdf') ||
    cleaned.includes('storage.nbt-ars.com')
  ) {
    return undefined;
  }

  if (
    cleaned.startsWith('data:image/') ||
    cleaned.startsWith('data:application/') ||
    cleaned.startsWith('blob:') ||
    cleaned.startsWith('file://') ||
    cleaned.startsWith('content://')
  ) {
    return cleaned;
  }

  if (cleaned.startsWith('/uploads/')) {
    cleaned = `${API_HOST}${cleaned}`;
  } else if (cleaned.startsWith('uploads/')) {
    cleaned = `${API_HOST}/${cleaned}`;
  }

  cleaned = cleaned.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1|10\.0\.2\.2)(?::\d+)?(?=\/)/i, API_HOST);

  return cleaned;
};

// ── AsyncStorage keys ────────────────────────────────────────────────────────
const STORAGE_KEY          = '@nbt_ars_trips_data';
const COMPLETED_TRIPS_KEY  = '@nbt_ars_completed_trips';

// ── Default seed data (used when no local data exists yet) ──────────────────
const DEFAULT_TRIPS: Trip[] = [
  {
    id: 'DRV-5566',
    driverId: 'DRV-5566',
    driverPinHash: sha256('123456'),
    driverName: 'Senthil Rajesh',
    vehicleNumber: 'TN 38 AB 1234',
    vehicleType: '12 Wheel',
    startingPoint: 'Salem A2B Restaurant',
    destination: 'Lumen Technologies, Bengaluru',
    tollsCount: 8,
    estimatedTollCost: 2450,
    status: 'ASSIGNED',
    trackingId: 'TRK-5566',
    expenses: [],
    currentGPS: {
      latitude: 11.6643,
      longitude: 78.1460,
      city: 'Salem Bypass',
      address: 'NH544, Salem, Tamil Nadu',
      lastUpdated: new Date().toLocaleTimeString(),
    },
    vehicleDetails: {
      vehicleId: 'VEH-101',
      vehicleNumber: 'TN 38 AB 1234',
      vehicleType: '12 Wheel',
      vehicleMake: 'Ashok Leyland',
      vehicleModel: 'Captain 3118',
      ownerName: 'NBT Logistics',
      ownerPhone: '+91 94433 51789',
      rcNumber: 'TN38AB1234RC',
    },
    vehicleDocuments: [
      {
        docId: 'MOCK-DOC-RC',
        docType: 'RC',
        docLabel: 'Registration Certificate (RC)',
        docNumber: 'TN-38-AB-1234',
        expiryDate: '2032-12-31T00:00:00.000Z',
        fileUri: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=1000',
        fileName: 'rc_details.jpg',
        fileType: 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        isActive: true
      },
      {
        docId: 'MOCK-DOC-INS',
        docType: 'INSURANCE',
        docLabel: 'Commercial Vehicle Insurance',
        docNumber: 'INS-99887722',
        expiryDate: '2027-12-31T00:00:00.000Z',
        fileUri: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=1000',
        fileName: 'insurance_policy.jpg',
        fileType: 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        isActive: true
      },
      {
        docId: 'MOCK-DOC-POL',
        docType: 'POLLUTION',
        docLabel: 'Pollution Under Control (PUC)',
        docNumber: 'PUC-8877112',
        expiryDate: '2027-10-15T00:00:00.000Z',
        fileUri: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=1000',
        fileName: 'puc_certificate.jpg',
        fileType: 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        isActive: true
      }
    ]
  },
  {
    id: 'DRV-4421',
    driverId: 'DRV-4421',
    driverPinHash: sha256('654321'),
    driverName: 'Karthik Raja',
    vehicleNumber: 'TN 37 CB 5678',
    vehicleType: '16 Wheel',
    startingPoint: 'Chennai Port Terminal',
    destination: 'Coimbatore Cargo Terminal',
    tollsCount: 12,
    estimatedTollCost: 3200,
    status: 'ASSIGNED',
    trackingId: 'TRK-4421',
    expenses: [],
    currentGPS: {
      latitude: 13.0827,
      longitude: 80.2707,
      city: 'Chennai Central',
      address: 'Rajaji Salai, Chennai, Tamil Nadu',
      lastUpdated: new Date().toLocaleTimeString(),
    },
    vehicleDetails: {
      vehicleId: 'VEH-102',
      vehicleNumber: 'TN 37 CB 5678',
      vehicleType: '16 Wheel',
      vehicleMake: 'Tata Motors',
      vehicleModel: 'Signa 4825.TK',
      ownerName: 'ARS Fleet',
      ownerPhone: '+91 93622 51789',
      rcNumber: 'TN37CB5678RC',
    },
    vehicleDocuments: [
      {
        docId: 'MOCK-DOC-RC2',
        docType: 'RC',
        docLabel: 'Registration Certificate (RC)',
        docNumber: 'TN-37-CB-5678',
        expiryDate: '2033-05-20T00:00:00.000Z',
        fileUri: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=1000',
        fileName: 'rc_details.jpg',
        fileType: 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        isActive: true
      },
      {
        docId: 'MOCK-DOC-INS2',
        docType: 'INSURANCE',
        docLabel: 'Commercial Vehicle Insurance',
        docNumber: 'INS-77665511',
        expiryDate: '2027-11-20T00:00:00.000Z',
        fileUri: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=1000',
        fileName: 'insurance_policy.jpg',
        fileType: 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        isActive: true
      }
    ]
  },
];

type DatabaseListener = (trips: Trip[]) => void;

// ── DatabaseService ──────────────────────────────────────────────────────────
class DatabaseService {
  private listeners: Set<DatabaseListener> = new Set();
  private cache: Trip[] = [];
  private completedTrips: Trip[] = [];
  private isInitialized = false;

  // Zero-trust: only the authenticated driver's data is ever returned
  private currentDriverId: string | null = null;
  private currentToken: string | null = null;

  // ── Init ──────────────────────────────────────────────────────────────────
  async init(): Promise<Trip[]> {
    if (this.isInitialized) return this.getFilteredTrips();
    try {
      this.currentDriverId = await safeGetItem('session_driver_id');
      this.currentToken    = await safeGetItem('session_token');

      // Load & validate stored trips
      let loaded: Trip[] = [];
      try {
        const storedTrips = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedTrips) {
          const parsed = JSON.parse(storedTrips);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loaded = parsed;
          }
        }
      } catch {
        loaded = [];
      }

      // Merge: preserve all loaded trip data (expenses, status) and only restore missing driverPinHash from default seeds
      if (loaded.length > 0) {
        const defaultMap = new Map(DEFAULT_TRIPS.map(t => [t.id, t]));
        this.cache = loaded.map(t => {
          const defaultSeed = defaultMap.get(t.id);
          if (defaultSeed) {
            return {
              ...t,
              driverPinHash: t.driverPinHash || defaultSeed.driverPinHash
            };
          }
          return t;
        });
        // Append any default trips not yet in storage (new seeds added over time)
        for (const def of DEFAULT_TRIPS) {
          if (!this.cache.find(t => t.id === def.id)) {
            this.cache.push(def);
          }
        }
      } else {
        this.cache = [...DEFAULT_TRIPS];
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));

      try {
        const storedHistory = await AsyncStorage.getItem(COMPLETED_TRIPS_KEY);
        if (storedHistory) {
          this.completedTrips = JSON.parse(storedHistory);
        }
      } catch {
        this.completedTrips = [];
      }

      this.isInitialized = true;
      return this.getFilteredTrips();
    } catch (e) {
      console.error('[DB] Init error — falling back to defaults:', e);
      this.cache = [...DEFAULT_TRIPS];
      this.isInitialized = true; // prevent infinite retry loop
      return this.getFilteredTrips();
    }
  }

  // ── Zero-trust query gate ─────────────────────────────────────────────────
  private getFilteredTrips(): Trip[] {
    const safe = this.cache.map(t => {
      const { driverPinHash, ...safeTrip } = t;
      return safeTrip as Trip;
    });
    if (this.currentDriverId) {
      return safe.filter(t => t.driverId === this.currentDriverId || t.id === this.currentDriverId);
    }
    return [];
  }

  // ── Authentication ────────────────────────────────────────────────────────
  async login(trackingId: string, pin: string): Promise<string | null> {
    try {
      await this.init();
      let serverUnavailable = false;

      // Safety net: ensure cache always has seed data with hashes
      const hasMissingHashes = this.cache.some(t => !t.driverPinHash);
      if (this.cache.length === 0 || hasMissingHashes) {
        this.cache = [...DEFAULT_TRIPS];
        try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TRIPS)); } catch {}
      }

      const cleanInput = trackingId.trim().toUpperCase();
      const cleanPin   = pin.trim();

      // Try server API first if online
      try {
        const response = await fetch(`${API_HOST}/api/auth/driver/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingId: cleanInput, pin: cleanPin })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.token && (data.driverId || data.tripId)) {
            const activeId = data.driverId || data.tripId;
            this.currentDriverId = activeId;
            this.currentToken    = data.token;
            try {
              await safeSetItem('session_driver_id', activeId);
              await safeSetItem('session_token', data.token);

              // Fetch live assigned trip from Neon DB
              const tripRes = await fetch(`${API_HOST}/api/trips`, {
                headers: { Authorization: `Bearer ${data.token}` }
              });
              if (tripRes.ok) {
                const apiTrips = await tripRes.json();
                if (Array.isArray(apiTrips) && apiTrips.length > 0) {
                  const fetchedTrip = apiTrips[0];
                  const formattedTrip: Trip = {
                    id: fetchedTrip.id,
                    driverId: fetchedTrip.driver_id || activeId,
                    driverPinHash: '',
                    driverName: fetchedTrip.driver_name || data.driverName || 'Driver',
                    vehicleNumber: fetchedTrip.vehicle_number || 'TN 38 AB 1234',
                    vehicleType: fetchedTrip.vehicle_type || '12 Wheel',
                    startingPoint: fetchedTrip.starting_point || 'Depot',
                    destination: fetchedTrip.destination || 'Destination',
                    distanceKm: fetchedTrip.distance_km ? Number(fetchedTrip.distance_km) : undefined,
                    estimatedTravelTime: fetchedTrip.estimated_travel_time || undefined,
                    tollsCount: Number(fetchedTrip.tolls_count || 0),
                    estimatedTollCost: Number(fetchedTrip.estimated_toll_cost || 0),
                    status: fetchedTrip.status || 'ASSIGNED',
                    trackingId: fetchedTrip.tracking_id || cleanInput,
                    expenses: fetchedTrip.expenses || [],
                    odometerStart: fetchedTrip.odometer_start ? Number(fetchedTrip.odometer_start) : undefined,
                    odometerEnd: fetchedTrip.odometer_end ? Number(fetchedTrip.odometer_end) : undefined,
                    dieselStart: fetchedTrip.diesel_start || undefined,
                    dieselEnd: fetchedTrip.diesel_end || undefined,
                    startDate: fetchedTrip.start_date ? new Date(fetchedTrip.start_date).toLocaleDateString() : undefined,
                    startTime: fetchedTrip.start_date ? new Date(fetchedTrip.start_date).toLocaleTimeString() : undefined,
                    endDate: fetchedTrip.end_date ? new Date(fetchedTrip.end_date).toLocaleDateString() : undefined,
                    endTime: fetchedTrip.end_date ? new Date(fetchedTrip.end_date).toLocaleTimeString() : undefined,
                    podPhotoUri: fetchedTrip.pod_photo_url || undefined,
                    podSignature: fetchedTrip.pod_signature || undefined,
                    podNotes: fetchedTrip.pod_notes || undefined,
                    currentGPS: fetchedTrip.current_gps || {
                      latitude: 11.6643,
                      longitude: 78.1460,
                      city: 'Depot',
                      address: fetchedTrip.starting_point || 'Depot',
                      lastUpdated: new Date().toLocaleTimeString()
                    },
                    vehicleDetails: fetchedTrip.vehicle_details ? {
                      vehicleId: fetchedTrip.vehicle_details.vehicleId,
                      vehicleNumber: fetchedTrip.vehicle_details.vehicleNumber,
                      vehicleType: fetchedTrip.vehicle_details.vehicleType,
                      vehicleMake: fetchedTrip.vehicle_details.vehicleMake,
                      vehicleModel: fetchedTrip.vehicle_details.vehicleModel,
                      ownerName: fetchedTrip.vehicle_details.ownerName,
                      ownerPhone: fetchedTrip.vehicle_details.ownerPhone,
                      rcNumber: fetchedTrip.vehicle_details.rcNumber,
                      rcFrontUrl: normalizeImageUrl(fetchedTrip.vehicle_details.rcFrontUrl),
                      rcBackUrl: normalizeImageUrl(fetchedTrip.vehicle_details.rcBackUrl),
                      insuranceUrl: normalizeImageUrl(fetchedTrip.vehicle_details.insuranceUrl),
                      insuranceExpiryDate: fetchedTrip.vehicle_details.insuranceExpiryDate,
                      pollutionUrl: normalizeImageUrl(fetchedTrip.vehicle_details.pollutionUrl),
                      pollutionExpiryDate: fetchedTrip.vehicle_details.pollutionExpiryDate,
                      permitUrl: normalizeImageUrl(fetchedTrip.vehicle_details.permitUrl),
                      permitExpiryDate: fetchedTrip.vehicle_details.permitExpiryDate,
                      fcUrl: normalizeImageUrl(fetchedTrip.vehicle_details.fcUrl),
                      fcExpiryDate: fetchedTrip.vehicle_details.fcExpiryDate,
                    } : undefined,
                    vehicleDocuments: Array.isArray(fetchedTrip.vehicle_documents) ? fetchedTrip.vehicle_documents.map((d: any) => ({
                      docId: d.docId,
                      docType: d.docType,
                      docLabel: d.docLabel,
                      docNumber: d.docNumber || '',
                      issueDate: d.issueDate,
                      expiryDate: d.expiryDate,
                      fileUri: normalizeImageUrl(d.fileUri) || d.fileUri || '',
                      fileName: d.fileName || '',
                      fileType: d.fileType || '',
                      uploadedAt: d.uploadedAt || new Date().toISOString(),
                      isActive: Boolean(d.isActive)
                    })) : undefined
                  };

                  const existingIdx = this.cache.findIndex(t => t.id === formattedTrip.id || t.driverId === activeId);
                  if (existingIdx !== -1) {
                    this.cache[existingIdx] = formattedTrip;
                  } else {
                    this.cache.unshift(formattedTrip);
                  }
                }
              }
            } catch (err) {
              console.warn('[DB] Failed to sync active trip from backend:', err);
            }
            await this.notify();
            return activeId;
          }
        } else {
          return null;
        }
      } catch (netErr) {
        serverUnavailable = true;
        console.warn('[DB] Backend offline, evaluating local credentials securely:', netErr);
      }

      if (!serverUnavailable) return null;

      // Strict Local Authentication (Offline Mode)
      const pinHash = sha256(cleanPin);
      const matchedTrip = this.cache.find(t => {
        const matchId =
          (t.trackingId && t.trackingId.trim().toUpperCase() === cleanInput) ||
          (t.id         && t.id.trim().toUpperCase() === cleanInput) ||
          (t.driverId   && t.driverId.trim().toUpperCase() === cleanInput);

        const matchPin = t.driverPinHash === pinHash || (t as any).driverPin === cleanPin;
        return matchId && matchPin;
      });

      if (matchedTrip) {
        this.currentDriverId = matchedTrip.id;
        this.currentToken    = 'SEC_TOK_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        try {
          await safeSetItem('session_driver_id', matchedTrip.id);
          await safeSetItem('session_token', this.currentToken);
        } catch {}
        await this.notify();
        return matchedTrip.id;
      }

      return null;
    } catch (e) {
      console.error('[DB] login() unexpected error:', e);
      return null;
    }
  }

  async logout(): Promise<void> {
    this.currentDriverId = null;
    this.currentToken    = null;

    try {
      await safeDeleteItem('session_driver_id');
      await safeDeleteItem('session_token');
    } catch {}

    await this.notify();
    this.isInitialized = false;
  }

  isAuthenticated(): boolean {
    return this.currentDriverId !== null && this.currentToken !== null;
  }

  getAuthenticatedDriverId(): string | null {
    return this.currentDriverId;
  }

  async checkLoginStatus(): Promise<string | null> {
    await this.init();
    return this.currentDriverId;
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────
  subscribe(listener: DatabaseListener): () => void {
    this.listeners.add(listener);
    if (this.isInitialized) {
      listener(this.getFilteredTrips());
    }
    return () => { this.listeners.delete(listener); };
  }

  private async notify(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    const filtered = this.getFilteredTrips();
    this.listeners.forEach(l => l([...filtered]));
  }

  // ── Queries (Neon DB-First with Local Storage Fallback when Offline) ────────
  async getTrips(): Promise<Trip[]> {
    await this.init();

    // Try to fetch latest trips from Neon DB if online
    if (this.currentToken) {
      try {
        const response = await fetch(`${API_HOST}/api/trips`, {
          headers: { Authorization: `Bearer ${this.currentToken}` }
        });
        if (response.ok) {
          const apiTrips = await response.json();
          if (Array.isArray(apiTrips)) {
            // Map/format the trips from the server
            const freshTrips = apiTrips.map((fetchedTrip: any) => {
              const formattedTrip: Trip = {
                id: fetchedTrip.id,
                driverId: fetchedTrip.driver_id || this.currentDriverId || '',
                driverPinHash: '',
                driverName: fetchedTrip.driver_name || 'Driver',
                vehicleNumber: fetchedTrip.vehicle_number || 'TN 38 AB 1234',
                vehicleType: fetchedTrip.vehicle_type || '12 Wheel',
                startingPoint: fetchedTrip.starting_point || 'Depot',
                destination: fetchedTrip.destination || 'Destination',
                distanceKm: fetchedTrip.distance_km ? Number(fetchedTrip.distance_km) : undefined,
                estimatedTravelTime: fetchedTrip.estimated_travel_time || undefined,
                tollsCount: Number(fetchedTrip.tolls_count || 0),
                estimatedTollCost: Number(fetchedTrip.estimated_toll_cost || 0),
                status: fetchedTrip.status || 'ASSIGNED',
                trackingId: fetchedTrip.tracking_id || '',
                expenses: fetchedTrip.expenses || [],
                odometerStart: fetchedTrip.odometer_start ? Number(fetchedTrip.odometer_start) : undefined,
                odometerEnd: fetchedTrip.odometer_end ? Number(fetchedTrip.odometer_end) : undefined,
                dieselStart: fetchedTrip.diesel_start || undefined,
                dieselEnd: fetchedTrip.diesel_end || undefined,
                startDate: fetchedTrip.start_date ? new Date(fetchedTrip.start_date).toLocaleDateString() : undefined,
                startTime: fetchedTrip.start_date ? new Date(fetchedTrip.start_date).toLocaleTimeString() : undefined,
                endDate: fetchedTrip.end_date ? new Date(fetchedTrip.end_date).toLocaleDateString() : undefined,
                endTime: fetchedTrip.end_date ? new Date(fetchedTrip.end_date).toLocaleTimeString() : undefined,
                podPhotoUri: fetchedTrip.pod_photo_url || undefined,
                podSignature: fetchedTrip.pod_signature || undefined,
                podNotes: fetchedTrip.pod_notes || undefined,
                currentGPS: fetchedTrip.current_gps || {
                  latitude: 11.6643,
                  longitude: 78.1460,
                  city: 'Depot',
                  address: fetchedTrip.starting_point || 'Depot',
                  lastUpdated: new Date().toLocaleTimeString()
                },
                vehicleDetails: fetchedTrip.vehicle_details ? {
                  vehicleId: fetchedTrip.vehicle_details.vehicleId,
                  vehicleNumber: fetchedTrip.vehicle_details.vehicleNumber,
                  vehicleType: fetchedTrip.vehicle_details.vehicleType,
                  vehicleMake: fetchedTrip.vehicle_details.vehicleMake,
                  vehicleModel: fetchedTrip.vehicle_details.vehicleModel,
                  ownerName: fetchedTrip.vehicle_details.ownerName,
                  ownerPhone: fetchedTrip.vehicle_details.ownerPhone,
                  rcNumber: fetchedTrip.vehicle_details.rcNumber,
                  rcFrontUrl: normalizeImageUrl(fetchedTrip.vehicle_details.rcFrontUrl),
                  rcBackUrl: normalizeImageUrl(fetchedTrip.vehicle_details.rcBackUrl),
                  insuranceUrl: normalizeImageUrl(fetchedTrip.vehicle_details.insuranceUrl),
                  insuranceExpiryDate: fetchedTrip.vehicle_details.insuranceExpiryDate,
                  pollutionUrl: normalizeImageUrl(fetchedTrip.vehicle_details.pollutionUrl),
                  pollutionExpiryDate: fetchedTrip.vehicle_details.pollutionExpiryDate,
                  permitUrl: normalizeImageUrl(fetchedTrip.vehicle_details.permitUrl),
                  permitExpiryDate: fetchedTrip.vehicle_details.permitExpiryDate,
                  fcUrl: normalizeImageUrl(fetchedTrip.vehicle_details.fcUrl),
                  fcExpiryDate: fetchedTrip.vehicle_details.fcExpiryDate,
                } : undefined,
                vehicleDocuments: Array.isArray(fetchedTrip.vehicle_documents) ? fetchedTrip.vehicle_documents.map((d: any) => ({
                  docId: d.docId,
                  docType: d.docType,
                  docLabel: d.docLabel,
                  docNumber: d.docNumber || '',
                  issueDate: d.issueDate,
                  expiryDate: d.expiryDate,
                  fileUri: normalizeImageUrl(d.fileUri) || d.fileUri || '',
                  fileName: d.fileName || '',
                  fileType: d.fileType || '',
                  uploadedAt: d.uploadedAt || new Date().toISOString(),
                  isActive: Boolean(d.isActive)
                })) : undefined
              };
              return formattedTrip;
            });

            // Update cache (preserve pins/hashes for mock accounts if present)
            for (const ft of freshTrips) {
              const existingIdx = this.cache.findIndex(t => t.id === ft.id);
              if (existingIdx !== -1) {
                ft.driverPinHash = this.cache[existingIdx].driverPinHash || '';
                this.cache[existingIdx] = ft;
              } else {
                this.cache.push(ft);
              }
            }
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
          }
        }
      } catch (err) {
        console.warn('[DriverDB] getTrips live sync failed, using local cache fallback:', err);
      }
    }

    return this.getFilteredTrips();
  }

  async getTripById(id: string): Promise<Trip | null> {
    await this.getTrips();
    return this.getFilteredTrips().find(t => t.id === id) ?? null;
  }

  async getTripByTrackingId(trackingId: string): Promise<Trip | null> {
    await this.getTrips();
    return this.getFilteredTrips().find(
      t => t.trackingId.trim().toUpperCase() === trackingId.trim().toUpperCase()
    ) ?? null;
  }

  async getActiveTripForDriver(driverId: string): Promise<Trip | null> {
    if (driverId !== this.currentDriverId) return null;
    await this.getTrips();
    return this.getFilteredTrips().find(
      t => (t.driverId === driverId || t.id === driverId) && t.status.toUpperCase() !== 'COMPLETED'
    ) ?? null;
  }

  async getCompletedTrips(): Promise<Trip[]> {
    await this.init();
    const safe = this.completedTrips.map(t => {
      const { driverPinHash, ...safeTrip } = t;
      return safeTrip as Trip;
    });
    if (this.currentDriverId) {
      return safe.filter(t => t.driverId === this.currentDriverId || t.id === this.currentDriverId);
    }
    return [];
  }

  async getDriverProfile(_driverId: string): Promise<any> {
    // Derived from local trip data in ProfileScreen
    return null;
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  async createTrip(trip: Omit<Trip, 'expenses' | 'status'> & { driverPin?: string }): Promise<Trip> {
    await this.init();
    const driverPinHash = sha256(trip.driverPin ?? '1234');

    const newTrip: Trip = {
      id:                 trip.id,
      driverId:           trip.driverId,
      driverPinHash,
      driverName:         sanitizeInput(trip.driverName),
      vehicleNumber:      sanitizeInput(trip.vehicleNumber),
      vehicleType:        trip.vehicleType,
      startingPoint:      sanitizeInput(trip.startingPoint),
      destination:        sanitizeInput(trip.destination),
      tollsCount:         trip.tollsCount,
      estimatedTollCost:  trip.estimatedTollCost,
      trackingId:         sanitizeInput(trip.trackingId),
      status:             'ASSIGNED',
      expenses:           [],
      currentGPS: {
        latitude:    13.0827,
        longitude:   80.2707,
        city:        'Origin Depot',
        address:     sanitizeInput(trip.startingPoint),
        lastUpdated: new Date().toLocaleTimeString(),
      },
    };

    this.cache.push(newTrip);
    await this.notify();

    const { driverPinHash: _, ...safeReturn } = newTrip;
    return safeReturn as Trip;
  }

  async updateTripStatus(tripId: string, status: Trip['status']): Promise<boolean> {
    await this.init();
    const trip = this.cache.find(t => t.id === tripId);
    if (!trip || (trip.driverId !== this.currentDriverId && trip.id !== this.currentDriverId)) return false;

    trip.status = status;
    if (status === 'in_transit') {
      const now = new Date();
      trip.startDate = now.toLocaleDateString();
      trip.startTime = now.toLocaleTimeString();
    }
    await this.notify();
    return true;
  }

  async startTrip(
    tripId: string,
    driverName: string,
    odometer: number,
    dieselLevel: Trip['dieselStart'],
    gps: GPSLocation,
    odometerPhotoUri: string
  ): Promise<boolean> {
    await this.init();
    const trip = this.cache.find(t => t.id === tripId);
    if (!trip || (trip.driverId !== this.currentDriverId && trip.id !== this.currentDriverId)) return false;

    // Upload odometer photo
    const _rawPhotoUrl = await this.uploadLocalImage(odometerPhotoUri);
    const hostedPhotoUrl = (_rawPhotoUrl.startsWith('http://') || _rawPhotoUrl.startsWith('https://')) ? _rawPhotoUrl : '';

    trip.driverName    = sanitizeInput(driverName);
    trip.odometerStart = odometer;
    trip.dieselStart   = dieselLevel;
    trip.status        = 'in_transit';
    trip.currentGPS    = {
      latitude:    gps.latitude,
      longitude:   gps.longitude,
      city:        sanitizeInput(gps.city),
      address:     sanitizeInput(gps.address),
      lastUpdated: new Date().toLocaleTimeString(),
    };
    const now = new Date();
    trip.startDate = now.toLocaleDateString();
    trip.startTime = now.toLocaleTimeString();

    // Live API Sync to Neon Postgres Backend
    if (this.currentToken) {
      try {
        const response = await fetch(`${API_HOST}/api/trips/${tripId}/start`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.currentToken}`
          },
          body: JSON.stringify({
            driverName: trip.driverName,
            odometer,
            ...(hostedPhotoUrl ? { odometerPhotoUrl: hostedPhotoUrl } : {}),
            dieselLevel,
            gps: {
              latitude: gps.latitude,
              longitude: gps.longitude,
              city: sanitizeInput(gps.city),
              address: sanitizeInput(gps.address)
            }
          })
        });
        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new Error(`Start trip failed (${response.status})${errorBody ? `: ${errorBody}` : ''}`);
        }
      } catch (err) {
        console.warn('[DriverDB] startTrip API sync error:', err);
        return false;
      }
    }

    await this.notify();
    return true;
  }

  async updateGPS(tripId: string, gps: GPSLocation): Promise<boolean> {
    await this.init();
    const trip = this.cache.find(t => t.id === tripId);
    if (!trip || (trip.driverId !== this.currentDriverId && trip.id !== this.currentDriverId)) return false;

    trip.currentGPS = {
      latitude:    gps.latitude,
      longitude:   gps.longitude,
      city:        sanitizeInput(gps.city),
      address:     sanitizeInput(gps.address),
      lastUpdated: new Date().toLocaleTimeString(),
    };
    if (trip.status === 'acknowledged') {
      trip.status = 'in_transit';
    }

    // Live API Sync to Neon Postgres Backend
    if (this.currentToken) {
      try {
        await fetch(`${API_HOST}/api/trips/${tripId}/gps`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.currentToken}`
          },
          body: JSON.stringify({
            latitude: gps.latitude,
            longitude: gps.longitude,
            city: sanitizeInput(gps.city),
            address: sanitizeInput(gps.address)
          })
        });
      } catch (err) {
        console.warn('[DriverDB] updateGPS API sync error:', err);
      }
    }

    await this.notify();
    return true;
  }

  // ── Image Upload Helper ──────────────────────────────────────────────────
  /**
   * Uploads a local file:// URI to the backend and returns the hosted public URL.
   * Falls back to returning the original URI if the upload fails (offline).
   */
  private async uploadLocalImage(localUri: string): Promise<string> {
    if (!localUri || typeof localUri !== 'string') return '';
    // If it's already a hosted URL on the server, return it directly
    if ((localUri.startsWith('http://') || localUri.startsWith('https://')) && localUri.includes('/uploads/')) {
      return localUri;
    }

    try {
      const filename = localUri.split('/').pop() || `photo_${Date.now()}.jpg`;
      const formData = new FormData();

      if (Platform.OS === 'web' && (localUri.startsWith('blob:') || localUri.startsWith('data:'))) {
        const res = await fetch(localUri);
        const blob = await res.blob();
        formData.append('file', blob, filename);
      } else {
        formData.append('file', {
          uri: localUri,
          name: filename,
          type: 'image/jpeg',
        } as any);
      }

      if (!this.currentToken) {
        await this.checkLoginStatus();
      }
      if (!this.currentToken) {
        throw new Error('Driver not authenticated. Please log in to upload files.');
      }
      const token = this.currentToken;

      const response = await fetch(`${API_HOST}/api/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const json = await response.json();
        if (json.url) {
          const hostedUrl = normalizeImageUrl(json.url) || json.url;
          console.log('[DriverDB] Image uploaded successfully:', hostedUrl);
          return hostedUrl;
        }
      }
      console.warn('[DriverDB] Image upload returned unexpected response:', response.status);
    } catch (err) {
      console.warn('[DriverDB] Image upload failed (offline?), using local URI:', err);
    }
    return localUri;
  }

  async uploadPodPhoto(localUri: string): Promise<string | null> {
    const uploadedUri = await this.uploadLocalImage(localUri);
    if (uploadedUri.startsWith('http://') || uploadedUri.startsWith('https://')) {
      return normalizeImageUrl(uploadedUri) || uploadedUri;
    }
    return null;
  }

  async addExpense(tripId: string, expense: Omit<Expense, 'id' | 'timestamp'>): Promise<Expense | null> {
    await this.init();
    const trip = this.cache.find(t => t.id === tripId);
    if (!trip || (trip.driverId !== this.currentDriverId && trip.id !== this.currentDriverId)) return null;

    // Upload receipt image to backend before saving locally
    let hostedReceiptUrl: string | undefined = undefined;
    if (expense.receiptUri) {
      const uploadedReceiptUrl = await this.uploadLocalImage(expense.receiptUri);
      hostedReceiptUrl = uploadedReceiptUrl.startsWith('http://') || uploadedReceiptUrl.startsWith('https://')
        ? uploadedReceiptUrl
        : undefined;
    }

    const newExpense: Expense = {
      id:        `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString(),
      category:  expense.category,
      amount:    expense.amount,
      reason:    sanitizeInput(expense.reason),
      liters:    expense.liters,
      receiptUri: hostedReceiptUrl ? sanitizeInput(hostedReceiptUrl) : undefined,
      location:  expense.location
        ? {
            latitude:    expense.location.latitude,
            longitude:   expense.location.longitude,
            city:        sanitizeInput(expense.location.city),
            address:     sanitizeInput(expense.location.address),
            lastUpdated: new Date().toLocaleTimeString(),
          }
        : undefined,
    };

    // Live API Sync to Neon Postgres Backend (include hosted receipt URL)
    if (this.currentToken) {
      try {
        const response = await fetch(`${API_HOST}/api/trips/${tripId}/expenses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.currentToken}`
          },
          body: JSON.stringify({
            category: expense.category,
            amount: expense.amount,
            reason: expense.reason ? sanitizeInput(expense.reason) : undefined,
            liters: expense.liters,
            location: expense.location,
            receiptUrl: hostedReceiptUrl || undefined,
          })
        });
        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new Error(`Expense sync failed (${response.status})${errorBody ? `: ${errorBody}` : ''}`);
        }
      } catch (err) {
        console.warn('[DriverDB] addExpense API sync error:', err);
        return null;
      }
    }

    trip.expenses.push(newExpense);
    await this.notify();
    return newExpense;
  }

  async uploadPOD(
    tripId: string,
    podPhotoUri: string,
    signature: string,
    notes: string,
    gps: GPSLocation
  ): Promise<boolean> {
    await this.init();
    const trip = this.cache.find(t => t.id === tripId);
    if (!trip || (trip.driverId !== this.currentDriverId && trip.id !== this.currentDriverId)) return false;

    // Upload POD photo to backend first to get a hosted URL
    const isHostedPhoto = podPhotoUri.startsWith('http://') || podPhotoUri.startsWith('https://');
    const hostedPodUrl = podPhotoUri && !podPhotoUri.startsWith('mock') && !isHostedPhoto
      ? await this.uploadPodPhoto(podPhotoUri)
      : podPhotoUri;
    if (podPhotoUri && !podPhotoUri.startsWith('mock') && !hostedPodUrl) {
      console.warn('[DriverDB] POD upload failed; refusing to sync an unusable local URI.');
      return false;
    }
    const finalPhotoUrl = hostedPodUrl || podPhotoUri || '';

    trip.podPhotoUri  = finalPhotoUrl ? sanitizeInput(finalPhotoUrl) : undefined;
    trip.podSignature = sanitizeInput(signature);
    trip.podNotes     = sanitizeInput(notes);
    trip.status       = 'REACHED_DESTINATION';
    trip.currentGPS   = {
      latitude:    gps.latitude,
      longitude:   gps.longitude,
      city:        sanitizeInput(gps.city),
      address:     sanitizeInput(gps.address),
      lastUpdated: new Date().toLocaleTimeString(),
    };

    // Live API Sync to Neon Postgres Backend (with hosted URL, not local URI)
    if (this.currentToken) {
      try {
        await fetch(`${API_HOST}/api/trips/${tripId}/pod`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.currentToken}`
          },
          body: JSON.stringify({
            podPhotoUrl: finalPhotoUrl,
            podSignature: sanitizeInput(signature) || 'Signed',
            podNotes: sanitizeInput(notes),
            gps: {
              latitude: gps.latitude,
              longitude: gps.longitude,
              city: sanitizeInput(gps.city),
              address: sanitizeInput(gps.address)
            }
          })
        });
        console.log('[DriverDB] uploadPOD synced to backend successfully');
      } catch (err) {
        console.warn('[DriverDB] uploadPOD API sync error:', err);
      }
    }

    await this.notify();
    return true;
  }

  async markArrived(tripId: string): Promise<boolean> {
    await this.init();
    const trip = this.cache.find(t => t.id === tripId);
    if (!trip || (trip.driverId !== this.currentDriverId && trip.id !== this.currentDriverId)) return false;

    trip.status = 'REACHED_DESTINATION';

    if (this.currentToken) {
      try {
        await fetch(`${API_HOST}/api/trips/${tripId}/arrived`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${this.currentToken}` },
        });
      } catch (err) {
        console.warn('[DriverDB] markArrived API sync error:', err);
      }
    }

    await this.notify();
    return true;
  }

  async completeTrip(
    tripId: string,
    odometerEnd: number,
    dieselEnd: Trip['dieselEnd'],
    odometerEndPhotoUri?: string
  ): Promise<boolean> {
    await this.init();
    const trip = this.cache.find(t => t.id === tripId);
    if (!trip || (trip.driverId !== this.currentDriverId && trip.id !== this.currentDriverId)) return false;

    // Upload end odometer photo if provided
    let hostedEndPhotoUrl: string | undefined;
    if (odometerEndPhotoUri) {
      hostedEndPhotoUrl = await this.uploadPodPhoto(odometerEndPhotoUri) || undefined;
      if (!hostedEndPhotoUrl) {
        throw new Error('Ending odometer photo upload failed');
      }
    }

    trip.status              = 'completed';
    trip.odometerEnd         = odometerEnd;
    trip.odometerEndPhotoUri = hostedEndPhotoUrl;
    trip.dieselEnd           = dieselEnd;
    const now = new Date();
    trip.endDate = now.toLocaleDateString();
    trip.endTime = now.toLocaleTimeString();

    this.completedTrips.unshift({ ...trip });
    await AsyncStorage.setItem(COMPLETED_TRIPS_KEY, JSON.stringify(this.completedTrips));

    // Live API Sync to Neon Postgres Backend
    if (this.currentToken) {
      try {
        await fetch(`${API_HOST}/api/trips/${tripId}/complete`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.currentToken}`
          },
          body: JSON.stringify({
            odometerEnd,
            odometerEndPhotoUrl: hostedEndPhotoUrl?.startsWith('http') ? hostedEndPhotoUrl : undefined,
            dieselEnd
          })
        });
      } catch (err) {
        console.warn('[DriverDB] completeTrip API sync error:', err);
      }
    }

    await this.notify();
    return true;
  }

  async resetData(): Promise<void> {
    this.cache          = [...DEFAULT_TRIPS];
    this.completedTrips = [];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TRIPS));
    await AsyncStorage.setItem(COMPLETED_TRIPS_KEY, JSON.stringify([]));
    await this.notify();
  }
}

export const db = new DatabaseService();
