/**
 * Centralized Chart Color Palette
 * Use these colors consistently across all charts and graphs
 */

// Status colors for appointment outcomes
export const STATUS_COLORS = {
  showed: '#10b981',      // Green - positive outcome
  confirmed: '#3182ce',   // Blue - scheduled
  no_show: '#ef4444',     // Red - negative outcome
  cancelled: '#718096'    // Gray - neutral
};

// Primary chart palette for multi-series data
export const CHART_PALETTE = [
  '#667eea',  // Primary purple
  '#3182ce',  // Blue
  '#10b981',  // Green
  '#f59e0b',  // Amber
  '#ef4444',  // Red
  '#9f7aea',  // Purple
  '#ed64a6',  // Pink
  '#06b6d4'   // Cyan
];

// Source type colors (Organic, Paid, etc.)
export const SOURCE_TYPE_COLORS = {
  Organic: '#10b981',     // Green - free/natural
  Paid: '#3182ce',        // Blue - advertising
  Marketplace: '#f59e0b', // Amber - third-party
  Other: '#718096'        // Gray - miscellaneous
};

// Meta Ads category colors
export const CATEGORY_COLORS = {
  'MFE - FOOD': '#10b981',        // Green
  'MFE - RECREATION': '#3182ce',  // Blue
  'MFE - HOME': '#f59e0b',        // Amber
  'MFE - PET': '#9f7aea',         // Purple
  'MFE - BEAUTY': '#ed64a6',      // Pink
  'MFE - FINANCIAL': '#06b6d4'    // Cyan
};

// Ranking/performance tier colors
export const TIER_COLORS = {
  top: {
    gradient: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
    color: '#065f46',
    bg: '#ecfdf5'
  },
  middle: {
    gradient: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
    color: '#92400e',
    bg: '#fffbeb'
  },
  bottom: {
    gradient: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
    color: '#991b1b',
    bg: '#fef2f2'
  }
};

// Helper to get a color from the palette by index (cycles)
export const getChartColor = (index) => CHART_PALETTE[index % CHART_PALETTE.length];

// Helper to get status color by name
export const getStatusColor = (status) => {
  const key = status.toLowerCase().replace(' ', '_');
  return STATUS_COLORS[key] || STATUS_COLORS.cancelled;
};

export default {
  STATUS_COLORS,
  CHART_PALETTE,
  SOURCE_TYPE_COLORS,
  CATEGORY_COLORS,
  TIER_COLORS,
  getChartColor,
  getStatusColor
};
