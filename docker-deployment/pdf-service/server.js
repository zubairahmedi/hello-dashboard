const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS configuration (multiple allowed origins)
const corsOptions = {
  origin: [
    'https://dashboard.aiclinicgenius.com',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
// Explicitly handle preflight
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pdf-generator', timestamp: new Date().toISOString() });
});

// PDF Generation endpoint
app.post('/api/generate-pdf', async (req, res) => {
  console.log('[PDF Service] Received PDF generation request');
  
  let browser;
  try {
    const { html, css, filename = 'report.pdf', format = 'a4', orientation = 'portrait', warmup = false } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    console.log(`[PDF Service] Generating PDF: ${filename}, warmup=${warmup}`);

    // Launch Puppeteer with optimized settings for Docker
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--no-zygote',
        '--single-process'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });

    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: orientation === 'landscape' ? 1920 : 1280,
      height: orientation === 'landscape' ? 1080 : 1600,
      deviceScaleFactor: 2
    });

    // Construct complete HTML with CSS
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

    // Load HTML content
    await page.setContent(fullHTML, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });

    // Wait for charts to render (Recharts needs extra time)
    await page.waitForTimeout(2000);

    // Ensure all images and fonts are loaded
    await page.evaluate(() => {
      return Promise.all([
        ...Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
          })),
        document.fonts.ready
      ]);
    });

    // Additional wait for dynamic content
    await page.waitForTimeout(1000);

    console.log('[PDF Service] Content loaded, generating PDF...');

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: format.toUpperCase(),
      landscape: orientation === 'landscape',
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();
    browser = null;

    // If this is a warmup pass, just return success
    if (warmup) {
      console.log('[PDF Service] Warmup pass completed');
      return res.json({ success: true, warmup: true });
    }

    // Send PDF as response
    console.log(`[PDF Service] PDF generated successfully: ${pdfBuffer.length} bytes`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('[PDF Service] Error generating PDF:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('[PDF Service] Error closing browser:', closeError);
      }
    }

    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[PDF Service] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[PDF Service] Server running on port ${PORT}`);
  console.log(`[PDF Service] Health check: http://localhost:${PORT}/health`);
  console.log(`[PDF Service] PDF endpoint: http://localhost:${PORT}/api/generate-pdf`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[PDF Service] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[PDF Service] SIGINT received, shutting down gracefully...');
  process.exit(0);
});
