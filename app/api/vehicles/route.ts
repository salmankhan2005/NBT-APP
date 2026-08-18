import { NextResponse } from 'next/server';
import { Database, Vehicle } from '@/lib/db';

export async function GET() {
  try {
    const db = Database.get();
    return NextResponse.json({ success: true, vehicles: db.vehicles });
  } catch (e) {
    console.error('Error fetching vehicles:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { number, type, wheelType, owner, insurance, permit, fitness, rc } = body;

    if (!number || !type || !owner) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    let errorMsg: string | null = null;
    let newVehicle: Vehicle | null = null;

    Database.update(data => {
      const exists = data.vehicles.some(v => v.number.trim().toUpperCase() === number.trim().toUpperCase());
      if (exists) {
        errorMsg = 'Vehicle number already exists';
        return;
      }

      newVehicle = {
        number: number.trim().toUpperCase(),
        type,
        wheelType: wheelType || `${type} Wheeler`,
        owner,
        insurance: insurance || 'N/A',
        permit: permit || 'N/A',
        fitness: fitness || 'N/A',
        rc: rc || 'N/A'
      };

      data.vehicles.push(newVehicle);
    });

    if (errorMsg) {
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    return NextResponse.json({ success: true, vehicle: newVehicle });
  } catch (e) {
    console.error('Error creating vehicle:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
