import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const settings = await db.collection('settings').findOne({ id: 'global_settings' });
    
    return NextResponse.json(settings || {});
  } catch (e) {
    console.error('Error fetching settings:', e);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db();
    
    // Always use the same ID for global settings
    const settingsData = { ...body, id: 'global_settings', updatedAt: new Date().toISOString() };
    delete settingsData._id; // Remove _id if it exists to prevent update issues

    const result = await db.collection('settings').replaceOne(
      { id: 'global_settings' },
      settingsData,
      { upsert: true }
    );
    
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error saving settings:', e);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
