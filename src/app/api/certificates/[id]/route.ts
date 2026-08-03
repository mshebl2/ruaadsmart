import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();
    const certificate = await db.collection('certificates').findOne({ id });
    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }
    return NextResponse.json(certificate, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (e) {
    console.error(`Error fetching certificate ${e}:`);
    return NextResponse.json({ error: 'Failed to fetch certificate' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection('certificates').deleteOne({ id });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error(`Error deleting certificate ${e}:`);
    return NextResponse.json({ error: 'Failed to delete certificate' }, { status: 500 });
  }
}
