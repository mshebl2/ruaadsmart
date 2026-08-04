import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: "Server-side PDF generation is disabled. Using client-side generation instead." });
}
