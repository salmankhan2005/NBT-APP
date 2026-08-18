import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'db.json');

// Interface structures matching client side database expectations
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

export interface Trip {
  id: string;
  driverId: string;
  driverPinHash?: string;
  driverName: string;
  vehicleNumber: string;
  vehicleType: '6 Wheel' | '10 Wheel' | '12 Wheel' | '16 Wheel';
  startingPoint: string;
  destination: string;
  tollsCount: number;
  estimatedTollCost: number;
  status: 'ASSIGNED' | 'STARTED' | 'ON_THE_WAY' | 'REACHED_DESTINATION' | 'COMPLETED';
  odometerStart?: number;
  odometerEnd?: number;
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
  driverPayment?: number;
  profitOrLoss?: number;
  agreedFreight?: number;
}

export interface Driver {
  id: string;
  name: string;
  pin: string; // Plain PIN (e.g. "1234" used for login)
  pinHash: string; // SHA-256 hash of PIN
  phone: string;
  license: string;
  vehicleNumber: string;
  active: boolean;
}

export interface Vehicle {
  number: string;
  type: '6 Wheel' | '10 Wheel' | '12 Wheel' | '16 Wheel';
  wheelType: string;
  owner: string;
  insurance: string;
  permit: string;
  fitness: string;
  rc: string;
}

export interface GcItem {
  articlesCount: number;
  description: string;
  weight: number;
  value: number;
}

export interface GcNote {
  id: string; // e.g. "MAR-26-01"
  date: string;
  from: string;
  to: string;
  truckNumber: string;
  consignor: string;
  consignee: string;
  consignorGst: string;
  consigneeGst: string;
  items: GcItem[];
  freight: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  lessAdvance: number;
  balance: number;
  payableAt: string;
  gstPayee: string;
  deliveryAt: string;
  pan: string;
  driverName: string;
  driverSignature: string;
  dlNumber: string;
  lorryOwner: string;
  bankDetails: string;
  terms: string;
}

export interface ActivityLog {
  id: string;
  tripId: string;
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  action: string;
  timestamp: string;
  details?: string;
}

export interface DatabaseSchema {
  admins: { username: string; pinHash: string }[];
  drivers: Driver[];
  vehicles: Vehicle[];
  trips: Trip[];
  gcNotes: GcNote[];
  activityLogs: ActivityLog[];
}

// SHA-256 hashing utility in pure TS
export function hashSha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const lengthProperty = 'length';
  let i, j;
  let result = '';

  const words: number[] = [];
  const asciiLength = ascii[lengthProperty];
  
  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const hashBitLength = asciiLength * 8;
  words[asciiLength >> 2] |= 128 << (24 - ((asciiLength & 3) * 8));
  words[(((asciiLength + 8) >> 6) << 4) + 15] = hashBitLength;
  
  for (i = 0; i < asciiLength; i++) {
    words[i >> 2] |= ascii.charCodeAt(i) << (24 - ((i & 3) * 8));
  }

  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      if (j >= 16) {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[j] + (w[j] || 0)) | 0;
      const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash.length = 8;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    const word = hash[i];
    const hex = (word >>> 0).toString(16);
    result += ('00000000' + hex).slice(-8);
  }

  return result;
}

