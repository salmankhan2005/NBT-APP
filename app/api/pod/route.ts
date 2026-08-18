import { NextResponse } from 'next/server';
import { Database } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tripId, podPhotoUri, signature, notes, gps } = body;

    if (!tripId) {
      return NextResponse.json({ success: false, error: 'Trip ID is required' }, { status: 400 });
    }

    let errorMsg: string | null = null;

    Database.update(data => {
      const trip = data.trips.find(t => t.id === tripId);
      if (!trip) {
        errorMsg = 'Trip not found';
        return;
      }

      trip.podPhotoUri = podPhotoUri || '';
      trip.podSignature = signature || '';
      trip.podNotes = notes || '';
      trip.status = 'REACHED_DESTINATION';

      if (gps) {
        trip.currentGPS = {
          latitude: Number(gps.latitude),
          longitude: Number(gps.longitude),
          city: gps.city || 'Destination Hub',
          address: gps.address || trip.destination,
          lastUpdated: new Date().toLocaleTimeString()
        };
      }

      // Log activity
      data.activityLogs.unshift({
        id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tripId: trip.id,
        driverId: trip.driverId,
        driverName: trip.driverName,
        vehicleNumber: trip.vehicleNumber,
        action: 'POD_UPLOADED',
        timestamp: new Date().toLocaleTimeString(),
        details: 'Proof of Delivery (POD) uploaded. Status changed to Reached Destination.'
      });
    });

    if (errorMsg) {
      return NextResponse.json({ success: false, error: errorMsg }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error uploading POD:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
