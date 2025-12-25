# Dashboard Data Flow Explanation

## Two Separate Data Sources

The dashboard uses **TWO INDEPENDENT webhooks** that must be called separately to prevent response mixing:

### 1. **MAIN AIRTABLE WEBHOOK** (Dashboard Level)
```
URL: https://n8n.srv1123998.hstgr.cloud/webhook/airtable
Method: GET
Purpose: Fetch consultant data (leads, appointments, referrals, status_windows, etc.)
Called From: Dashboard.js → handleRefresh()
Data Available: Immediately on dashboard load and when you click "🔄 Refresh"
Caches: IndexedDB for offline access
Uses: All main charts on Consultant Detail page
```

**Returns:**
- consultant.id (e.g., `recMDMeNXATgpSTaK`)
- consultant.name (e.g., `Lisa Magnan`)
- leads_7d, leads_14d, leads_30d, ... leads_365d
- appointments_7d, appointments_14d, ... appointments_365d
- status_windows with period-specific statuses (showed, no_show, confirmed, cancelled)
- etc.

---

### 2. **MONTHLY PERFORMANCE WEBHOOK** (Consultant Detail Level)
```
URL: https://n8n.srv1123998.hstgr.cloud/webhook/c4da33a4-5da9-4570-93b8-d0f89385ed
Method: POST
Purpose: Fetch monthly breakdown (statusByMonth, best/worst month analysis)
Called From: ConsultantDetail.js → loadMonthlyData()
Data Available: When you select a consultant, or click "🔄 Refresh Monthly"
Uses: Bottom section of Consultant Detail page (monthly trend chart, best/worst cards)
```

**Request Body:** `{ "consultant_id": "..." }`

**Critical:** The monthly webhook uses **DIFFERENT ID FORMAT** than main webhook!
- Main webhook consultant.id → `recMDMeNXATgpSTaK`
- Monthly webhook consultant_id → `hlZvGYqioLUo9yppR06s`

**Mapping (Hardcoded):**
```javascript
MONTHLY_WEBHOOK_IDS = {
  'Auston': 'O7soRErw04P5g37sZ5fL',
  'Lisa': 'hlZvGYqioLUo9yppR06s',
  'Priscila': 'lhLCrve2EOCmojSbSmd0',
  'Keith': 'nKBSR31TmOpRLFxuThXi'
}
```

**Returns:**
- totalAppointments
- statusCounts (showed, noshow, confirmed, cancelled)
- monthCounts (appointments per month)
- statusByMonth (detailed breakdown by month)

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     DASHBOARD (Top Level)                    │
│                    [🔄 Refresh] button                       │
└─────────────┬───────────────────────────────────────────────┘
              │
              ├─── Calls MAIN AIRTABLE WEBHOOK ────┐
              │                                      │
              │    https://n8n.srv1123998.../      │
              │       webhook/airtable              │
              │                                      │
              └──────────────┬──────────────────────┘
                             │
                    Gets consultant data
                    (id, name, leads, etc.)
                             │
                    ┌────────┴─────────┐
                    │                  │
            ┌───────▼──────┐    ┌──────▼──────┐
            │   TOTALS TAB │    │ CONSULTANTS │
            │  Dashboard   │    │   SELECTOR   │
            └──────────────┘    └──────┬───────┘
                                       │
                            Select a consultant
                            (ConsultantDetail)
                                       │
                             ┌─────────▼──────────┐
                             │                    │
                    Uses MAIN DATA          Calls MONTHLY WEBHOOK
                    from Airtable          (on component mount)
                             │                    │
        ┌──────────────────────┘                  │
        │ - Period charts (7D, 14D, etc)          │
        │ - Status breakdown                      │
        │ - Leads/Appointments/Referrals          │
        │ - Conversion Rate                       │
        │                                         │
        │ [🔄 Refresh] main dashboard data        │
        │ ↑ Calls Airtable webhook                │
        │                                         │
        └─────────────────────────────────────────┘
                                                  │
                          Calls MONTHLY WEBHOOK ──┘
                          POST { consultant_id }
                          
                          Gets monthly breakdown
                          
                          ┌────────────────────────┐
                          │ Monthly Trend Chart    │
                          │ Best Month (🏆)        │
                          │ Worst Month (⚠️)       │
                          │ Show Rate Line         │
                          │                        │
                          │ [🔄 Refresh Monthly]   │
                          │ ↑ Calls monthly webhook│
                          └────────────────────────┘
```

---

## How to Use

### **Refresh Main Dashboard Data** (Airtable)
- Click "🔄 Refresh" in the top navigation bar
- Updates: consultant list, leads, appointments, status data
- Affects: All pages

### **Refresh Monthly Data** (Monthly Webhook)
- Go to Consultants tab → Select a consultant
- At the bottom, click "🔄 Refresh Monthly"
- Updates: Monthly trend chart, best/worst month cards
- Affects: Only the currently selected consultant's monthly section

---

## Why Two Separate Webhooks?

1. **Different Data**: One provides period-based metrics (7d, 14d, 30d...), the other provides monthly granularity
2. **Different IDs**: Main webhook uses Airtable record IDs, monthly webhook uses its own ID system
3. **Independent Refresh**: Users can refresh either data source without affecting the other
4. **No Response Mixing**: Separate calls ensure responses don't get mixed up

---

## Important Notes

⚠️ **DO NOT:**
- Use the main webhook's consultant.id with the monthly webhook
- Mix responses from the two webhooks
- Hardcode main webhook IDs into monthly webhook calls

✅ **DO:**
- Use the MONTHLY_WEBHOOK_IDS mapping to convert names to monthly IDs
- Call each webhook independently when needed
- Pass both { id, name } to fetchMonthlyPerformance() so it can map correctly

---

## File Locations

- **Main data fetching**: `src/Dashboard.js` → handleRefresh()
- **Monthly data service**: `src/utils/monthlyPerformanceService.js` → fetchMonthlyPerformance()
- **Consultant detail page**: `src/components/Consultants/ConsultantDetail.js` → loadMonthlyData()
- **ID mapping**: `src/utils/monthlyPerformanceService.js` → MONTHLY_WEBHOOK_IDS

