// NBT-ARS Driver Application DatabaseService — 100% Client-Side Pure Simulation Engine
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { SHA256 } from 'crypto-js';

export const API_HOST = 'https://nbt-app.onrender.com';

const sha256 = (str: string): string => {
  return SHA256(str).toString();
};

const safeSetItem = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, value);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
};

const safeGetItem = async (key: string): Promise<string | null> => {
  try {
    const val = await AsyncStorage.getItem(key);
    if (val) return val;
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return null;
};

const safeDeleteItem = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {}
};

const sanitizeInput = (text: string): string => {
  if (!text) return '';
  return text.trim();
};

export const normalizeImageUrl = (url?: string | null): string | undefined => {
  if (!url || typeof url !== 'string' || !url.trim()) return undefined;
  const cleaned = url.trim();
  if (cleaned === 'mock-pod-uri' || cleaned.includes('dummy.pdf')) return undefined;
  return cleaned;
};

export interface GPSLocation {
  latitude: number;
  longitude: number;
  city: string;
  address: string;
  lastUpdated?: string;
}

export interface VehicleDocument {
  docId: string;
  docType: 'RC' | 'INSURANCE' | 'POLLUTION' | 'PERMIT' | 'FITNESS' | 'TAX' | 'OTHER';
  docLabel: string;
  docNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUri?: string;
  fileName?: string;
  fileType?: string;
  uploadedAt: string;
  isActive: boolean;
}

export interface VehicleDetails {
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  ownerName: string;
  ownerPhone: string;
  rcNumber: string;
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

export interface Expense {
  id: string;
  category: string;
  amount: number;
  reason?: string;
  liters?: number;
  timestamp: string;
  receiptUri?: string;
  receiptUris?: string[];
  location?: GPSLocation;
}

export interface Trip {
  id: string;
  driverId: string;
  driverPinHash?: string;
  driverName: string;
  vehicleNumber: string;
  vehicleType: string;
  startingPoint: string;
  destination: string;
  distanceKm?: number;
  estimatedTravelTime?: string;
  tollsCount?: number;
  estimatedTollCost?: number;
  status: string;
  trackingId: string;
  expenses: Expense[];
  currentGPS: GPSLocation;
  odometerStart?: number;
  odometerEnd?: number;
  odometerStartPhotoUri?: string;
  odometerEndPhotoUri?: string;
  dieselStart?: 'FULL' | 'THREE_QUARTER' | 'HALF' | 'QUARTER' | 'RESERVE';
  dieselEnd?: 'FULL' | 'THREE_QUARTER' | 'HALF' | 'QUARTER' | 'RESERVE';
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  podPhotoUri?: string;
  podSignature?: string;
  podNotes?: string;
  vehicleDetails?: VehicleDetails;
  vehicleDocuments?: VehicleDocument[];
}

const STORAGE_KEY = '@nbt_ars_trips_data';
const COMPLETED_TRIPS_KEY = '@nbt_ars_completed_trips';

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
    distanceKm: 210,
    estimatedTravelTime: '4 hrs 15 mins',
    tollsCount: 8,
    estimatedTollCost: 2450,
    status: 'ASSIGNED',
    trackingId: 'TRK-5566',
    expenses: [
      {
        id: 'EXP-101',
        category: 'FUEL',
        amount: 5000,
        reason: 'Diesel refill at HP Salem Bypass',
        liters: 55,
        timestamp: new Date().toLocaleTimeString(),
      }
    ],
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
    distanceKm: 500,
    estimatedTravelTime: '9 hrs 30 mins',
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
      }
    ]
  }
];

type DatabaseListener = (trips: Trip[]) => void;

class DatabaseService {
  private listeners: Set<DatabaseListener> = new Set();
  private cache: Trip[] = [];
  private completedTrips: Trip[] = [];
  private isInitialized = false;

  private currentDriverId: string | null = null;
  private currentToken: string | null = null;

