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
    const quotation = await db.collection('quotations').findOne({ id });
    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }
    return NextResponse.json(quotation, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (e) {
    console.error(`Error fetching quotation ${e}:`);
    return NextResponse.json({ error: 'Failed to fetch quotation' }, { status: 500 });
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
    const result = await db.collection('quotations').deleteOne({ id });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error(`Error deleting quotation ${e}:`);
    return NextResponse.json({ error: 'Failed to delete quotation' }, { status: 500 });
  }
}
