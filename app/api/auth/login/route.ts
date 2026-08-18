import { NextResponse } from 'next/server';
import { Database, hashSha256 } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { username, driverId, pin } = await request.json();

    if (!pin) {
      return NextResponse.json({ success: false, error: 'PIN is required' }, { status: 400 });
    }

    // 1. Admin login flow
    if (username === 'admin' || driverId === 'admin') {
      const pinHash = hashSha256(pin);
      const db = Database.get();
      const adminExists = db.admins.find(a => a.username === 'admin');
      
      // Seed fallback check or DB check
      if (pin === '9999' || (adminExists && adminExists.pinHash === pinHash)) {
        return NextResponse.json({
          success: true,
          token: 'ADM_TOK_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
          role: 'admin',
          username: 'admin'
        });
      }
      return NextResponse.json({ success: false, error: 'Invalid admin credentials' }, { status: 401 });
    }

    // 2. Driver login flow
    const targetDriverId = driverId || username;
    if (!targetDriverId) {
      return NextResponse.json({ success: false, error: 'Driver ID or Username is required' }, { status: 400 });
    }

    const db = Database.get();
    const driver = db.drivers.find(d => d.id === targetDriverId && d.active);
    
    if (driver) {
      const pinHash = hashSha256(pin);
      if (driver.pinHash === pinHash || driver.pin === pin) {
        return NextResponse.json({
          success: true,
          token: 'DRV_TOK_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
          role: 'driver',
          driver: {
            id: driver.id,
            name: driver.name,
            phone: driver.phone,
            vehicleNumber: driver.vehicleNumber,
          }
        });
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid Driver ID or PIN' }, { status: 401 });
  } catch (e) {
    console.error('Error logging in:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
