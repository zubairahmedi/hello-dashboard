const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Prepare writable Chrome data dirs
const chromeDirs = [
  '/tmp/chrome-user-data',
  '/tmp/chrome-data',
  '/tmp/chrome-cache',
  '/tmp/chrome-crashpad'
];
chromeDirs.forEach(dir => {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.warn(`[PDF Service] Could not create ${dir}: ${err.message}`);
  }
});

const logStep = (msg, extra = {}) => {
  const payload = Object.keys(extra).length ? ` | ${JSON.stringify(extra)}` : '';
  console.log(`[PDF Service] ${msg}${payload}`);
};

// CORS: Allow dashboard origin
const corsOptions = {
  origin: 'https://dashboard.aiclinicgenius.com',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pdf-generator', timestamp: new Date().toISOString() });
});

// PDF Generation
app.post('/api/generate-pdf', async (req, res) => {
  logStep('Received PDF generation request');

  let browser;
  try {
    const { html, css, filename = 'report.pdf', format = 'a4', orientation = 'portrait', warmup = false, options = {} } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }
    
    const pdfFormat = format || options.format || 'a4';
    const pdfOrientation = orientation || options.orientation || 'portrait';
    
    logStep(`Generating PDF: ${filename}, format=${pdfFormat}, orientation=${pdfOrientation}, warmup=${warmup}`);

    // Use serverless Chromium
    const launchArgs = chromium.args.concat([
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]);

    logStep('Launching Chromium', { args: launchArgs });

    browser = await puppeteer.launch({
      headless: chromium.headless,
      args: launchArgs,
      executablePath: await chromium.executablePath()
    });

    logStep('Chromium launched successfully');

    const page = await browser.newPage();
    logStep('New page created');

    // Set viewport
    await page.setViewport({
      width: pdfOrientation === 'landscape' ? 1920 : 1280,
      height: pdfOrientation === 'landscape' ? 1080 : 1600,
      deviceScaleFactor: 2
    });

    // Build HTML with CSS
    const fullHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            ${css || ''}
            body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    // Load content
    await page.setContent(fullHTML, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });
    logStep('HTML content loaded');

    // Wait for charts
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      return Promise.all([
        ...Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
          })),
        document.fonts.ready ? document.fonts.ready : Promise.resolve()
      ]);
    });
    logStep('Assets loaded');

    await page.waitForTimeout(1000);

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: pdfFormat.toUpperCase(),
      landscape: pdfOrientation === 'landscape',
      printBackground: true,
      margin: options.margin || { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });

    await browser.close();
    browser = null;

    if (warmup) {
      logStep('Warmup pass completed');
      return res.json({ success: true, warmup: true });
    }

    logStep(`PDF generated: ${pdfBuffer.length} bytes`);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error('[PDF Service] Error:', error.message);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('[PDF Service] Error closing browser:', e.message);
      }
    }

    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error.message
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[PDF Service] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[PDF Service] Running on port ${PORT}`);
  console.log(`[PDF Service] Health: http://localhost:${PORT}/health`);
  console.log(`[PDF Service] PDF API: http://localhost:${PORT}/api/generate-pdf`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[PDF Service] Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[PDF Service] Shutting down...');
  process.exit(0);
});
