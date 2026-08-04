import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import puppeteer from 'puppeteer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  let browser;
  try {
    const { searchParams, origin } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const version = searchParams.get('version'); // 'company' for costing

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id parameter' }, { status: 400 });
    }

    const validTypes = ['quotation', 'contract', 'certificate', 'receipt'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // Determine the base URL for loading the page inside Puppeteer
    // We default to the current host/origin requesting the PDF
    const baseUrl = origin;
    let documentUrl = `${baseUrl}/${type}/${id}?print=true`;
    if (version === 'company') {
      documentUrl += '&version=company';
    }

    console.log(`Generating PDF for ${type} (${id}) at URL: ${documentUrl}`);

    // Retrieve authentication session cookie to forward to Puppeteer
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('nexus_session');

    // Launch headless Chromium
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
      ],
    });

    const page = await browser.newPage();

    // Set viewport to standard desktop screen
    await page.setViewport({ width: 1200, height: 800 });

    // Inject session cookie if exists
    if (sessionCookie) {
      await page.setCookie({
        name: sessionCookie.name,
        value: sessionCookie.value,
        domain: new URL(baseUrl).hostname,
        path: '/',
        httpOnly: true,
        secure: baseUrl.startsWith('https:'),
      });
    }

    // Navigate to print-ready page
    await page.goto(documentUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for the specific container to ensure database data is fully loaded and rendered
    let selector = '';
    if (type === 'receipt') selector = '#receipt-preview-page';
    else if (type === 'certificate') selector = '#certificate-preview-page';
    else if (type === 'contract') selector = '#contract-preview-page';
    else if (type === 'quotation') {
      selector = version === 'company' ? '#company-costing-page' : '#quotation-page-1';
    }

    await page.waitForSelector(selector, { timeout: 15000 });

    // Wait an extra brief moment for signatures or styles to paint
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
      },
      preferCSSPageSize: true,
    });

    await browser.close();
    browser = null;

    // Define filename for download
    const customFilename = searchParams.get('filename');
    const filename = customFilename ? decodeURIComponent(customFilename) : `${type}_${id}_${version || 'client'}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    if (browser) {
      try {
        await (browser as any).close();
      } catch (err) {
        console.error('Error closing browser:', err);
      }
    }
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}
