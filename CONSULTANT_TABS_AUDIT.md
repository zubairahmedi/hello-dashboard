# Consultant Individual Tabs - Data Audit

## Problem Found

Consultant individual tabs (Lisa, Priscilla, Austin, Keith) are **missing period-specific status data** for filters.

### What's Available vs What's Used

#### ✅ Available in Individual Consultant Data
```
Time-period fields (all periods have these):
- leads_7d, leads_14d, leads_30d, ... leads_365d
- appointments_7d, appointments_14d, ... appointments_365d
- referrals_7d, referrals_14d, ... referrals_365d

Lifetime status fields (NO TIME PERIODS):
- showed (lifetime total)
- no_show (lifetime total)
- confirmed (lifetime total)
- cancelled (lifetime total)

Status Windows (PERIOD-SPECIFIC):
- status_windows.last7.{showed, no_show, confirmed, cancelled}
- status_windows.last14.{showed, no_show, confirmed, cancelled}
- status_windows.last30.{showed, no_show, confirmed, cancelled}
- status_windows.last60.{showed, no_show, confirmed, cancelled}
- status_windows.last150.{showed, no_show, confirmed, cancelled}
- status_windows.last180.{showed, no_show, confirmed, cancelled}
- status_windows.last365.{showed, no_show, confirmed, cancelled}
```

#### ❌ Currently Broken in Consultant Pages

**File: `src/components/Consultants/LisaMagnan.js` (and similar for other consultants)**

Line 19-20:
```javascript
// WRONG - tries to look up lifetime fields, not period-specific
const totalAppointmentStatuses = Number(consultant.confirmed || 0) + Number(consultant.showed || 0) ...
```

Line 24-26:
```javascript
// WRONG - tries to look up confirmed_7d which doesn't exist
const statusBreakdown = [
  { name: 'Confirmed', value: Number(consultant[`confirmed${suffix}`] || consultant.confirmed || 0) },
  ...
]
```

### Example: Lisa Magnan 7-Day Data

| Metric | Currently Shows | Should Show | Status |
|--------|-----------------|-------------|--------|
| **Leads** | 68 | 68 | ✅ Correct |
| **Appointments** | 13 | 13 | ✅ Correct |
| **Referrals** | 68 | 68 | ✅ Correct |
| **Showed** | 149 (lifetime) | 5 (from status_windows.last7) | ❌ Wrong |
| **No-Show** | 199 (lifetime) | 6 (from status_windows.last7) | ❌ Wrong |
| **Confirmed** | 80 (lifetime) | 2 (from status_windows.last7) | ❌ Wrong |
| **Cancelled** | 61 (lifetime) | 0 (from status_windows.last7) | ❌ Wrong |

---

## Data Structure

### Consultant Object
```json
{
  "name": "Lisa Magnan",
  "leads_7d": 68,
  "leads_14d": 173,
  "appointments_7d": 13,
  "appointments_14d": 19,
  "referrals_7d": 68,
  "referrals_14d": 6,
  
  "showed": 149,           // Lifetime
  "no_show": 199,          // Lifetime
  "confirmed": 80,         // Lifetime
  "cancelled": 61,         // Lifetime
  
  "status_windows": {
    "last7": {
      "showed": 5,
      "no_show": 6,
      "confirmed": 2,
      "cancelled": 0
    },
    "last14": {
      "showed": 8,
      "no_show": 8,
      ...
    }
    // ... more periods
  }
}
```

---

## Time Period Selector Issues

Current buttons in consultant tabs: `['7d', '14d', '30d', '60d', '90d']`

But `status_windows` only has: `['last7', 'last14', 'last30', 'last60', 'last150', 'last180', 'last365']`

**Missing in buttons**: 150d, 180d, 365d (1 year)
**Extra in buttons**: 90d (no status_windows.last90)

---

## Required Fixes

### Fix #1: Map Time Periods Correctly
Match button selection to status_windows keys:
- 7d → last7 ✓
- 14d → last14 ✓
- 30d → last30 ✓
- 60d → last60 ✓
- 90d → (REMOVE - no last90 in status_windows)
- 150d → last150 (ADD)
- 180d → last180 (ADD)
- 365d → last365 (ADD as "1Y")

### Fix #2: Use status_windows for Period-Specific Status
Instead of looking up `showed_7d` (doesn't exist), use:
```javascript
const statusWindow = consultant.status_windows?.[windowKey] || {};
const showed = statusWindow.showed || 0;
const noShow = statusWindow.no_show || 0;
const confirmed = statusWindow.confirmed || 0;
const cancelled = statusWindow.cancelled || 0;
```

### Fix #3: Update ConsultantDetail Chart Data
Currently uses lifetime status fields:
```javascript
// WRONG
const statusData = useMemo(() => {
  return [
    { name: 'Confirmed', value: Number(consultant.confirmed || 0) },
    ...
  ];
}, [consultant]);
```

Should use status_windows or be blank (only show trend chart for period comparisons).

---

## Files to Update

1. `src/components/Consultants/LisaMagnan.js`
2. `src/components/Consultants/PriscillaC.js`
3. `src/components/Consultants/AustinTouey.js`
4. `src/components/Consultants/KeithTalty.js`
5. `src/components/Consultants/ConsultantDetail.js`

---

## Test Data

**Lisa Magnan - 7 Days:**
- Leads: 68
- Appointments: 13
- Referrals: 68
- Showed: 5 (from status_windows.last7)
- No-Show: 6
- Confirmed: 2
- Cancelled: 0
- **Conversion**: 13/68 = 19.1%
- **Show Rate**: 5/13 = 38.5%

---

## Summary

**Issue**: Consultant tabs show **lifetime** status data for all periods (broke when time filter changes)

**Root Cause**: Code tries to look up `showed_7d`, `confirmed_30d` etc. which don't exist

**Solution**: Use `status_windows[windowKey]` for period-specific status instead

**Impact**: All 4 consultant detail pages will show correct filtered metrics once fixed
