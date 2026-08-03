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
    const receipt = await db.collection('receipts').findOne({ id });
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }
    return NextResponse.json(receipt, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (e) {
    console.error(`Error fetching receipt ${e}:`);
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 });
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
    const result = await db.collection('receipts').deleteOne({ id });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error(`Error deleting receipt ${e}:`);
    return NextResponse.json({ error: 'Failed to delete receipt' }, { status: 500 });
  }
}
