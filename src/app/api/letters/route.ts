import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const letters = await db.collection('letters').find({}).toArray();
    // Sort by updatedAt descending
    letters.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json(letters, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (e) {
    console.error('Error fetching letters:', e);
    return NextResponse.json({ error: 'Failed to fetch letters' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing letter ID' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db();
    
    delete body._id;

    const result = await db.collection('letters').replaceOne(
      { id: body.id },
      body,
      { upsert: true }
    );
    
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error saving letter:', e);
    return NextResponse.json({ error: 'Failed to save letter' }, { status: 500 });
  }
}
