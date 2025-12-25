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
