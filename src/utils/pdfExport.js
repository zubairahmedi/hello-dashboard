/**
 * Server-side PDF Export Utility
 * Uses Puppeteer for professional PDF rendering via Express backend
 */

// Fixed to Render API as before
const API_ENDPOINT = 'https://pdf-service-j950.onrender.com/api/generate-pdf';

/**
 * exportNodeAsPdf: Main export function
 * Sends HTML to Puppeteer server for rendering
 * @param {string} nodeId - Element ID to export
 * @param {object} options - Options object
 * @param {string} options.filename - PDF filename
 * @param {string} options.format - PDF format (a4, letter, etc)
 * @param {string} options.orientation - portrait or landscape
 * @param {string} options.type - 'consultant' or 'dashboard' (for type-specific styling)
 */
export async function exportNodeAsPdf(nodeId, options = {}) {
  const { filename = 'report.pdf', format = 'a4', orientation = 'portrait', type = 'dashboard' } = options;

  const el = document.getElementById(nodeId);
  if (!el) throw new Error(`Element with id "${nodeId}" not found`);

  // Show loading UI
  showExportProgress('Preparing PDF...', 0);

  try {
    // 🔥 DOUBLE-RENDER STRATEGY: First render warms up charts, second is perfect
    console.log('[PDF] Pass 1/2: Warming up charts...');
    showExportProgress('Optimizing charts...', 30);
    
    // First pass - discarded (warms up Recharts rendering)
    await exportViaServer(el, filename, format, orientation, type, true);
    
    console.log('[PDF] Pass 2/2: Generating final PDF...');
    showExportProgress('Creating final document...', 60);
    
    // Second pass - downloads to user (all charts fully rendered)
    await exportViaServer(el, filename, format, orientation, type, false);
    
    hideExportProgress();
  } catch (error) {
    hideExportProgress();
    showError(`PDF export failed: ${error.message}`);
    throw error;
  }
}

/**
 * Extract all CSS from page (stylesheets + inline styles)
 */
function extractAllStyles() {
  let css = '';

  // Get all stylesheet rules
  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            css += rules[j].cssText + '\n';
          }
        }
      } catch (e) {
        // Cross-origin stylesheets might throw - ignore
        console.warn('[PDF] Could not read stylesheet:', e);
      }
    }
  } catch (e) {
    console.warn('[PDF] Error extracting stylesheets:', e);
  }

  return css;
}

/**
 * Prepare clone with PDF-specific layout improvements
 * Forces single-column layout and explicit widths for Recharts stability
 * @param {Element} clone - Cloned DOM element
 * @param {string} exportType - 'consultant' or 'dashboard' for type-specific styling
 */
