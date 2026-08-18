import { NextResponse } from 'next/server';
import { Database, Driver, hashSha256 } from '@/lib/db';

export async function GET() {
  try {
    const db = Database.get();
    // Sanitize drivers list to prevent credential exposure
    const safeDrivers = db.drivers.map(({ pin, pinHash, ...safeDriver }) => safeDriver);
    return NextResponse.json({ success: true, drivers: safeDrivers });
  } catch (e) {
    console.error('Error fetching drivers:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, id, pin, phone, license, vehicleNumber, active } = body;

    if (!name || !id || !pin || !phone || !license) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    let errorMsg: string | null = null;
    let newDriver: Driver | null = null;

    Database.update(data => {
      // Check if driver ID already exists
      const exists = data.drivers.some(d => d.id === id);
      if (exists) {
        errorMsg = 'Driver ID already exists';
        return;
      }

      const pinHash = hashSha256(pin);
      newDriver = {
        id,
        name,
        pin,
        pinHash,
        phone,
        license,
        vehicleNumber: vehicleNumber || '',
        active: active !== undefined ? active : true
      };

      data.drivers.push(newDriver);
    });

    if (errorMsg) {
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    // Sanitize new driver return payload
    if (newDriver) {
      const { pin: _, pinHash: __, ...safeReturn } = newDriver as Driver;
      return NextResponse.json({ success: true, driver: safeReturn });
    }
    return NextResponse.json({ success: false, error: 'Failed to register driver' }, { status: 500 });
  } catch (e) {
    console.error('Error creating driver:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
