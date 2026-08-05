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
    const letter = await db.collection('letters').findOne({ id });
    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }
    return NextResponse.json(letter, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (e) {
    console.error('Error fetching letter:', e);
    return NextResponse.json({ error: 'Failed to fetch letter' }, { status: 500 });
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
    const result = await db.collection('letters').deleteOne({ id });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('Error deleting letter:', e);
    return NextResponse.json({ error: 'Failed to delete letter' }, { status: 500 });
  }
}
