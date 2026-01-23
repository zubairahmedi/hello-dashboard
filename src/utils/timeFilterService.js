// Centralized time filter utilities for Meta Ads and other views

export function monthNameToIndex(name) {
  const map = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };
  if (!name) return 0;
  const key = String(name).toLowerCase();
  return map[key] || 0;
}

export function buildMonthOptions(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    const year = row?.year;
    const monthName = row?.month_name;
    const monthIdx = Number(row?.month_index) || monthNameToIndex(monthName);
    if (!year || !monthName) return;
    const key = `${year}-${monthIdx || monthName}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: `${monthName} ${year}`,
        year,
        monthIndex: monthIdx,
        monthName,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (b.monthIndex || 0) - (a.monthIndex || 0);
  });
}

export function filterRowsByMonth(rows = [], monthMeta) {
  if (!monthMeta) return rows;
  const targetYear = String(monthMeta.year);
  const targetIndex = Number(monthMeta.monthIndex || 0);
  return rows.filter((row) => {
    const rowYear = String(row?.year || '');
    const rowMonthIdx = Number(row?.month_index) || monthNameToIndex(row?.month_name);
    return rowYear === targetYear && rowMonthIdx === targetIndex;
  });
}

export function buildYearOptions(rows = []) {
  const yearSet = new Set();
  rows.forEach((row) => {
    const year = row?.year;
    if (year) {
      yearSet.add(Number(year));
    }
  });
  
  // Always include a range of years (2024-2027) even if no data exists
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 1; year <= currentYear + 1; year++) {
    yearSet.add(year);
  }
  
  const yearArray = Array.from(yearSet).sort((a, b) => b - a); // Sort descending (latest first)
  return yearArray.map((year) => ({
    label: String(year),
    value: year,
  }));
}

export function filterRowsByYear(rows = [], year) {
  if (!year) return rows;
  const targetYear = String(year);
  return rows.filter((row) => {
    const rowYear = String(row?.year || '');
    return rowYear === targetYear;
  });
}
