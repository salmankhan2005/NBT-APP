import { NextResponse } from 'next/server';
import { Database } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingId = searchParams.get('id');

    if (!trackingId) {
      return NextResponse.json({ success: false, error: 'Tracking ID is required' }, { status: 400 });
    }

    const db = Database.get();
    const trip = db.trips.find(
      t => t.trackingId.trim().toUpperCase() === trackingId.trim().toUpperCase() ||
           t.id.trim().toUpperCase() === trackingId.trim().toUpperCase()
    );

    if (!trip) {
      return NextResponse.json({ success: false, error: 'Shipment not found' }, { status: 404 });
    }

    // Map internal status to customer-friendly display text
    const statusMapping = {
      'ASSIGNED': 'Order Confirmed',
      'STARTED': 'In Transit (Odometer & Fuel Registered)',
      'ON_THE_WAY': 'In Transit',
      'REACHED_DESTINATION': 'Out for Delivery / Reached Destination',
      'COMPLETED': 'Delivered'
    };

    // Calculate progress percentage
    let progress = 10;
    if (trip.status === 'STARTED') progress = 30;
    if (trip.status === 'ON_THE_WAY') progress = 65;
    if (trip.status === 'REACHED_DESTINATION') progress = 90;
    if (trip.status === 'COMPLETED') progress = 100;

    // Generate milestones dynamically
    const milestones = [
      {
        id: '1',
        title: 'Order Confirmed',
        timestamp: trip.startDate ? `${trip.startDate} ${trip.startTime || ''}` : 'Pending',
        status: 'completed',
        description: `Booking processed and vehicle ${trip.vehicleNumber} assigned`
      },
      {
        id: '2',
        title: 'Picked Up & Registered',
        timestamp: trip.startDate ? `${trip.startDate} ${trip.startTime || ''}` : null,
        status: trip.status !== 'ASSIGNED' ? 'completed' : 'pending',
        description: `Odometer reading verified at ${trip.startingPoint}`
      },
      {
        id: '3',
        title: 'In Transit',
        timestamp: trip.currentGPS?.lastUpdated ? `${trip.startDate || ''} ${trip.currentGPS.lastUpdated}` : null,
        status: ['ON_THE_WAY', 'REACHED_DESTINATION', 'COMPLETED'].includes(trip.status)
          ? 'completed'
          : trip.status === 'STARTED' ? 'current' : 'pending',
        description: trip.currentGPS ? `Currently near ${trip.currentGPS.city}: ${trip.currentGPS.address}` : 'On route to destination'
      },
      {
        id: '4',
        title: 'Out for Delivery / POD Pending',
        timestamp: trip.status === 'REACHED_DESTINATION' || trip.status === 'COMPLETED' ? 'Arrived' : null,
        status: trip.status === 'COMPLETED'
          ? 'completed'
          : trip.status === 'REACHED_DESTINATION' ? 'current' : 'pending',
        description: 'Cargo arrived at destination. Awaiting POD signing.'
      },
      {
        id: '5',
        title: 'Delivered',
        timestamp: trip.endDate ? `${trip.endDate} ${trip.endTime || ''}` : null,
        status: trip.status === 'COMPLETED' ? 'completed' : 'pending',
        description: 'Delivered successfully. Proof of Delivery signed.'
      }
    ];

    const publicTelemetry = {
      id: trip.trackingId,
      tripId: trip.id,
      status: trip.status === 'COMPLETED' ? 'DELIVERED' : trip.status === 'ASSIGNED' ? 'PENDING' : 'IN_TRANSIT',
      statusText: statusMapping[trip.status] || 'In Transit',
      progress,
      remainingKm: trip.status === 'COMPLETED' ? 0 : 250, // Mock
      avgSpeed: trip.status === 'COMPLETED' ? 0 : 55,
      vehicleNumber: trip.vehicleNumber,
      vehicleType: trip.vehicleType,
      gpsPingTime: trip.currentGPS ? `${trip.currentGPS.lastUpdated}` : 'N/A',
      eta: trip.status === 'COMPLETED' ? `Delivered on ${trip.endDate}` : `Estimate: ${trip.destination}`,
      origin: trip.startingPoint,
      destination: trip.destination,
      currentCity: trip.currentGPS?.city || trip.startingPoint,
      lastUpdated: trip.currentGPS?.lastUpdated || 'N/A',
      milestones
    };

    return NextResponse.json({ success: true, shipment: publicTelemetry });
  } catch (e) {
    console.error('Error fetching tracking info:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
