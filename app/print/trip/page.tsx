"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface GPSLocation {
  latitude: number;
  longitude: number;
  city: string;
  address: string;
  lastUpdated: string;
}

interface Expense {
  id: string;
  category: 'FUEL' | 'TOLL' | 'RTO' | 'POLICE' | 'LORRY' | 'OTHER';
  amount: number;
  reason?: string;
  liters?: number;
  location?: GPSLocation;
  timestamp: string;
}

interface Trip {
  id: string;
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  vehicleType: string;
  startingPoint: string;
  destination: string;
  tollsCount: number;
  estimatedTollCost: number;
  status: string;
  odometerStart?: number;
  odometerEnd?: number;
  dieselStart?: string;
  dieselEnd?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  expenses: Expense[];
  podPhotoUri?: string;
  podSignature?: string;
  podNotes?: string;
  trackingId: string;
  driverPayment?: number;
  profitOrLoss?: number;
}

function TripPrintContent() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get('id');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;

    const fetchTrip = async () => {
      try {
        const res = await fetch(`/api/trips`);
        const data = await res.json();
        if (data.success) {
          const found = data.trips.find((t: Trip) => t.id === tripId);
          setTrip(found || null);
        }
      } catch (e) {
        console.error('Error fetching trip for print:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [tripId]);

  useEffect(() => {
    if (trip) {
      // Trigger print dialog once data is loaded and rendered
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [trip]);

  if (loading) {
    return <div className="p-8 text-center text-body-md">Loading print preview...</div>;
  }

  if (!trip) {
    return <div className="p-8 text-center text-body-md text-error">Trip not found ({tripId})</div>;
  }

  const fuelExpenses = trip.expenses.filter(e => e.category === 'FUEL');
  const tollExpenses = trip.expenses.filter(e => e.category === 'TOLL');
  const rtoExpenses = trip.expenses.filter(e => e.category === 'RTO');
  const policeExpenses = trip.expenses.filter(e => e.category === 'POLICE');
  const lorryExpenses = trip.expenses.filter(e => e.category === 'LORRY');
  const otherExpenses = trip.expenses.filter(e => e.category === 'OTHER');

  const totalFuel = fuelExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalToll = tollExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalRto = rtoExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPolice = policeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalLorry = lorryExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOther = otherExpenses.reduce((sum, e) => sum + e.amount, 0);

  const grandTotalExpenses = totalFuel + totalToll + totalRto + totalPolice + totalLorry + totalOther;
  const driverPayment = trip.driverPayment || 0;
  const agreedFreight = 45000; // Mock base or custom
  const finalProfitLoss = agreedFreight - grandTotalExpenses - driverPayment;

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white text-black print:p-0 print:max-w-full">
      {/* Header */}
      <div className="border-b-2 border-primary-container pb-4 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-container">NEW BALAJI TRANSPORTS</h1>
          <p className="text-xs text-on-surface-variant font-semibold">NEW BALAJI TRANSPORTS COMMAND CENTER</p>
          <p className="text-xs text-outline">Pan-India Freight Logistics & Fleet Telemetry Solutions</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-secondary">TRIP SUMMARY REPORT</h2>
          <p className="text-sm font-semibold">Trip ID: <span className="font-mono">{trip.id}</span></p>
          <p className="text-xs text-outline">Tracking ID: {trip.trackingId}</p>
        </div>
      </div>

      {/* Info Block */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
        <div className="border p-3 rounded">
          <h3 className="font-bold border-b pb-1 mb-2 text-primary">Trip Details</h3>
          <p><strong>Driver Name:</strong> {trip.driverName} (ID: {trip.driverId})</p>
          <p><strong>Vehicle Number:</strong> {trip.vehicleNumber} ({trip.vehicleType})</p>
          <p><strong>Starting Point:</strong> {trip.startingPoint}</p>
          <p><strong>Destination:</strong> {trip.destination}</p>
          <p><strong>Tolls Count:</strong> {trip.tollsCount} plazas (Est: ₹{trip.estimatedTollCost})</p>
        </div>
        <div className="border p-3 rounded">
          <h3 className="font-bold border-b pb-1 mb-2 text-primary">Status & Telemetry</h3>
          <p><strong>Current Status:</strong> {trip.status}</p>
          <p><strong>Start Date/Time:</strong> {trip.startDate ? `${trip.startDate} ${trip.startTime || ''}` : 'N/A'}</p>
          <p><strong>End Date/Time:</strong> {trip.endDate ? `${trip.endDate} ${trip.endTime || ''}` : 'N/A'}</p>
          <p><strong>Odometer:</strong> Start: {trip.odometerStart || 'N/A'} km | End: {trip.odometerEnd || 'N/A'} km</p>
          <p><strong>Diesel Level:</strong> Start: {trip.dieselStart || 'N/A'} | End: {trip.dieselEnd || 'N/A'}</p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="mb-6">
        <h3 className="font-bold text-sm mb-2 text-primary border-b pb-1">Detailed Operating Expenses</h3>
        <table className="w-full text-left text-xs border-collapse border">
          <thead>
            <tr className="bg-surface-container border-b">
              <th className="p-2 border">Category</th>
              <th className="p-2 border">Timestamp</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Details / Odometer</th>
              <th className="p-2 border">GPS Location</th>
            </tr>
          </thead>
          <tbody>
            {trip.expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-3 text-center text-outline">No expenses registered on this trip.</td>
              </tr>
            ) : (
              trip.expenses.map((exp) => (
                <tr key={exp.id} className="border-b">
                  <td className="p-2 border font-bold">{exp.category}</td>
                  <td className="p-2 border">{exp.timestamp}</td>
                  <td className="p-2 border font-semibold">₹{exp.amount}</td>
                  <td className="p-2 border">
                    {exp.category === 'FUEL' ? `${exp.liters} Liters @ ₹${(exp.amount / (exp.liters || 1)).toFixed(2)}/L` : ''}
                    {exp.reason && ` ${exp.reason}`}
                  </td>
                  <td className="p-2 border">
                    {exp.location ? `${exp.location.city} (${exp.location.latitude.toFixed(4)}, ${exp.location.longitude.toFixed(4)})` : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-surface-container font-bold">
              <td colSpan={2} className="p-2 border text-right">Grand Total Operating Expenses:</td>
              <td colSpan={3} className="p-2 border text-primary">₹{grandTotalExpenses}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Expense Summary Matrix */}
      <div className="grid grid-cols-6 gap-2 mb-6 text-center text-xs">
        <div className="border p-2 bg-surface-container-low rounded">
          <p className="text-[10px] text-outline font-semibold uppercase">Fuel Total</p>
          <p className="font-bold text-sm">₹{totalFuel}</p>
        </div>
        <div className="border p-2 bg-surface-container-low rounded">
          <p className="text-[10px] text-outline font-semibold uppercase">Toll Total</p>
          <p className="font-bold text-sm">₹{totalToll}</p>
        </div>
        <div className="border p-2 bg-surface-container-low rounded">
          <p className="text-[10px] text-outline font-semibold uppercase">RTO Total</p>
          <p className="font-bold text-sm">₹{totalRto}</p>
        </div>
        <div className="border p-2 bg-surface-container-low rounded">
          <p className="text-[10px] text-outline font-semibold uppercase">Police Total</p>
          <p className="font-bold text-sm">₹{totalPolice}</p>
        </div>
        <div className="border p-2 bg-surface-container-low rounded">
          <p className="text-[10px] text-outline font-semibold uppercase">Lorry Total</p>
          <p className="font-bold text-sm">₹{totalLorry}</p>
        </div>
        <div className="border p-2 bg-surface-container-low rounded">
          <p className="text-[10px] text-outline font-semibold uppercase">Other Total</p>
          <p className="font-bold text-sm">₹{totalOther}</p>
        </div>
      </div>

      {/* Financial Settlement */}
      <div className="border p-4 rounded bg-surface-container-lowest text-xs mb-8">
        <h3 className="font-bold text-sm mb-2 text-primary border-b pb-1">Trip Profit & Loss Analysis</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between py-1">
              <span>Agreed Freight / Rent:</span>
              <span className="font-bold">₹{agreedFreight}</span>
            </div>
            <div className="flex justify-between py-1 text-error border-b pb-2">
              <span>Less Total Operating Expenses:</span>
              <span>- ₹{grandTotalExpenses}</span>
            </div>
            <div className="flex justify-between py-2 text-primary font-bold text-sm">
              <span>Net Route Earnings:</span>
              <span>₹{agreedFreight - grandTotalExpenses}</span>
            </div>
          </div>
          <div className="border-l pl-4">
            <div className="flex justify-between py-1 text-on-surface-variant">
              <span>Driver Operating Payment:</span>
              <span className="font-semibold">₹{driverPayment}</span>
            </div>
            <div className="flex justify-between py-2 border-t mt-2 font-bold text-sm">
              <span>Final Settlement:</span>
              <span className={finalProfitLoss >= 0 ? "text-success" : "text-error"}>
                {finalProfitLoss >= 0 ? `PROFIT: +₹${finalProfitLoss}` : `LOSS: -₹${Math.abs(finalProfitLoss)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-16 text-center text-xs">
        <div>
          <div className="h-12 flex items-end justify-center">
            {trip.podSignature ? (
              <span className="font-serif italic text-lg text-outline">{trip.podSignature}</span>
            ) : (
              <span className="text-outline border-b border-dashed w-32"></span>
            )}
          </div>
          <p className="border-t pt-1 font-semibold">Driver Signature / Handover</p>
          <p className="text-[10px] text-outline">Date: {trip.endDate || 'Pending'}</p>
        </div>
        <div>
          <div className="h-12 flex items-end justify-center">
            <span className="font-mono text-outline font-bold">NBT Dispatcher</span>
          </div>
          <p className="border-t pt-1 font-semibold">Authorized Signatory (New Balaji Transports)</p>
          <p className="text-[10px] text-outline">Date: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Print Help Banner */}
      <div className="mt-8 text-center text-[10px] text-outline border-t pt-4 print:hidden">
        Press <strong>Ctrl + P</strong> (Windows) or <strong>Cmd + P</strong> (Mac) if the print dialog did not open automatically.
      </div>
    </div>
  );
}

export default function TripPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-body-md">Initializing print view...</div>}>
      <TripPrintContent />
    </Suspense>
  );
}
