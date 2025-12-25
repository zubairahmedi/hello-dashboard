/**
 * Status Aggregation Service
 * Aggregates consultant status_windows data by time period for totals view
 */

/**
 * Map time period to status_windows key
 */
const getWindowKey = (timePeriod) => {
  const keyMap = {
    '7d': 'last7',
    '14d': 'last14',
    '30d': 'last30',
    '60d': 'last60',
    '90d': 'last90',      // May not exist - fallback to last60
    '120d': 'last120',    // May not exist - fallback to last150
    '150d': 'last150',
    '180d': 'last180',
    '365d': 'last365'
  };
  return keyMap[timePeriod] || null;
};

/**
 * Aggregate status breakdown from all consultants for a specific time period
 * @param {array} consultants - Array of consultant objects from webhook
 * @param {string} timePeriod - Time period (7d, 14d, 30d, 60d, 90d, 150d, 180d, 365d)
 * @param {number} totalAppointments - Total appointments for the period (to calculate pending)
 * @returns {object} Aggregated status breakdown {showed, no_show, confirmed, cancelled, pending}
 */
export const aggregateStatusByPeriod = (consultants, timePeriod, totalAppointments = 0) => {
  if (!consultants || !Array.isArray(consultants)) {
    return { showed: 0, no_show: 0, confirmed: 0, cancelled: 0, pending: totalAppointments };
  }

  let windowKey = getWindowKey(timePeriod);
  if (!windowKey) {
    console.warn(`No status window mapping for period: ${timePeriod}`);
    return { showed: 0, no_show: 0, confirmed: 0, cancelled: 0, pending: totalAppointments };
  }

  let totalShowed = 0;
  let totalNoShow = 0;
  let totalConfirmed = 0;
  let totalCancelled = 0;

  consultants.forEach(consultant => {
    if (consultant.status_windows && consultant.status_windows[windowKey]) {
      const statusData = consultant.status_windows[windowKey];
      
      // statusData is now an object: {showed: X, no_show: Y, confirmed: Z, cancelled: W}
      totalShowed += Number(statusData.showed || 0);
      totalNoShow += Number(statusData.no_show || 0);
      totalConfirmed += Number(statusData.confirmed || 0);
      totalCancelled += Number(statusData.cancelled || 0);
    }
  });

  // Calculate pending = total appointments - all recorded statuses
  const recordedStatuses = totalShowed + totalNoShow + totalConfirmed + totalCancelled;
  const pending = Math.max(0, totalAppointments - recordedStatuses);

  return {
    showed: totalShowed,
    no_show: totalNoShow,
    confirmed: totalConfirmed,
    cancelled: totalCancelled,
    pending: pending
  };
};

/**
 * Get aggregated statuses for all time periods
 * @param {array} consultants - Array of consultant objects from webhook
 * @returns {object} Object with all time periods mapped to status breakdowns
 */
export const aggregateAllStatusPeriods = (consultants) => {
  const periods = ['7d', '14d', '30d', '60d', '150d', '180d', '365d'];
  const result = {};

  periods.forEach(period => {
    result[period] = aggregateStatusByPeriod(consultants, period);
  });

  return result;
};

/**
 * Format status data for display
 * @param {object} statusData - {showed, no_show, confirmed, cancelled}
 * @returns {object} Formatted with percentages and totals
 */
export const formatStatusData = (statusData) => {
  const total = (statusData.showed || 0) + (statusData.no_show || 0) + (statusData.confirmed || 0) + (statusData.cancelled || 0);

  return {
    showed: statusData.showed || 0,
    no_show: statusData.no_show || 0,
    confirmed: statusData.confirmed || 0,
    cancelled: statusData.cancelled || 0,
    total,
    showedPercent: total > 0 ? ((statusData.showed / total) * 100).toFixed(1) : '0.0',
    noShowPercent: total > 0 ? ((statusData.no_show / total) * 100).toFixed(1) : '0.0',
    confirmedPercent: total > 0 ? ((statusData.confirmed / total) * 100).toFixed(1) : '0.0',
    cancelledPercent: total > 0 ? ((statusData.cancelled / total) * 100).toFixed(1) : '0.0'
  };
};
