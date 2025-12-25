import React from 'react';
import './Consultant.css';
import exportNodeAsPdf from '../../utils/pdfExport';

export default function ConsultantHeader({ consultant, timePeriod, setTimePeriod, data }) {
  // Map time period to status_windows key
  const getWindowKey = (period) => {
    const mapping = {
      '7d': 'last7',
      '14d': 'last14',
      '30d': 'last30',
      '60d': 'last60',
      '150d': 'last150',
      '180d': 'last180',
      '365d': 'last365'
    };
    return mapping[period] || 'last30';
  };

  const suffix = `_${timePeriod}`;
  const windowKey = getWindowKey(timePeriod);
  
  const leads = Number(consultant[`leads${suffix}`] || 0);
  const appointments = Number(consultant[`appointments${suffix}`] || 0);
  const referrals = Number(consultant[`referrals${suffix}`] || 0);
  const conversionRate = leads > 0 ? ((appointments / leads) * 100).toFixed(1) : '0.0';
  
  // Get status data from status_windows for the selected period
  const statusWindow = consultant.status_windows?.[windowKey] || {};
  const showed = Number(statusWindow.showed || 0);
  const noShow = Number(statusWindow.no_show || 0);
  let confirmed = Number(statusWindow.confirmed || 0);
  const cancelled = Number(statusWindow.cancelled || 0);
  const totalRecordedStatuses = showed + noShow + confirmed + cancelled;
  // Unrecorded appointments are treated as confirmed
  confirmed = confirmed + Math.max(0, appointments - totalRecordedStatuses);
  const showRate = appointments > 0 ? ((showed / appointments) * 100).toFixed(1) : '0.0';

  return (
    <div className="consultant-header-compartment">
      {/* Header Title with Avatar */}
      <div className="header-title-section">
        <h1 className="consultant-name">👨‍💼 {consultant.name}</h1>
        <button
          id="export-consultant-pdf"
          className="export-btn"
          onClick={() => exportNodeAsPdf('consultant-root', { filename: `${(consultant.name || 'consultant').replace(/\s+/g, '_')}-report.pdf`, type: 'consultant', orientation: 'landscape' })}
        >
          📄 Export PDF
        </button>
      </div>

      {/* Time Period Selector */}
      <div className="time-selector-section">
        <div className="time-selector">
          {['7d', '14d', '30d', '60d', '150d', '180d', '365d'].map(period => (
            <button
              key={period}
              className={`time-btn ${timePeriod === period ? 'active' : ''}`}
              onClick={() => setTimePeriod(period)}
            >
              {period.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="header-metrics-grid">
        {/* Leads */}
        <div className="header-metric-card leads">
          <p className="metric-label">Leads</p>
          <p className="metric-value">{leads}</p>
        </div>

        {/* Appointments */}
        <div className="header-metric-card appointments">
          <p className="metric-label">Appointments</p>
          <p className="metric-value">{appointments}</p>
        </div>

        {/* Referrals */}
        <div className="header-metric-card referrals">
          <p className="metric-label">Referrals</p>
          <p className="metric-value">{referrals}</p>
        </div>

        {/* Conversion Rate */}
        <div className="header-metric-card conversion">
          <p className="metric-label">Conversion Rate</p>
          <p className="metric-value">{conversionRate}%</p>
        </div>

        {/* Confirmed */}
        <div className="header-metric-card confirmed">
          <p className="metric-label">Confirmed</p>
          <p className="metric-value">{confirmed}</p>
        </div>

        {/* Show Rate */}
        <div className="header-metric-card show-rate">
          <p className="metric-label">Show Rate</p>
          <p className="metric-value">{showRate}%</p>
        </div>

        {/* Showed */}
        <div className="header-metric-card showed">
          <p className="metric-label">Showed</p>
          <p className="metric-value">{showed}</p>
        </div>

        {/* Cancelled */}
        <div className="header-metric-card cancelled">
          <p className="metric-label">Cancelled</p>
          <p className="metric-value">{cancelled}</p>
        </div>

        {/* No Shows */}
        <div className="header-metric-card no-show">
          <p className="metric-label">No Shows</p>
          <p className="metric-value">{noShow}</p>
        </div>
      </div>
    </div>
  );
}