const DEFAULT_DB: DatabaseSchema = {
  admins: [
    {
      username: 'admin',
      pinHash: hashSha256('9999'), // SHA-256 of '9999'
    }
  ],
  drivers: [
    {
      id: '4421',
      name: 'Rajesh Kumar',
      pin: '1234',
      pinHash: hashSha256('1234'),
      phone: '9876543210',
      license: 'DL-TN30-20150912',
      vehicleNumber: 'TN 01 AB 1234',
      active: true,
    },
    {
      id: '5566',
      name: 'Senthil Nathan',
      pin: '4321',
      pinHash: hashSha256('4321'),
      phone: '9876543211',
      license: 'DL-TN37-20180405',
      vehicleNumber: 'TN 37 B 5678',
      active: true,
    }
  ],
  vehicles: [
    {
      number: 'TN 01 AB 1234',
      type: '12 Wheel',
      wheelType: '12 Wheeler Container',
      owner: 'New Balaji Transports',
      insurance: 'POL-991244A (Exp: 24/12/2026)',
      permit: 'National Permit NP-912A',
      fitness: 'FIT-10928 (Exp: 10/10/2026)',
      rc: 'RC-TN01AB1234'
    },
    {
      number: 'TN 37 B 5678',
      type: '6 Wheel',
      wheelType: '6 Wheeler Open-Body',
      owner: 'New Balaji Transports',
      insurance: 'POL-558231C (Exp: 15/09/2026)',
      permit: 'Tamil Nadu State Permit',
      fitness: 'FIT-20412 (Exp: 01/01/2027)',
      rc: 'RC-TN37B5678'
    },
    {
      number: 'KA 03 MM 7890',
      type: '16 Wheel',
      wheelType: '16 Wheeler Heavy Container',
      owner: 'Self',
      insurance: 'POL-102941X (Exp: 30/11/2026)',
      permit: 'All-India National Permit',
      fitness: 'FIT-99411 (Exp: 14/08/2026)',
      rc: 'RC-KA03MM7890'
    }
  ],
  trips: [
    {
      id: 'TRP-9824',
      driverId: '4421',
      driverName: 'Rajesh Kumar',
      vehicleNumber: 'TN 01 AB 1234',
      vehicleType: '12 Wheel',
      startingPoint: 'Chennai Hub',
      destination: 'Bangalore FC',
      tollsCount: 8,
      estimatedTollCost: 3200,
      status: 'ASSIGNED',
      expenses: [],
      trackingId: 'NBT-84213',
      currentGPS: {
        latitude: 13.0827,
        longitude: 80.2707,
        city: 'Chennai',
        address: 'Guindy Industrial Estate, Chennai, Tamil Nadu',
        lastUpdated: new Date().toLocaleTimeString(),
      }
    },
    {
      id: 'TRP-5021',
      driverId: '5566',
      driverName: 'Senthil Nathan',
      vehicleNumber: 'TN 37 B 5678',
      vehicleType: '6 Wheel',
      startingPoint: 'Salem Junction',
      destination: 'Coimbatore Hub',
      tollsCount: 4,
      estimatedTollCost: 1400,
      status: 'STARTED',
      odometerStart: 120500,
      dieselStart: '1/2',
      startDate: new Date().toLocaleDateString(),
      startTime: '10:00 AM',
      expenses: [
        {
          id: 'EXP-1',
          category: 'FUEL',
          amount: 6500,
          liters: 65,
          reason: 'Initial Diesel Fill up',
          timestamp: '10:15 AM',
          location: {
            latitude: 11.6643,
            longitude: 78.1460,
            city: 'Salem',
            address: 'BPCL Petrol Pump, Salem Bypass',
            lastUpdated: '10:15 AM'
          }
        },
        {
          id: 'EXP-2',
          category: 'TOLL',
          amount: 350,
          reason: 'Salem Toll Plaza',
          timestamp: '11:20 AM',
          location: {
            latitude: 11.5540,
            longitude: 77.9230,
            city: 'Salem Outskirts',
            address: 'Salem Toll Barrier',
            lastUpdated: '11:20 AM'
          }
        }
      ],
      trackingId: 'NBT-99999',
      currentGPS: {
        latitude: 11.3410,
        longitude: 77.7172,
        city: 'Erode Bypass',
        address: 'NH544 Erode Exit, Tamil Nadu',
        lastUpdated: new Date().toLocaleTimeString(),
      }
    }
  ],
  gcNotes: [
    {
      id: 'MAR-26-01',
      date: '2026-03-12',
      from: 'Chennai',
      to: 'Bangalore',
      truckNumber: 'TN 01 AB 1234',
      consignor: 'Make India Private Limited',
      consignee: 'Apex Retail Distribution',
      consignorGst: '33AAAAA1111A1Z1',
      consigneeGst: '29BBBBB2222B2Z2',
      items: [
        {
          articlesCount: 150,
          description: 'Industrial Gear Parts',
          weight: 4.5,
          value: 1250000
        }
      ],
      freight: 45000,
      cgst: 1125,
      sgst: 1125,
      igst: 0,
      total: 47250,
      lessAdvance: 15000,
      balance: 32250,
      payableAt: 'Bangalore Office',
      gstPayee: 'Consignor',
      deliveryAt: 'Door Delivery',
      pan: 'AAAAA1111A',
      driverName: 'Rajesh Kumar',
      driverSignature: 'Rajesh',
      dlNumber: 'DL-TN30-20150912',
      lorryOwner: 'New Balaji Transports',
      bankDetails: 'SBI A/C: 10928374656, IFSC: SBIN0001234',
      terms: '1. Goods carried at owner risk. 2. Demurrage charged after 24 hrs. 3. Disputes subject to Chennai jurisdiction.',
    }
  ],
  activityLogs: [
    {
      id: 'LOG-1',
      tripId: 'TRP-5021',
      driverId: '5566',
      driverName: 'Senthil Nathan',
      vehicleNumber: 'TN 37 B 5678',
      action: 'TRIP STARTED',
      timestamp: new Date().toLocaleTimeString(),
      details: 'Started trip from Salem to Coimbatore with odometer 120500.'
    }
  ]
};

// Core DB Access logic
export class Database {
  private static readRaw(): DatabaseSchema {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Error reading JSON DB, restoring defaults', e);
      return DEFAULT_DB;
    }
  }

  private static writeRaw(data: DatabaseSchema): void {
    // Atomic write by writing to a temp file and renaming it
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  public static get(): DatabaseSchema {
    return this.readRaw();
  }

  public static update(updater: (db: DatabaseSchema) => void): DatabaseSchema {
    const db = this.readRaw();
    updater(db);
    this.writeRaw(db);
    return db;
  }
}
