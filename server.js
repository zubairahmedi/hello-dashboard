/**
 * Puppeteer-based PDF Generation Server
 * Handles server-side rendering of HTML to PDF with full fidelity
 */
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'build')));

// Store browser instance (reuse for performance)
let browserInstance = null;

/**
 * Launch Puppeteer browser with optimizations
 */
async function getBrowser() {
  if (browserInstance) {
    return browserInstance;
  }

  try {
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    // Auto-restart on disconnect
    browserInstance.on('disconnected', () => {
      browserInstance = null;
    });

    return browserInstance;
  } catch (error) {
    console.error('Failed to launch Puppeteer:', error);
    browserInstance = null;
    throw error;
  }
}

/**
 * POST /api/generate-pdf
 * Generates a PDF from HTML content using Puppeteer
 *
 * Request body:
 * {
 *   html: string (full HTML to render),
 *   filename: string (output filename),
 *   options: {
 *     format: 'A4' | 'Letter' (default: 'A4'),
 *     orientation: 'portrait' | 'landscape' (default: 'portrait'),
 *     margin: { top, bottom, left, right } (in inches)
 *   }
 * }
 */
app.post('/api/generate-pdf', async (req, res) => {
  const { html, filename = 'report.pdf', options = {} } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content is required' });
  }

  let browser = null;
  let page = null;

  try {
    console.log(`\n[PDF START] Generating PDF: ${filename}`);
    console.log(`[PDF] Export filename: ${filename}`);
    browser = await getBrowser();

    page = await browser.newPage();

    // Set viewport to match A4 PDF width for better rendering
    // A4 is 210mm ≈ 800px at 96dpi, use 1400px for wider content (consultant tables, etc)
    await page.setViewport({ width: 1400, height: 1600 });
    console.log(`[PDF] ✓ Viewport set to 1400x1600`);

    // Inject the HTML content
    console.log(`[PDF] Injecting HTML content...`);
    await page.setContent(html, { waitUntil: 'networkidle2' });
    console.log(`[PDF] ✓ HTML injected, networkidle2 complete`);

    // Wait for all fonts to be ready (first-render issues often come from late-loading fonts)
    try {
      await page.evaluate(() => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()));
      console.log('[PDF] ✓ document.fonts.ready resolved');
    } catch (e) {
      console.warn('[PDF] ⚠️ document.fonts.ready failed or unsupported, continuing...');
    }

    // CRITICAL: Wait for ALL Recharts to TRULY finish rendering
    // Recharts progressively renders elements - text labels animate in asynchronously
    // We must wait for these animations to complete, not just check DOM presence
    console.log(`[PDF] Starting chart render verification loop...`);
    let attemptCount = 0;
    const maxAttempts = 80; // 80 * 500ms = 40 seconds max (doubled timeout)
    
    while (attemptCount < maxAttempts) {
      const chartsData = await page.evaluate(() => {
        const rechartsSvgs = document.querySelectorAll('.recharts-wrapper svg');
        
        if (rechartsSvgs.length === 0) {
          return { ready: false, svgCount: 0, details: [] };
        }
        
        // Check each SVG for COMPLETE render state
        const details = Array.from(rechartsSvgs).map((svg, idx) => {
          const parent = svg.closest('.recharts-wrapper') || svg.parentElement;
          const parentInfo = parent ? {
            id: parent.id || null,
            className: parent.className ? parent.className.toString() : null,
            htmlLen: parent.innerHTML ? parent.innerHTML.length : 0
          } : { id: null, className: null, htmlLen: 0 };
          const circles = svg.querySelectorAll('circle').length;
          const paths = svg.querySelectorAll('path').length;
          const textElements = svg.querySelectorAll('text');
          const texts = textElements.length;
          const rect = svg.getBoundingClientRect();
          const viewBox = svg.getAttribute('viewBox');
          
          // NEW: Check if this is a complex chart (BarChart, LineChart, etc.) that SHOULD have text
          // Simple heuristic: if it has 3+ paths, it's likely a multi-series chart that needs labels
          const isComplexChart = paths >= 3;
          
          // Check that text elements are actually rendered (have non-zero opacity and dimensions)
          let visibleTexts = 0;
          textElements.forEach(textEl => {
            const style = window.getComputedStyle(textEl);
            const opacity = parseFloat(style.opacity);
            const visibility = style.visibility;
            const display = style.display;
            const textRect = textEl.getBoundingClientRect();
            // Text is considered visible if: opacity > 0.5, not hidden, not display:none, and has dimensions
            if (opacity > 0.5 && visibility !== 'hidden' && display !== 'none' && (textRect.width > 0 || textRect.height > 0)) {
              visibleTexts++;
            }
          });
          
          const hasContent = circles > 0 || paths > 0 || texts > 0;
          const hasDimensions = rect.width > 0 && rect.height > 0;
          
          // STRICTER logic:
          // - If it's a complex chart (3+ paths) but has 0 text -> NOT READY (text will appear)
          // - If it has text, require 70% to be visible
          // - If it's simple (buttons, icons), just need content + dimensions
          let textReady = true;
          if (isComplexChart && texts === 0) {
            // Complex chart with NO text yet = not ready, text will come
            textReady = false;
          } else if (texts > 0) {
            // Has text elements - require 70% visible
            textReady = visibleTexts >= Math.ceil(texts * 0.7);
          }
          // else: simple chart with no text = already ready
          
          const ready = hasContent && hasDimensions && textReady;
          
          return {
            index: idx,
            circles,
            paths,
            texts,
            visibleTexts,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            viewBox,
            isComplexChart,
            hasContent,
            hasDimensions,
            textReady,
            ready,
            parent: parentInfo
          };
        });
        
        const allReady = details.every(d => d.ready);
        
        return {
          ready: allReady,
          svgCount: rechartsSvgs.length,
          details
        };
      });

      // If we are stuck waiting for text on any chart, trigger a resize to force Recharts to finalize labels
      if (!chartsData.ready) {
        const hasWaitingText = chartsData.details.some(d => d.isComplexChart && d.texts === 0);
        if (hasWaitingText && attemptCount % 10 === 9) {
          console.log('[PDF] ↻ Forcing Recharts reflow via resize event (waiting for missing text)...');
          await page.evaluate(() => {
            window.dispatchEvent(new Event('resize'));
          });
        }
      }
      
      // Log all SVG details from server
      console.log(`[PDF] Render check attempt ${attemptCount + 1}/${maxAttempts}:`);
      console.log(`[PDF]   Found ${chartsData.svgCount} SVGs`);
      
      chartsData.details.forEach(d => {
        const status = d.ready ? '✓' : '❌';
        const textStatus = d.texts > 0 ? `(${d.visibleTexts}/${d.texts} visible)` : d.isComplexChart ? '(WAITING FOR TEXT)' : '(no text)';
        console.log(`[PDF]   SVG[${d.index}] ${status} - content:(circles:${d.circles} paths:${d.paths} texts:${d.texts}${d.texts > 0 || d.isComplexChart ? ` ${textStatus}` : ''}) dims:(${d.width}x${d.height}) viewBox:${d.viewBox}`);
      });
      
      if (chartsData.ready) {
        console.log(`[PDF] ✓✓✓ ALL CHARTS READY! (after attempt ${attemptCount + 1}/${maxAttempts}, ${(attemptCount + 1) * 500}ms)`);
        break;
      }
      
      attemptCount++;
      console.log(`[PDF] ⏳ Not ready yet, waiting 500ms...`);
      await page.waitForTimeout(500);
    }
    
    if (attemptCount >= maxAttempts) {
      console.warn(`[PDF] ⚠️⚠️⚠️ TIMEOUT! Waited ${maxAttempts * 500}ms - attempting one last reflow before proceeding`);

      try {
        await page.screenshot({ path: 'pdf-timeout.png', fullPage: false });
        console.warn('[PDF] Saved timeout screenshot: pdf-timeout.png');
      } catch (e) {
        console.warn('[PDF] Failed to capture timeout screenshot:', e);
      }

      // Last-chance reflow: force a resize and give Recharts a moment to lay out text
      await page.evaluate(() => {
        window.dispatchEvent(new Event('resize'));
      });
      await page.waitForTimeout(1500);

      // Re-check readiness after reflow
      const finalCheck = await page.evaluate(() => {
        const rechartsSvgs = document.querySelectorAll('.recharts-wrapper svg');
        const details = Array.from(rechartsSvgs).map((svg, idx) => {
          const parent = svg.closest('.recharts-wrapper') || svg.parentElement;
          const circles = svg.querySelectorAll('circle').length;
          const paths = svg.querySelectorAll('path').length;
          const texts = svg.querySelectorAll('text').length;
          return {
            idx,
            circles,
            paths,
            texts,
            parentId: parent ? parent.id || null : null,
            parentClass: parent ? (parent.className ? parent.className.toString() : null) : null,
            parentHtmlLen: parent && parent.innerHTML ? parent.innerHTML.length : 0
          };
        });
        const waiting = details.filter(d => d.paths >= 3 && d.texts === 0);
        return { ready: waiting.length === 0, waiting };
      });

      if (finalCheck.ready) {
        console.log('[PDF] ✓ Reflow succeeded after timeout; proceeding with PDF generation');
      } else {
        console.warn(`[PDF] ⚠️ Still missing text after reflow; proceeding anyway. Waiting charts: ${JSON.stringify(finalCheck.waiting)}`);
      }
    }

    console.log(`[PDF] Waiting 1000ms for animations to settle...`);
    await page.waitForTimeout(1000);
    
    console.log(`[PDF] Generating PDF now...`);

    // Generate PDF with options
    const pdfOptions = {
      format: options.format || 'A4',
      landscape: options.orientation === 'landscape',
      margin: options.margin || {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in'
      },
      printBackground: true,
      displayHeaderFooter: false
    };
    
    console.log(`[PDF] PDF Options:`, {
      format: pdfOptions.format,
      landscape: pdfOptions.landscape,
      printBackground: pdfOptions.printBackground
    });

    const pdfBuffer = await page.pdf(pdfOptions);
    console.log(`[PDF] ✓ PDF generated, size: ${pdfBuffer.length} bytes`);

    // Set response headers
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
    console.log(`[PDF] ✓✓✓ PDF sent to client - COMPLETE`);
    console.log(`[PDF] Successfully generated: ${filename}`);

  } catch (error) {
    console.error('[PDF] Generation error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error.message
    });

  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('[PDF] Error closing page:', e);
      }
    }
    // Note: We keep browser instance alive for reuse
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PDF generation service is running' });
});

/**
 * Catch-all: serve React app for any other route
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📄 PDF API ready at http://localhost:${PORT}/api/generate-pdf`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health\n`);
});

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down gracefully...');
  if (browserInstance) {
    await browserInstance.close();
  }
  process.exit(0);
});