function prepareCloneForPDF(clone, exportType = 'dashboard') {
  const style = document.createElement('style');
  
  // Build CSS rules based on export type
  let typeSpecificCSS = '';
  if (exportType === 'dashboard') {
    // Dashboard-specific rules: single-column chart grid
    typeSpecificCSS = `
      /* CRITICAL: Force charts to single-column layout for PDF viewport width */
      .charts-section {
        grid-template-columns: 1fr !important;
        gap: 20px !important;
      }
    `;
  } else if (exportType === 'consultant') {
    // Consultant-specific rules: adjust for consultant layout
    typeSpecificCSS = `
      /* Consultant page: optimize chart layout */
      .charts-section {
        grid-template-columns: 1fr !important;
        gap: 15px !important;
      }
    `;
  }
  
  style.innerHTML = `
    /* Remove animations that break in PDF rendering */
    * {
      animation: none !important;
      transition: none !important;
    }

    /* Hide export buttons */
    .export-btn,
    [class*="export-button"],
    button[class*="export"] {
      display: none !important;
    }

    ${typeSpecificCSS}

    /* Ensure chart containers have explicit widths */
    .chart-container {
      width: 100% !important;
      max-width: 100% !important;
      margin-bottom: 20px !important;
      padding: 20px !important;
      display: flex !important;
      gap: 20px !important;
      align-items: flex-start !important;
    }

    /* Tables should NOT use flex layout - keep full width */
    .chart-container.full-width,
    .chart-container:has(.table-container),
    .chart-container:has(table) {
      display: block !important;
    }

    /* Chart content takes 65% on left */
    .chart-container .chart-content {
      flex: 0 0 65% !important;
      width: 65% !important;
    }

    /* Chart legend/explanation takes 35% on right */
    .chart-container .chart-legend-pdf {
      flex: 0 0 35% !important;
      width: 35% !important;
      padding: 15px !important;
      background: #f8fafc !important;
      border-radius: 8px !important;
      border: 1px solid #e2e8f0 !important;
      font-size: 11px !important;
      line-height: 1.6 !important;
    }

    .chart-legend-pdf {
      display: block !important;
    }

    .chart-legend-pdf h5 {
      margin: 0 0 10px 0 !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      color: #1e293b !important;
    }

    .chart-legend-pdf ul {
      margin: 0 !important;
      padding-left: 18px !important;
      list-style: none !important;
    }

    .chart-legend-pdf li {
      margin-bottom: 6px !important;
      font-size: 11px !important;
      color: #475569 !important;
    }

    .chart-legend-pdf .color-indicator {
      display: inline-block !important;
      width: 12px !important;
      height: 12px !important;
      border-radius: 2px !important;
      margin-right: 6px !important;
      vertical-align: middle !important;
    }

    /* PIE CHART SPECIFIC FIXES */
    /* Ensure pie charts render in square containers for circular display */
    .recharts-pie-chart .chart-container,
    [class*="pie"] .chart-container {
      aspect-ratio: 1 !important;
      height: auto !important;
      min-height: 400px !important;
      width: 100% !important;
      max-width: 450px !important;
      margin: 0 auto !important;
      padding: 0 !important;
    }

    .recharts-pie-chart .recharts-wrapper {
      width: 100% !important;
      height: auto !important;
      aspect-ratio: 1 !important;
      padding: 0 !important;
    }

    .recharts-pie-chart {
      width: 100% !important;
      height: auto !important;
      padding: 0 !important;
      overflow: visible !important;
    }

    .recharts-pie-chart svg {
      overflow: visible !important;
      width: 100% !important;
      height: auto !important;
    }
    .recharts-pie-sector {
      display: block !important;
    }

    .recharts-pie-label-line {
      display: block !important;
      stroke: #333 !important;
    }

    .recharts-pie-label-text {
      display: block !important;
      font-size: 12px !important;
      fill: #333 !important;
      font-weight: 600 !important;
    }

    /* Add labels to pie chart if not visible */
    text[class*="recharts-text"] {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    /* Override grid spanning for PDF */
    .chart-container.half-width {
      grid-column: span 1 !important;
      width: 100% !important;
    }

    .chart-container.full-width {
      grid-column: 1 / -1 !important;
      width: 100% !important;
    }

    /* Smart page breaks */
    table {
      page-break-inside: avoid !important;
    }

    thead {
      display: table-header-group !important;
    }

    /* Force page breaks for consultant bottom sections - each on separate page */
    
    /* 1. Table section - Complete Period Performance Breakdown */
    .chart-container.full-width:has(.table-container) {
      page-break-before: always !important;
      margin-top: 0 !important;
      padding-top: 30px !important;
    }

    /* 2. 6-Month Performance Analysis section */
    .trend-analysis-section {
      page-break-before: always !important;
      margin-top: 0 !important;
      padding-top: 30px !important;
    }

    /* 3. Monthly Performance section (dashed border) */
    div[style*="border: 2px dashed"] {
      page-break-before: always !important;
      margin-top: 0 !important;
      padding-top: 30px !important;
    }
  `;

  clone.insertBefore(style, clone.firstChild);

  // Add pie chart legend table - Dashboard only
  if (exportType === 'dashboard') {
    const pieCharts = clone.querySelectorAll('.recharts-pie-chart');
    console.log(`[PDF] Found ${pieCharts.length} pie charts`);
  
  pieCharts.forEach((pieChart, chartIndex) => {
    // Find all legend items - try multiple selectors
    let legendItems = pieChart.querySelectorAll('.recharts-legend-item');
    
    // If not found, try to extract from legend wrapper text
    if (legendItems.length === 0) {
      const legendWrapper = pieChart.querySelector('.recharts-legend-wrapper');
      if (legendWrapper) {
        // Get all text items in legend
        const legendText = legendWrapper.innerText;
        console.log(`[PDF] Legend text: ${legendText}`);
      }
    }
    
    console.log(`[PDF] Pie chart ${chartIndex}: Found ${legendItems.length} legend items`);
    
    if (legendItems.length > 0) {
      const parent = pieChart.closest('.chart-container') || pieChart.parentNode;
      
      // Create legend table
      const table = document.createElement('table');
      table.style.cssText = `
        width: 100%;
        margin-top: 15px;
        border-collapse: collapse;
        font-size: 12px;
      `;
      
      // Table header
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr style="background: #f3f4f6;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Status</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Percentage</th>
        </tr>
      `;
      table.appendChild(thead);
      
      // Table body
      const tbody = document.createElement('tbody');
      const colors = ['#06b6d4', '#0891b2', '#0e7490', '#155e75'];
      
      legendItems.forEach((item, index) => {
        const label = item.textContent.trim();
        if (label) {
          const tr = document.createElement('tr');
          tr.style.cssText = index % 2 === 0 ? 'background: #fff;' : 'background: #fafafa;';
          tr.innerHTML = `
            <td style="padding: 8px; border: 1px solid #ddd;">
              <span style="display: inline-block; width: 12px; height: 12px; background: ${colors[index % colors.length]}; margin-right: 8px; border-radius: 2px;"></span>
              ${label}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">See chart</td>
          </tr>`;
          tbody.appendChild(tr);
        }
      });
      
      table.appendChild(tbody);
      if (parent) {
        parent.appendChild(table);
      }
    }
  });
  } // End of pie chart legend section

  return clone;
}

/**
 * Server-side PDF generation using Puppeteer
 * @param {Element} el - Element to export
 * @param {string} filename - Output PDF filename
 * @param {string} format - PDF format
 * @param {string} orientation - Portrait or landscape
 * @param {string} exportType - 'consultant' or 'dashboard'
 * @param {boolean} isWarmup - If true, PDF is generated but not downloaded (warmup pass)
 */
async function exportViaServer(el, filename, format, orientation, exportType = 'dashboard', isWarmup = false) {
  if (!isWarmup) {
    showExportProgress('Sending to server...', 30);
  }

  // Clone and prepare HTML
  const clone = el.cloneNode(true);

  // Remove export buttons
  const hideSelectors = ['.export-btn', '#export-consultant-pdf', '#export-dashboard-pdf'];
  hideSelectors.forEach(sel => {
    const nodes = clone.querySelectorAll ? clone.querySelectorAll(sel) : [];
    nodes.forEach(n => n.parentNode && n.parentNode.removeChild(n));
  });

  // Extract all CSS from page
  const pageCSS = extractAllStyles();

  // Prepare clone with PDF layout improvements (type-specific)
  const preparedClone = prepareCloneForPDF(clone, exportType);

  // Get full HTML with all styles
  const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${filename}</title>
        <style>
          ${pageCSS}
        </style>
      </head>
      <body>
        ${preparedClone.innerHTML}
      </body>
    </html>`;

  showExportProgress('Rendering on server...', 60);

  // Send to server
  let response;
  try {
    response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        filename,
        options: {
          format,
          orientation,
          margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }
        }
      })
    });
  } catch (networkErr) {
    throw new Error(`Network error reaching Render PDF service: ${networkErr.message}`);
  }

  if (!response.ok) {
    throw new Error(`Server error: ${response.statusText}`);
  }

  // Only download on second pass (final render)
  if (!isWarmup) {
    showExportProgress('Downloading...', 90);

    // Download PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log('[PDF] ✓✓✓ Final PDF generated and downloaded successfully');
  } else {
    // Discard warmup blob (charts are now warmed up)
    await response.blob();
    console.log('[PDF] ✓ Warmup pass complete - charts ready');
  }
}

/**
 * UI Helper: Show export progress
 */
function showExportProgress(message, progress) {
  let progressEl = document.getElementById('pdf-export-progress');

  if (!progressEl) {
    progressEl = document.createElement('div');
    progressEl.id = 'pdf-export-progress';
    progressEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px 40px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    document.body.appendChild(progressEl);
  }

  progressEl.innerHTML = `
    <div style="margin-bottom: 15px; font-size: 14px; color: #666;">
      ${message}
    </div>
    <div style="width: 200px; height: 4px; background: #f0f0f0; border-radius: 2px; overflow: hidden;">
      <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, #06b6d4, #0891b2); transition: width 0.3s ease;"></div>
    </div>
    <div style="margin-top: 10px; font-size: 12px; color: #999;">
      ${progress}%
    </div>
  `;
}

/**
 * UI Helper: Hide export progress
 */
function hideExportProgress() {
  const progressEl = document.getElementById('pdf-export-progress');
  if (progressEl) {
    progressEl.remove();
  }
}

/**
 * UI Helper: Show error
 */
function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef5350;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;
  errorEl.textContent = message;
  document.body.appendChild(errorEl);

  setTimeout(() => {
    errorEl.remove();
  }, 5000);
}

export default exportNodeAsPdf;

