import { NextResponse } from 'next/server';
import { Database } from '@/lib/db';

export async function GET() {
  try {
    const db = Database.get();
    return NextResponse.json({ success: true, activityLogs: db.activityLogs || [] });
  } catch (e) {
    console.error('Error fetching logs:', e);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
