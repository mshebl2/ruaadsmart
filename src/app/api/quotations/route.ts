import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_db');
    const quotations = await db.collection('quotations').find({}).toArray();
    // Sort by updatedAt descending
    quotations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json(quotations);
  } catch (e) {
    console.error('Error fetching quotations:', e);
    return NextResponse.json({ error: 'Failed to fetch quotations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing quotation ID' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db('ruaad_smart_db');
    
    // Upsert quotation using ID
    const result = await db.collection('quotations').replaceOne(
      { id: body.id },
      body,
      { upsert: true }
    );
    
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error saving quotation:', e);
    return NextResponse.json({ error: 'Failed to save quotation' }, { status: 500 });
  }
}
