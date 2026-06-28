import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('ruaad_smart_db');
    const certificates = await db.collection('certificates').find({}).toArray();
    // Sort by updatedAt descending
    certificates.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json(certificates);
  } catch (e) {
    console.error('Error fetching certificates:', e);
    return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing certificate ID' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db('ruaad_smart_db');
    
    // Upsert certificate using ID
    const result = await db.collection('certificates').replaceOne(
      { id: body.id },
      body,
      { upsert: true }
    );
    
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error saving certificate:', e);
    return NextResponse.json({ error: 'Failed to save certificate' }, { status: 500 });
  }
}
