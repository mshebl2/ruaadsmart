import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const quotations = await db.collection('quotations').find({}).toArray();
    const certificates = await db.collection('certificates').find({}).toArray();
    const receipts = await db.collection('receipts').find({}).toArray();
    const contracts = await db.collection('contracts').find({}).toArray();
    const letters = await db.collection('letters').find({}).toArray();
    const settings = await db.collection('settings').findOne({ id: 'global_settings' });

    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      quotations,
      certificates,
      receipts,
      contracts,
      letters,
      settings: settings || {}
    };

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=backup-smart-nexus-${new Date().toISOString().split('T')[0]}.json`
      }
    });
  } catch (e) {
    console.error('Error exporting backup:', e);
    return NextResponse.json({ error: 'Failed to export backup' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const backupData = await request.json();

    if (!backupData || typeof backupData !== 'object') {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Restore quotations if present
    if (Array.isArray(backupData.quotations)) {
      for (const item of backupData.quotations) {
        if (item.id) {
          const doc = { ...item };
          delete doc._id;
          await db.collection('quotations').replaceOne({ id: item.id }, doc, { upsert: true });
        }
      }
    }

    // Restore certificates if present
    if (Array.isArray(backupData.certificates)) {
      for (const item of backupData.certificates) {
        if (item.id) {
          const doc = { ...item };
          delete doc._id;
          await db.collection('certificates').replaceOne({ id: item.id }, doc, { upsert: true });
        }
      }
    }

    // Restore receipts if present
    if (Array.isArray(backupData.receipts)) {
      for (const item of backupData.receipts) {
        if (item.id) {
          const doc = { ...item };
          delete doc._id;
          await db.collection('receipts').replaceOne({ id: item.id }, doc, { upsert: true });
        }
      }
    }

    // Restore contracts if present
    if (Array.isArray(backupData.contracts)) {
      for (const item of backupData.contracts) {
        if (item.id) {
          const doc = { ...item };
          delete doc._id;
          await db.collection('contracts').replaceOne({ id: item.id }, doc, { upsert: true });
        }
      }
    }

    // Restore letters if present
    if (Array.isArray(backupData.letters)) {
      for (const item of backupData.letters) {
        if (item.id) {
          const doc = { ...item };
          delete doc._id;
          await db.collection('letters').replaceOne({ id: item.id }, doc, { upsert: true });
        }
      }
    }

    // Restore settings if present
    if (backupData.settings && typeof backupData.settings === 'object') {
      const doc = { ...backupData.settings, id: 'global_settings' };
      delete doc._id;
      await db.collection('settings').replaceOne({ id: 'global_settings' }, doc, { upsert: true });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error restoring backup:', e);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
  }
}
