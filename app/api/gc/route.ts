import { NextResponse } from 'next/server';
import { Database, GcNote } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthFilter = searchParams.get('month'); // e.g. "MAR-26"

    const db = Database.get();
    let gcNotes = db.gcNotes;

    if (monthFilter) {
      gcNotes = gcNotes.filter(n => n.id.startsWith(monthFilter.toUpperCase()));
    }

    return NextResponse.json({ success: true, gcNotes });
  } catch (e) {
    console.error('Error fetching GC notes:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      date,
      from,
      to,
      truckNumber,
      consignor,
      consignee,
      consignorGst,
      consigneeGst,
      items,
      freight,
      cgst,
      sgst,
      igst,
      total,
      lessAdvance,
      balance,
      payableAt,
      gstPayee,
      deliveryAt,
      pan,
      driverName,
      dlNumber,
      lorryOwner,
      bankDetails,
      terms
    } = body;

    if (!from || !to || !truckNumber || !consignor || !consignee || !items || !items.length) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const db = Database.get();

    // 1. Calculate the Automatic GC Note Number
    // Input date format: "YYYY-MM-DD"
    const dateObj = date ? new Date(date) : new Date();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mmm = months[dateObj.getMonth()];
    const yy = dateObj.getFullYear().toString().substring(2);
    const prefix = `${mmm}-${yy}`; // e.g. "JUL-26"

    // Count existing notes for this month
    const monthlyNotes = db.gcNotes.filter(n => n.id.startsWith(prefix));
    const nextSeq = monthlyNotes.length + 1;
    const sequenceStr = nextSeq < 10 ? `0${nextSeq}` : `${nextSeq}`;
    const gcNoteId = `${prefix}-${sequenceStr}`;

    const newGcNote: GcNote = {
      id: gcNoteId,
      date: date || new Date().toISOString().split('T')[0],
      from,
      to,
      truckNumber: truckNumber.toUpperCase(),
      consignor,
      consignee,
      consignorGst: consignorGst || '',
      consigneeGst: consigneeGst || '',
      items,
      freight: Number(freight || 0),
      cgst: Number(cgst || 0),
      sgst: Number(sgst || 0),
      igst: Number(igst || 0),
      total: Number(total || 0),
      lessAdvance: Number(lessAdvance || 0),
      balance: Number(balance || 0),
      payableAt: payableAt || '',
      gstPayee: gstPayee || 'Consignor',
      deliveryAt: deliveryAt || 'Door Delivery',
      pan: pan || '',
      driverName: driverName || '',
      driverSignature: driverName ? driverName.split(' ')[0] : '', // Simple signature mockup
      dlNumber: dlNumber || '',
      lorryOwner: lorryOwner || 'Self',
      bankDetails: bankDetails || '',
      terms: terms || '1. Goods carried at owner risk. 2. Demurrage charged after 24 hrs. 3. Disputes subject to Chennai jurisdiction.'
    };

    Database.update(data => {
      data.gcNotes.push(newGcNote);
    });

    return NextResponse.json({ success: true, gcNote: newGcNote });
  } catch (e) {
    console.error('Error creating GC note:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
