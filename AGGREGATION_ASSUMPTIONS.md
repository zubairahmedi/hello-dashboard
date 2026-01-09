# Aggregation Assumptions Documentation

This document summarizes all explicit and implicit assumptions found in the aggregation logic across the codebase, organized by file and function. Implicit or undocumented assumptions are flagged for review.

---

## src/utils/statusAggregationService.js

### aggregateConsultantStatusesForPeriod
- **Explicit Assumptions:**
  - Input is an array of consultant objects, each with a `statuses` property.
  - Statuses are keyed by time window (e.g., 'last7', 'last30').
  - Window key mapping is correct and present.
  - Missing or non-array input returns all zeros.
  - Status counts are coerced to numbers.
  - Total appointments are calculated as sum of statuses, never negative.
- **Implicit/Undocumented Assumptions:**
  - All relevant statuses are present; missing keys default to zero.
  - No duplicate or overlapping consultant data.
  - Completeness and accuracy of `statuses` for each consultant is assumed.

### aggregateConsultantStatusesAllPeriods
- **Explicit Assumptions:**
  - Uses fixed set of periods: ['7d', '14d', '30d', '60d', '150d', '180d', '365d'].
- **Implicit/Undocumented Assumptions:**
  - All periods are relevant and available in the data.

### formatStatusData
- **Explicit Assumptions:**
  - Input contains numeric fields: showed, no_show, confirmed, cancelled.
  - Percentages calculated only if total > 0.
- **Implicit/Undocumented Assumptions:**
  - No check for negative or non-integer values.

---

## src/utils/monthlyPerformanceService.js

- Sums status fields and calculates rates as percentage of total.
- Assumes status fields are present and numeric.
- No explicit check for missing or malformed data.

---

## src/utils/sources.js

- Sums `count` across all sources.
- Aggregates source counts by name.
- Assumes `sources` is an array of objects with numeric `count` and string `name`.
- No duplicate source names within a single aggregation.
- No check for negative or non-integer counts.

---

## src/utils/consultantMetaAdsService.js

- Sums KPIs for display, referrals, and leads.
- Assumes data structures match expected aggregation functions.
- No explicit handling of missing or malformed data.

---

## src/components/MetaAds/MetaAdsAccountView.js

- Data from webhooks is already aggregated per account per month.
- No further aggregation logic in this file.

---

## Key Implicit/Undocumented Assumptions (Flagged)
- Data completeness: All consultant objects have complete and non-overlapping statuses for each period.
- Field presence: All expected fields are present and numeric; missing fields default to zero.
- No duplicates: No duplicate consultants, sources, or data rows.
- Time window mapping: Mapping from period to window key is always correct.
- Total appointments: The total parameter is accurate and matches the sum of all statuses.
- No data validation: No explicit validation for negative, non-integer, or malformed data.

---

If you need a deeper dive into a specific file or function, please specify which one.