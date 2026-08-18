import { NextResponse } from 'next/server';
import { Database, Expense, GPSLocation } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tripId, category, amount, reason, liters, location, receiptUri } = body;

    if (!tripId || !category || amount === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    let errorMsg: string | null = null;
    let newExpense: Expense | null = null;

    Database.update(data => {
      const trip = data.trips.find(t => t.id === tripId);
      if (!trip) {
        errorMsg = 'Trip not found';
        return;
      }

      const parsedLocation: GPSLocation | undefined = location ? {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        city: location.city || 'Unknown',
        address: location.address || 'Unknown',
        lastUpdated: new Date().toLocaleTimeString()
      } : undefined;

      newExpense = {
        id: `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        category,
        amount: Number(amount),
        reason: reason || '',
        liters: liters ? Number(liters) : undefined,
        location: parsedLocation,
        receiptUri: receiptUri || undefined,
        timestamp: new Date().toLocaleTimeString()
      };

      trip.expenses.push(newExpense);
      
      // Update status if it's on transit
      if (trip.status === 'STARTED') {
        trip.status = 'ON_THE_WAY';
      }

      // Log activity
      data.activityLogs.unshift({
        id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tripId: trip.id,
        driverId: trip.driverId,
        driverName: trip.driverName,
        vehicleNumber: trip.vehicleNumber,
        action: `${category}_EXPENSE_ADDED`,
        timestamp: new Date().toLocaleTimeString(),
        details: `Added ${category} expense of ₹${amount}. Reason/Details: ${reason || 'N/A'}.`
      });
    });

    if (errorMsg) {
      return NextResponse.json({ success: false, error: errorMsg }, { status: 404 });
    }

    return NextResponse.json({ success: true, expense: newExpense });
  } catch (e) {
    console.error('Error adding expense:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
