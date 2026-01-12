# Copilot Instructions for Franchise Experts Dashboard

## Architecture Overview

**Stack**: React 19 + Express, Create React App, Recharts for visualization, IndexedDB for offline caching  
**Deployment**: Static frontend + Node backend (Puppeteer PDF service on port 5000)

### Critical: Two Independent Webhook Systems

This dashboard uses **TWO SEPARATE data sources that must NEVER be mixed**:

1. **Main Airtable Webhook** (Dashboard-level data)
   - Endpoint: `API_CONFIG.AIRTABLE_WEBHOOK`
   - Returns: consultant objects with period-based metrics (`leads_7d`, `appointments_30d`, `status_windows`, etc.)
   - Refresh: "🔄 Refresh" button in nav bar
   - Used by: All dashboard tabs, consultant detail top section
   - Cached in: IndexedDB via [indexedDbService.js](src/utils/indexedDbService.js)

2. **Monthly Performance Webhook** (Consultant monthly breakdown)
   - Endpoint: `API_CONFIG.MONTHLY_PERFORMANCE_WEBHOOK` (POST)
   - Returns: `statusByMonth` with monthly granularity
   - Refresh: "🔄 Refresh Monthly" button on consultant detail page
   - Used by: Bottom section of [ConsultantDetail.js](src/components/Consultants/ConsultantDetail.js) only
   - **ID Mapping Required**: Uses different IDs than Airtable webhook - see `MONTHLY_WEBHOOK_IDS` mapping in [monthlyPerformanceService.js](src/utils/monthlyPerformanceService.js#L9-L18)

**Rule**: When modifying data fetching, always check [DATA_FLOW_EXPLANATION.md](DATA_FLOW_EXPLANATION.md) to confirm which webhook you need.

## Data Aggregation Pattern

**Single Source of Truth**: Consultant sum, NOT `data.totals`  
After December 2025 fix documented in [FIXES_APPLIED.md](FIXES_APPLIED.md), all metrics aggregate from `data.consultants[]` array:

```javascript
// CORRECT pattern used throughout codebase:
let totalLeads = 0;
data.consultants.forEach(c => {
  totalLeads += Number(c[`leads${suffix}`] || 0);
});
```

**Period Suffixes**: `_7d`, `_14d`, `_30d`, `_60d`, `_150d`, `_180d`, `_365d`  
**Status Windows**: `status_windows.last7`, `.last14`, `.last30`, etc. contain `{showed, no_show, confirmed, cancelled}`

See [statusAggregationService.js](src/utils/statusAggregationService.js) for aggregation helpers and [AGGREGATION_ASSUMPTIONS.md](AGGREGATION_ASSUMPTIONS.md) for documented data assumptions.

## PDF Export System

**Architecture**: Server-side Puppeteer rendering via [server.js](server.js) POST `/api/generate-pdf`  
**Client**: [pdfExport.js](src/utils/pdfExport.js) uses double-render strategy to ensure Recharts stability:

1. First render warms up chart animations (discarded)
2. Second render produces final PDF (downloaded to user)

**Styling**: Elements with `.pdf-hide` class are removed from exports. Type-specific CSS (`exportType: 'consultant'` vs `'dashboard'`) controls single vs multi-column layouts.

**Running locally**: `npm run server` (port 5000) + `npm start` (port 3000), or `npm run dev` for concurrent

## Key Files Reference

- [Dashboard.js](src/Dashboard.js) - Main container, handles Airtable webhook refresh, IndexedDB caching, tab routing
- [ConsultantDetail.js](src/components/Consultants/ConsultantDetail.js) - Consultant page with dual data sources (Airtable + Monthly webhook)
- [apiConfig.js](src/config/apiConfig.js) - Centralized API endpoints (supports env vars)
- [monthlyPerformanceService.js](src/utils/monthlyPerformanceService.js) - Monthly webhook integration with ID mapping
- [indexedDbService.js](src/utils/indexedDbService.js) - Offline data persistence

## Development Commands

```bash
npm start              # React dev server (localhost:3000)
npm run server         # Backend only (localhost:5000)
npm run dev            # Both concurrently
npm run build          # Production build
npm test               # Jest tests
```

## Common Patterns

**Adding a new period**: Update `periods` array in [ConsultantDetail.js](src/components/Consultants/ConsultantDetail.js#L80) and [AnalyticsDashboard.js](src/AnalyticsDashboard.js) with `{key, label, suffix, windowKey}` matching backend data structure.

**Adding a consultant**: Add to `MONTHLY_WEBHOOK_IDS` mapping in [monthlyPerformanceService.js](src/utils/monthlyPerformanceService.js) - both short name and full name variants.

**Status calculations**: Always use `status_windows[windowKey]` for period-specific status, never aggregate across multiple periods (data overlaps).

## Known Data Issues

See [DATA_AUDIT_FINDINGS.md](DATA_AUDIT_FINDINGS.md) for historical context:
- `leads_365d` contains lifetime data, not 365-day rolling window (intended behavior)
- Status windows may have ~15% "pending" (appointments without recorded status)
- Consultant sum was chosen over `totals` object due to data reconciliation issues
