import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('smart_nexus_db');
    const receipts = await db.collection('receipts').find({}).toArray();
    // Sort by updatedAt descending
    receipts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json(receipts, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (e) {
    console.error('Error fetching receipts:', e);
    return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing receipt ID' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db('smart_nexus_db');
    
    // Remove immutable MongoDB _id if present to prevent update errors
    delete body._id;

    // Upsert receipt using ID
    const result = await db.collection('receipts').replaceOne(
      { id: body.id },
      body,
      { upsert: true }
    );
    
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error saving receipt:', e);
    return NextResponse.json({ error: 'Failed to save receipt' }, { status: 500 });
  }
}
