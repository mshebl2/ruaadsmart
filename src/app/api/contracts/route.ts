import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('smart_nexus_db');
    const contracts = await db.collection('contracts').find({}).toArray();
    // Sort by updatedAt descending
    contracts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json(contracts, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (e) {
    console.error('Error fetching contracts:', e);
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing contract ID' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db('smart_nexus_db');
    
    // Remove immutable MongoDB _id if present to prevent update errors
    delete body._id;

    // Upsert contract using ID
    const result = await db.collection('contracts').replaceOne(
      { id: body.id },
      body,
      { upsert: true }
    );
    
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error saving contract:', e);
    return NextResponse.json({ error: 'Failed to save contract' }, { status: 500 });
  }
}
