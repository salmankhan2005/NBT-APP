import { NextResponse } from 'next/server';
import { Database, Trip, hashSha256 } from '@/lib/db';

// GET /api/trips - fetch all trips or driver's specific trips
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');

    const db = Database.get();
    let trips = db.trips;

    if (driverId) {
      trips = trips.filter(t => t.driverId === driverId);
    }

    // Sanitize trips to prevent exposing driver PIN hashes to client requests
    const safeTrips = trips.map(({ driverPinHash, ...safeTrip }) => safeTrip);

    return NextResponse.json({ success: true, trips: safeTrips });
  } catch (e) {
    console.error('Error fetching trips:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/trips - create a new trip (admin only)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { startingPoint, destination, agreedFreight, vehicleNumber, driverId } = body;

    if (!startingPoint || !destination || !agreedFreight || !vehicleNumber || !driverId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const db = Database.get();

    // Find driver and vehicle details
    const driver = db.drivers.find(d => d.id === driverId);
    const vehicle = db.vehicles.find(v => v.number === vehicleNumber);

    if (!driver) {
      return NextResponse.json({ success: false, error: 'Driver not found' }, { status: 400 });
    }
    if (!vehicle) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 400 });
    }

    // Generate unique Trip ID
    const randomTripNum = Math.floor(1000 + Math.random() * 9000);
    const tripId = `TRP-${randomTripNum}`;

    // Generate unique Customer Tracking ID
    const randomTrackNum = Math.floor(10000 + Math.random() * 90000);
    const trackingId = `NBT-${randomTrackNum}`;

    // Toll plaza counts and cost estimation based on distance/startingPoint (mock values)
    const tollsCount = Math.floor(3 + Math.random() * 6);
    const estimatedTollCost = tollsCount * 400;

    const newTrip: Trip = {
      id: tripId,
      driverId: driver.id,
      driverName: driver.name,
      driverPinHash: driver.pinHash,
      vehicleNumber: vehicle.number,
      vehicleType: vehicle.type,
      startingPoint,
      destination,
      tollsCount,
      estimatedTollCost,
      status: 'ASSIGNED',
      expenses: [],
      trackingId,
      currentGPS: {
        latitude: 13.0827,
        longitude: 80.2707,
        city: 'Origin Depot',
        address: startingPoint,
        lastUpdated: new Date().toLocaleTimeString()
      }
    };

    // Save to DB
    Database.update(data => {
      data.trips.push(newTrip);
      // Log activity
      data.activityLogs.unshift({
        id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tripId,
        driverId: driver.id,
        driverName: driver.name,
        vehicleNumber: vehicle.number,
        action: 'DRIVER ASSIGNED',
        timestamp: new Date().toLocaleTimeString(),
        details: `Assigned driver ${driver.name} to vehicle ${vehicle.number} for trip ${startingPoint} to ${destination}.`
      });
    });

    return NextResponse.json({ success: true, trip: newTrip });
  } catch (e) {
    console.error('Error creating trip:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/trips - update trip status/actions (start trip, update status, complete trip)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { tripId, action, odometerStart, odometerEnd, dieselStart, dieselEnd, status, driverPayment, gps } = body;

    if (!tripId) {
      return NextResponse.json({ success: false, error: 'Trip ID is required' }, { status: 400 });
    }

    let updatedTrip: Trip | null = null;
    let errorMsg: string | null = null;

    Database.update(data => {
      const trip = data.trips.find(t => t.id === tripId);
      if (!trip) {
        errorMsg = 'Trip not found';
        return;
      }

      if (action === 'START_TRIP') {
        trip.status = 'STARTED';
        trip.odometerStart = Number(odometerStart);
        trip.dieselStart = dieselStart;
        
        const now = new Date();
        trip.startDate = now.toLocaleDateString();
        trip.startTime = now.toLocaleTimeString();

        if (gps) {
          trip.currentGPS = {
            latitude: Number(gps.latitude),
            longitude: Number(gps.longitude),
            city: gps.city,
            address: gps.address,
            lastUpdated: now.toLocaleTimeString()
          };
        }

        data.activityLogs.unshift({
          id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tripId: trip.id,
          driverId: trip.driverId,
          driverName: trip.driverName,
          vehicleNumber: trip.vehicleNumber,
          action: 'TRIP STARTED',
          timestamp: now.toLocaleTimeString(),
          details: `Trip started. Odometer: ${odometerStart}, Diesel Level: ${dieselStart}.`
        });
      } else if (action === 'COMPLETE_TRIP') {
        trip.status = 'COMPLETED';
        trip.odometerEnd = Number(odometerEnd);
        trip.dieselEnd = dieselEnd;
        
        const now = new Date();
        trip.endDate = now.toLocaleDateString();
        trip.endTime = now.toLocaleTimeString();

        // Calculate Profit/Loss if agreedFreight and payment exist
        const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
        const payment = Number(driverPayment || trip.driverPayment || 0);
        trip.driverPayment = payment;
        trip.profitOrLoss = (Number(trip.agreedFreight) || 45000) - totalExpenses - payment;

        data.activityLogs.unshift({
          id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tripId: trip.id,
          driverId: trip.driverId,
          driverName: trip.driverName,
          vehicleNumber: trip.vehicleNumber,
          action: 'TRIP COMPLETED',
          timestamp: now.toLocaleTimeString(),
          details: `Trip completed. End Odometer: ${odometerEnd}, End Diesel Level: ${dieselEnd}.`
        });
      } else if (action === 'UPDATE_PAYMENT') {
        trip.driverPayment = Number(driverPayment);
        const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
        trip.profitOrLoss = (Number(trip.agreedFreight) || 45000) - totalExpenses - Number(driverPayment);
      } else if (status) {
        trip.status = status;
        data.activityLogs.unshift({
          id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tripId: trip.id,
          driverId: trip.driverId,
          driverName: trip.driverName,
          vehicleNumber: trip.vehicleNumber,
          action: `STATUS_UPDATE: ${status}`,
          timestamp: new Date().toLocaleTimeString(),
          details: `Trip status updated to ${status}.`
        });
      }

      updatedTrip = { ...trip };
    });

    if (errorMsg) {
      return NextResponse.json({ success: false, error: errorMsg }, { status: 404 });
    }

    return NextResponse.json({ success: true, trip: updatedTrip });
  } catch (e) {
    console.error('Error updating trip:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