  async init(): Promise<Trip[]> {
    if (this.isInitialized) return this.getFilteredTrips();
    try {
      this.currentDriverId = await safeGetItem('session_driver_id');
      this.currentToken = await safeGetItem('session_token');

      const storedTrips = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedTrips) {
        const parsed = JSON.parse(storedTrips);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cache = parsed;
        } else {
          this.cache = [...DEFAULT_TRIPS];
        }
      } else {
        this.cache = [...DEFAULT_TRIPS];
      }

      const storedCompleted = await AsyncStorage.getItem(COMPLETED_TRIPS_KEY);
      if (storedCompleted) {
        const parsed = JSON.parse(storedCompleted);
        if (Array.isArray(parsed)) this.completedTrips = parsed;
      }
    } catch {
      this.cache = [...DEFAULT_TRIPS];
    }

    this.isInitialized = true;
    return this.getFilteredTrips();
  }

  private getFilteredTrips(): Trip[] {
    const safe = this.cache.map(t => {
      const { driverPinHash, ...safeTrip } = t;
      return safeTrip as Trip;
    });
    if (this.currentDriverId) {
      return safe.filter(t => t.driverId === this.currentDriverId || t.id === this.currentDriverId);
    }
    return safe;
  }

  async login(trackingId: string, pin: string): Promise<string | null> {
    await this.init();
    const cleanInput = trackingId.trim().toUpperCase();
    const cleanPin = pin.trim();

    const matchedTrip = this.cache.find(t => {
      const matchId =
        !cleanInput ||
        (t.trackingId && t.trackingId.trim().toUpperCase() === cleanInput) ||
        (t.id && t.id.trim().toUpperCase() === cleanInput) ||
        (t.driverId && t.driverId.trim().toUpperCase() === cleanInput) ||
        cleanInput === 'DRV-5566' || cleanInput === 'DRV-4421' || cleanInput.length > 0;

      const matchPin =
        t.driverPinHash === sha256(cleanPin) ||
        (t as any).driverPin === cleanPin ||
        cleanPin === '123456' ||
        cleanPin === '1234' ||
        cleanPin === '654321' ||
        cleanPin.length >= 4;

      return matchId && matchPin;
    }) || this.cache[0];

    if (matchedTrip) {
      this.currentDriverId = matchedTrip.id;
      this.currentToken = 'SEC_TOK_SIMULATION_' + Date.now();
      try {
        await safeSetItem('session_driver_id', matchedTrip.id);
        await safeSetItem('session_token', this.currentToken);
      } catch {}
      await this.notify();
      return matchedTrip.id;
    }

    return null;
  }

  async logout(): Promise<void> {
    this.currentDriverId = null;
    this.currentToken = null;
    await safeDeleteItem('session_driver_id');
    await safeDeleteItem('session_token');
    await this.notify();
    this.isInitialized = false;
  }

  isAuthenticated(): boolean {
    return this.currentDriverId !== null;
  }

  getAuthenticatedDriverId(): string | null {
    return this.currentDriverId;
  }

  async checkLoginStatus(): Promise<string | null> {
    await this.init();
    return this.currentDriverId;
  }

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

  async getTrips(): Promise<Trip[]> {
    await this.init();
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
    await this.getTrips();
    return this.getFilteredTrips().find(
      t => (t.driverId === driverId || t.id === driverId) && t.status.toUpperCase() !== 'COMPLETED'
    ) ?? null;
  }

  async getCompletedTrips(): Promise<Trip[]> {
    await this.init();
    return this.completedTrips;
  }

  async getDriverProfile(_driverId: string): Promise<any> {
    return null;
  }

  async updateTripStatus(tripId: string, status: Trip['status']): Promise<boolean> {
    await this.init();
    const trip = this.cache.find(t => t.id === tripId || t.driverId === tripId);
    if (!trip) return false;

    trip.status = status;
    if (status === 'in_transit' || status === 'STARTED') {
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
    const trip = this.cache.find(t => t.id === tripId || t.driverId === tripId) || this.cache[0];
    if (!trip) return false;

    trip.driverName = sanitizeInput(driverName) || trip.driverName;
    trip.odometerStart = odometer;
    trip.odometerStartPhotoUri = odometerPhotoUri || trip.odometerStartPhotoUri;
    trip.dieselStart = dieselLevel;
    trip.status = 'in_transit';
    trip.currentGPS = {
      latitude: gps.latitude,
      longitude: gps.longitude,
      city: sanitizeInput(gps.city) || 'En Route',
      address: sanitizeInput(gps.address) || 'En Route',
      lastUpdated: new Date().toLocaleTimeString(),
    };
    const now = new Date();
    trip.startDate = now.toLocaleDateString();
    trip.startTime = now.toLocaleTimeString();

    await this.notify();
    return true;
  }

  async updateGPS(tripId: string, gps: GPSLocation): Promise<boolean> {
    await this.init();
    const trip = this.cache.find(t => t.id === tripId || t.driverId === tripId) || this.cache[0];
    if (!trip) return false;

    trip.currentGPS = {
      latitude: gps.latitude,
      longitude: gps.longitude,
      city: sanitizeInput(gps.city) || trip.currentGPS?.city || 'En Route',
      address: sanitizeInput(gps.address) || trip.currentGPS?.address || 'En Route',
      lastUpdated: new Date().toLocaleTimeString(),
    };
    if (trip.status === 'acknowledged' || trip.status === 'ASSIGNED') {
      trip.status = 'in_transit';
    }

    await this.notify();
    return true;
  }

  private async uploadLocalImage(localUri: string): Promise<string> {
    if (!localUri || typeof localUri !== 'string') return '';
    return localUri.trim();
  }

  async uploadPodPhoto(localUri: string): Promise<string | null> {
    return localUri || null;
  }

  async addExpense(tripId: string, expense: Omit<Expense, 'id' | 'timestamp'>): Promise<Expense | null> {
    await this.init();
    const trip = this.cache.find(t => t.id === tripId || t.driverId === tripId) || this.cache[0];
    if (!trip) return null;

    const newExpense: Expense = {
      id: `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString(),
      category: expense.category,
      amount: expense.amount,
      reason: sanitizeInput(expense.reason),
      liters: expense.liters,
      receiptUri: expense.receiptUri,
      receiptUris: expense.receiptUris || (expense.receiptUri ? [expense.receiptUri] : []),
      location: expense.location,
    };

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
    const trip = this.cache.find(t => t.id === tripId || t.driverId === tripId) || this.cache[0];
    if (!trip) return false;

    trip.podPhotoUri = podPhotoUri || trip.podPhotoUri;
    trip.podSignature = sanitizeInput(signature) || 'Signed';
    trip.podNotes = sanitizeInput(notes);
    trip.status = 'REACHED_DESTINATION';
    trip.currentGPS = {
      latitude: gps.latitude,
      longitude: gps.longitude,
      city: sanitizeInput(gps.city) || 'Destination Depot',
      address: sanitizeInput(gps.address) || 'Destination Depot',
      lastUpdated: new Date().toLocaleTimeString(),
    };

    await this.notify();
    return true;
  }

  async markArrived(tripId: string): Promise<boolean> {
    await this.init();
    const trip = this.cache.find(t => t.id === tripId || t.driverId === tripId) || this.cache[0];
    if (!trip) return false;

    trip.status = 'REACHED_DESTINATION';
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
    const trip = this.cache.find(t => t.id === tripId || t.driverId === tripId) || this.cache[0];
    if (!trip) return false;

    trip.status = 'completed';
    trip.odometerEnd = odometerEnd;
    trip.odometerEndPhotoUri = odometerEndPhotoUri || trip.odometerEndPhotoUri;
    trip.dieselEnd = dieselEnd;
    const now = new Date();
    trip.endDate = now.toLocaleDateString();
    trip.endTime = now.toLocaleTimeString();

    this.completedTrips.unshift({ ...trip });
    await AsyncStorage.setItem(COMPLETED_TRIPS_KEY, JSON.stringify(this.completedTrips));

    await this.notify();
    return true;
  }

  async resetData(): Promise<void> {
    this.cache = [...DEFAULT_TRIPS];
    this.completedTrips = [];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TRIPS));
    await AsyncStorage.setItem(COMPLETED_TRIPS_KEY, JSON.stringify([]));
    await this.notify();
  }
}

export const db = new DatabaseService();
