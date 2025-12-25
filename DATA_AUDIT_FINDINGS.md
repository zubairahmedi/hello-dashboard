# Dashboard Data Audit & Findings

## 🚨 Critical Issues Found

### Issue #1: Consultant Sum ≠ Totals
**All periods show discrepancies:**
- **7d**: Consultant sum = 190 leads / 37 appts, Totals = 132 leads / 36 appts (44% & 3% higher)
- **14d**: Consultant sum = 429 leads / 61 appts, Totals = 277 leads / 62 appts (55% higher leads)
- **30d**: Consultant sum = 750 leads / 118 appts, Totals = 642 leads / 134 appts (17% higher leads, 12% lower appts)
- **60d**: Consultant sum = 1297 leads / 250 appts, Totals = 1151 leads / 262 appts (13% higher leads, 4% lower appts)
- **150d**: Consultant sum = 3300 leads / 679 appts, Totals = 2664 leads / 740 appts (24% & 8% mismatch)
- **180d**: Consultant sum = 3772 leads / 927 appts, Totals = 3350 leads / 976 appts (13% & 5% mismatch)

**Root Cause**: Unknown. Consultants and totals may be tracking different subsets or have different data sources.

### Issue #2: Consultant 365d is LIFETIME, Not Rolling Window
**1-Year Period:**
- Totals uses `appointments_360d` = 1,835 appts
- Consultant sum `appointments_365d` = 1,847 appts ✓ (nearly matches!)
- BUT consultant `leads_365d` sum = 48,673 leads (5.4x higher than `leads_360d` totals = 9,030 leads)

**Evidence**: Lisa Magnan's leads_365d (4,982) is far higher than leads_360d+leads_30d+... pattern suggests lifetime accumulation.

**Dashboard Impact**: 
- For 1-year period, consultant leads and conversion rates will be INFLATED/WRONG
- Appointments align closer to totals, but leads are lifetime

### Issue #3: Status Windows Data is INCOMPLETE
**30-Day Example:**
- Total appointments: 134
- Recorded statuses (showed + no_show + confirmed + cancelled): 113
- **Pending/No Status: 21 appointments (15.7% missing)**

**Breakdown:**
- Showed: 22 (16.4%)
- No-Show: 45 (33.6%)
- Confirmed: 38 (28.4%)
- Cancelled: 8 (6.0%)
- Unrecorded: 21 (15.7%)

**Per-Consultant Coverage:**
- Lisa: 46 appts, only 46 in status_windows (Showed=13, NoShow=21, Conf=8, Canc=4 = 46) ✓ 100%
- Priscilla: 35 appts, 30 recorded (87% coverage)
- Austin: 14 appts, 14 recorded ✓ 100%
- Keith: 23 appts, 23 recorded ✓ 100%

Wait, re-check: Lisa's status total = 13+21+8+4 = 46, which matches her appointments. So the 21 "pending" are likely OTHER consultants' unrecorded appointments.

---

## Current Dashboard Behavior vs Reality

### KPI Cards (Executive Summary - 30d Period)
| Metric | Dashboard Shows | Reality | Issue |
|--------|-----------------|---------|-------|
| Total Leads | `totals.leads_30d` = 642 | Consultant sum = 750 | ❌ Underreported by 108 leads |
| Total Appointments | `totals.appointments_30d` = 134 | Consultant sum = 118 | ❌ Consultant data shows 16 fewer appts |
| Show Rate | `showed / appointments` = 22/134 = 16.4% | Consultant calculation varies per person | ⚠️ Uses total appts not per-consultant sum |
| Conversion Rate | 134/642 = 20.9% | Using consultant sum: 118/750 = 15.7% | ❌ 5.2% difference |
| Confirmed Rate | 38/134 = 28.4% | Same calculation | ✓ Consistent |
| Pending/No-Status | 21/134 = 15.7% | Calculated correctly | ✓ Correct |

### Per-Consultant Cards
**30-Day Lisa Magnan Example:**
- Leads displayed: 290 (from `leads_30d`)
- Appointments displayed: 46 (from `appointments_30d`)
- Conversion: 46/290 = 15.9%
- Show Rate: 13/46 = 28.3%
- Status Window: showed=13, no_show=21, confirmed=8, cancelled=4
  - Sum = 46 (matches appointments) ✓

**1-Year Lisa Magnan Example:**
- Leads displayed: `leads_365d` = 4,982 (LIFETIME — wrong!)
- Appointments displayed: `appointments_365d` = 489
- Conversion: 489/4,982 = 9.8% (WRONG! Should be ~10.8% if using 360d)
- Show Rate from `status_windows.last365`: would show consultant's 365-day show rate

---

## Summary of What's Wrong

### ✅ What Works
- Status windows aggregation logic is sound (showed, no_show, confirmed, cancelled sum correctly)
- Pending calculation is correct
- Show rate formula (showed/appointments) is applied consistently
- Confirmed rate, cancelled rate calculations are accurate

### ❌ What's Broken
1. **Consultant totals don't reconcile to Totals** — fundamental data mismatch
2. **Consultant leads_365d is LIFETIME, not 365-day** — will inflate 1-year metrics
3. **Appointments alignment is close but not exact** — suggests data is being calculated differently
4. **Dashboard can't tell which source is authoritative** — totals or consultant sum?

---

## Recommended Actions

### Option A: Use Totals as Source of Truth (Safest)
- Change consultant rendering to ignore per-consultant leads/appointments for displayed numbers
- Use `totals` for KPI cards and overall stats
- Use `consultants[].status_windows` for status breakdowns only
- Problem: Per-consultant metrics become impossible to display accurately

### Option B: Fix Data in N8N/Airtable
- Ensure consultant `leads_365d` is actually 365-day rolling, not lifetime
- Ensure consultant leads sum equals totals for each period
- Ensure appointments align or provide mapping
- Problem: Requires backend changes, might reveal why discrepancies exist

### Option C: Build Reconciliation Logic
- Use totals as source for system-wide metrics (KPI cards, trends)
- Use consultant sum for per-consultant ranking/heatmap
- Document the split approach and note the 15-25% discrepancy
- Problem: Users will be confused by inconsistent numbers

---

## Data Samples for Reference

### Totals (30-Day)
```
Leads: 642
Appointments: 134
Status Breakdown:
  Showed: 22
  No-Show: 45
  Confirmed: 38
  Cancelled: 8
  Pending: 21
```

### Consultant Sum (30-Day)
```
Lisa: 290 leads, 46 appts
Priscilla: 102 leads, 35 appts
Austin: 224 leads, 14 appts
Keith: 134 leads, 23 appts
---
Total: 750 leads, 118 appts
```

### Discrepancy
```
Leads: 750 - 642 = 108 extra leads in consultant data (+17%)
Appointments: 118 - 134 = -16 appts in consultant data (-12%)
```

---

## Dashboard File Structure
- `src/AnalyticsDashboard.js` — currently uses:
  - Totals: `data.totals[leads${suffix}]`, `data.totals[appointments${suffix}]`
  - Consultants: `consultant.leads${suffix}`, `consultant.appointments${suffix}`
  - Status: `aggregateStatusByPeriod(data.consultants, timePeriod, appointments)`
- `src/utils/statusAggregationService.js` — aggregates `status_windows` correctly
