import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { html, filename } = await request.json();

    if (!html) {
      return NextResponse.json({ error: 'لم يتم إرسال كود HTML' }, { status: 400 });
    }

    // Send the HTML to a standard cloud service that supports RTL/Arabic and Tailwind CSS
    const response = await fetch('https://html2pdf.app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: html,
        apiKey: 'public', // General public key for conversions
        waitFor: 2,
        params: { 
          format: 'A4', 
          printBackground: true,
          margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
          waitFor: 2
        }
      }),
    });

    if (!response.ok) throw new Error('Failed to generate PDF file on the remote server');

    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'document'}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('PDF Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في السيرفر', details: error.message }, { status: 500 });
  }
}
