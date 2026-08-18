import { NextResponse } from 'next/server';
import { Database } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tripId, latitude, longitude, city, address } = body;

    if (!tripId || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    let errorMsg: string | null = null;

    Database.update(data => {
      const trip = data.trips.find(t => t.id === tripId);
      if (!trip) {
        errorMsg = 'Trip not found';
        return;
      }

      trip.currentGPS = {
        latitude: Number(latitude),
        longitude: Number(longitude),
        city: city || 'In Transit',
        address: address || 'On Highway',
        lastUpdated: new Date().toLocaleTimeString()
      };

      if (trip.status === 'STARTED') {
        trip.status = 'ON_THE_WAY';
      }
    });

    if (errorMsg) {
      return NextResponse.json({ success: false, error: errorMsg }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error updating GPS:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
