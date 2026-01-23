import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, AreaChart
} from 'recharts';
import { aggregateStatusByPeriod, formatStatusData } from './utils/statusAggregationService';
import './AnalyticsDashboard.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];
const STATUS_COLORS = { showed: '#10b981', no_show: '#ef4444', confirmed: '#3b82f6', cancelled: '#06b6d4' };

function AnalyticsDashboard({ data }) {
  const [timePeriod, setTimePeriod] = useState('30d');
  const [sortBy, setSortBy] = useState('leads');
  const [sortOrder, setSortOrder] = useState('desc');

  // Guard against missing consultants array in cached/initial data
  const consultants = Array.isArray(data?.consultants) ? data.consultants : [];

  // Score classification for UI (used by Quality Scorecard)
  const getScoreClass = (score) => {
    const s = parseFloat(score) || 0;
    if (s >= 60) return 'score-good';
    if (s >= 30) return 'score-mid';
    return 'score-bad';
  };

  // Time period configurations
  // SOURCE: Consultant data (consultant-level fields)
  // NOTE: Consultants have 365d data available; status_windows has: last7, last14, last30, last60, last150, last180, last365
  const timePeriods = {
    '7d': { label: '7 Days', consultantSuffix: '_7d' },
    '14d': { label: '14 Days', consultantSuffix: '_14d' },
    '30d': { label: '30 Days', consultantSuffix: '_30d' },
    '60d': { label: '60 Days', consultantSuffix: '_60d' },
    '150d': { label: '150 Days', consultantSuffix: '_150d' },
    '180d': { label: '180 Days', consultantSuffix: '_180d' },
    '365d': { label: '1 Year', consultantSuffix: '_365d' }
  };

  const currentConsultantSuffix = timePeriods[timePeriod].consultantSuffix;

  // Calculate KPIs for selected time period
  // SOURCE OF TRUTH: Consultant sum (not data.totals)
  const kpis = useMemo(() => {
    // Sum leads and appointments from all consultants
    let leads = 0;
    let appointments = 0;
    consultants.forEach(c => {
      leads += Number(c[`leads${currentConsultantSuffix}`] || 0);
      appointments += Number(c[`appointments${currentConsultantSuffix}`] || 0);
    });
    
    // Get aggregated status data for the selected time period
    const aggregatedStatus = aggregateStatusByPeriod(consultants, timePeriod, appointments);
    const formattedStatus = formatStatusData(aggregatedStatus);
    
    const totalShowed = formattedStatus.showed;
    const totalNoShow = formattedStatus.no_show;
    let totalConfirmed = formattedStatus.confirmed;
    const totalCancelled = formattedStatus.cancelled;
    
    // Any unrecorded appointments are treated as confirmed
    const recordedStatuses = totalShowed + totalNoShow + totalConfirmed + totalCancelled;
    const unrecordedAppts = Math.max(0, appointments - recordedStatuses);
    totalConfirmed = totalConfirmed + unrecordedAppts;
    const totalPending = 0; // No pending - all appointments have a status
    
    // Show Rate = Showed Appointments / Total Appointments
    const showRate = appointments > 0 ? ((totalShowed / appointments) * 100).toFixed(1) : '0.0';
    const conversionRate = leads > 0 ? ((appointments / leads) * 100).toFixed(1) : '0.0';
    const confirmedRate = appointments > 0 ? ((totalConfirmed / appointments) * 100).toFixed(1) : '0.0';

    return {
      leads,
      appointments,
      showRate,
      conversionRate,
      confirmedRate,
      totalShowed,
      totalNoShow,
      totalConfirmed,
      totalCancelled,
      totalPending,
      formattedStatus
    };
  }, [data, currentConsultantSuffix, timePeriod]);

  // Prepare consultant data for selected time period
  const consultantData = useMemo(() => {
    return consultants.map(c => {
      const leads = Number(c[`leads${currentConsultantSuffix}`] || 0);
      const appointments = Number(c[`appointments${currentConsultantSuffix}`] || 0);
      const referrals = Number(c[`referrals${currentConsultantSuffix}`] || 0);
      
      // Get period-specific status from status_windows
      const windowKey = 
        timePeriod === '7d' ? 'last7' :
        timePeriod === '14d' ? 'last14' :
        timePeriod === '30d' ? 'last30' :
        timePeriod === '60d' ? 'last60' :
        timePeriod === '150d' ? 'last150' :
        timePeriod === '180d' ? 'last180' :
        'last365';
      
      const statusWindow = c.status_windows?.[windowKey] || {};
      const showed = Number(statusWindow.showed || 0);
      const noShow = Number(statusWindow.no_show || 0);
      let confirmed = Number(statusWindow.confirmed || 0);
      const cancelled = Number(statusWindow.cancelled || 0);
      
      // Any unrecorded appointments are treated as confirmed (default status)
      const recordedStatuses = showed + noShow + confirmed + cancelled;
      const unrecorded = Math.max(0, appointments - recordedStatuses);
      confirmed = confirmed + unrecorded;
      
      return {
        name: c.name,
        leads,
        appointments,
        referrals,
        showed,
        noShow,
        confirmed,
        cancelled,
        conversionRate: leads > 0 ? ((appointments / leads) * 100).toFixed(1) : '0.0',
        showRate: appointments > 0 ? ((showed / appointments) * 100).toFixed(1) : '0.0',
        avgLeadToAppt: (c.lead_to_appt_ratio || 0).toFixed(1)
      };
    });
  }, [consultants, currentConsultantSuffix, timePeriod]);

  // Sort consultant data
  const sortedConsultants = useMemo(() => {
    const sorted = [...consultantData].sort((a, b) => {
      const aVal = parseFloat(a[sortBy]) || 0;
      const bVal = parseFloat(b[sortBy]) || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return sorted;
  }, [consultantData, sortBy, sortOrder]);

  // Top performers
  const topPerformers = useMemo(() => {
    if (!consultantData || consultantData.length === 0) {
      const placeholder = { name: '—', leads: 0, appointments: 0, conversionRate: '0.0', referrals: 0 };
      return {
        byLeads: placeholder,
        byAppointments: placeholder,
        byConversion: placeholder,
        byReferrals: placeholder
      };
    }

    const byLeads = [...consultantData].sort((a, b) => b.leads - a.leads)[0];
    const byAppointments = [...consultantData].sort((a, b) => b.appointments - a.appointments)[0];
    const byConversion = [...consultantData].sort((a, b) => parseFloat(b.conversionRate) - parseFloat(a.conversionRate))[0];
    const byReferrals = [...consultantData].sort((a, b) => b.referrals - a.referrals)[0];

    return { byLeads, byAppointments, byConversion, byReferrals };
  }, [consultantData]);

  // Chart data for trends - using consultant sum for consistency
  const trendData = useMemo(() => {
    const periods = [
      { key: '_7d', label: '7D' },
      { key: '_14d', label: '14D' },
      { key: '_30d', label: '30D' },
      { key: '_60d', label: '60D' },
      { key: '_150d', label: '150D' },
      { key: '_180d', label: '180D' },
      { key: '_365d', label: '1Y' }
    ];
    
    return periods.map(p => {
      let leads = 0;
      let appointments = 0;
      consultants.forEach(c => {
        leads += Number(c[`leads${p.key}`] || 0);
        appointments += Number(c[`appointments${p.key}`] || 0);
      });
      return { period: p.label, leads, appointments };
    });
  }, [consultants]);

  // Pie chart data for appointment status (using aggregated period data)
  const appointmentStatusData = useMemo(() => [
    { name: 'Showed', value: kpis.totalShowed },
    { name: 'No Show', value: kpis.totalNoShow },
    { name: 'Confirmed', value: kpis.totalConfirmed },
    { name: 'Cancelled', value: kpis.totalCancelled }
  ], [kpis]);

  // 🔻 CONVERSION FUNNEL DATA
  const funnelData = useMemo(() => {
    const leads = kpis.leads;
    const appointments = kpis.appointments;
    const showed = kpis.totalShowed;
    const confirmed = kpis.totalConfirmed;
    
    return [
      { stage: 'Leads', value: leads, pct: 100 },
      { stage: 'Appointments', value: appointments, pct: leads > 0 ? ((appointments / leads) * 100).toFixed(1) : 0 },
      { stage: 'Showed', value: showed, pct: appointments > 0 ? ((showed / appointments) * 100).toFixed(1) : 0 },
      { stage: 'Confirmed', value: confirmed, pct: showed > 0 ? ((confirmed / showed) * 100).toFixed(1) : 0 },
      { stage: 'Cancelled', value: kpis.totalCancelled, color: '#06b6d4' }
    ];
  }, [kpis]);

  // 📞 REFERRAL PERFORMANCE
  const referralStats = useMemo(() => {
    const totalReferrals = consultantData.reduce((sum, c) => sum + c.referrals, 0);
    const totalLeads = kpis.leads;
    const referralRate = totalLeads > 0 ? ((totalReferrals / totalLeads) * 100).toFixed(1) : '0.0';
    const topReferrer = [...consultantData].sort((a, b) => b.referrals - a.referrals)[0];
    
    return { totalReferrals, referralRate, topReferrer };
  }, [consultantData, kpis]);

  // ⚠️ NO-SHOW ANALYSIS
  const noShowAnalysis = useMemo(() => {
    // No-show rate = No-shows / Total Appointments
    const noShowRate = kpis.appointments > 0 
      ? ((kpis.totalNoShow / kpis.appointments) * 100).toFixed(1) 
      : '0.0';
    const consultantNoShowRates = consultantData.map(c => ({
      name: c.name,
      rate: c.appointments > 0 ? ((c.noShow / c.appointments) * 100).toFixed(1) : '0.0'
    }));
    
    return { noShowRate, consultantNoShowRates };
  }, [consultantData, kpis]);

  // 🔥 CONSULTANT PERFORMANCE HEATMAP DATA
  const heatmapData = useMemo(() => {
    return consultantData.map(c => ({
      name: c.name,
      leads: c.leads,
      appointments: c.appointments,
      conversion: parseFloat(c.conversionRate),
      showRate: parseFloat(c.showRate),
      referrals: c.referrals
    }));
  }, [consultantData]);

  // 📊 CONSULTANT RANKING
  const consultantRanking = useMemo(() => {
    return [...consultantData]
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 4)
      .map((c, idx) => ({
        rank: idx + 1,
        name: c.name,
        leads: c.leads,
        appointments: c.appointments,
        conversion: c.conversionRate,
        trend: (idx % 2 === 0) ? '↑' : '↓'
      }));
  }, [consultantData]);

  // 💧 STATUS WATERFALL
  const waterfallData = useMemo(() => [
    { stage: 'Confirmed', count: kpis.totalConfirmed, color: '#3b82f6' },
    { stage: 'Showed', count: kpis.totalShowed, color: '#10b981' },
    { stage: 'No Show', count: kpis.totalNoShow, color: '#ef4444' },
    { stage: 'Cancelled', count: kpis.totalCancelled, color: '#06b6d4' }
  ], [kpis]);

  // ⭐ QUALITY SCORECARD
  const qualityScores = useMemo(() => {
    const leadQuality = parseFloat(kpis.conversionRate) || 0;
    const appointmentQuality = parseFloat(kpis.showRate) || 0;
    const salesQuality = parseFloat(kpis.confirmedRate) || 0;
    const overallScore = ((leadQuality + appointmentQuality + salesQuality) / 3).toFixed(1);
    
    return { leadQuality, appointmentQuality, salesQuality, overallScore };
  }, [kpis]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="analytics-dashboard">
      {/* Time Period Selector */}
      <div className="time-selector">
        {Object.entries(timePeriods).map(([key, { label }]) => (
          <button
            key={key}
            className={`time-btn ${timePeriod === key ? 'active' : ''}`}
            onClick={() => setTimePeriod(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Executive KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card leads">
          <div className="kpi-icon"></div>
          <div className="kpi-content">
            <div className="kpi-label">Total Leads</div>
            <div className="kpi-value">{kpis.leads.toLocaleString()}</div>
            <div className="kpi-subtitle">{timePeriods[timePeriod].label}</div>
          </div>
        </div>

        <div className="kpi-card appointments">
          <div className="kpi-icon"></div>
          <div className="kpi-content">
            <div className="kpi-label">Appointments</div>
            <div className="kpi-value">{kpis.appointments.toLocaleString()}</div>
            <div className="kpi-subtitle">{timePeriods[timePeriod].label}</div>
          </div>
        </div>

        <div className="kpi-card conversion">
          <div className="kpi-icon"></div>
          <div className="kpi-content">
            <div className="kpi-label">Conversion Rate</div>
            <div className="kpi-value">{kpis.conversionRate}%</div>
            <div className="kpi-subtitle">Lead → Appointment</div>
          </div>
        </div>

        <div className="kpi-card show-rate">
          <div className="kpi-icon"></div>
          <div className="kpi-content">
            <div className="kpi-label">Show Rate</div>
            <div className="kpi-value">{kpis.showRate}%</div>
            <div className="kpi-subtitle">{kpis.totalShowed} showed</div>
          </div>
        </div>
      </div>

      {/* Top Performers Section */}
      <div className="top-performers">
        <h2>Top Performers - {timePeriods[timePeriod].label}</h2>
        <div className="performers-grid">
          <div className="performer-card">
            <div className="performer-title">Most Leads</div>
            <div className="performer-name">{topPerformers.byLeads.name}</div>
            <div className="performer-value">{topPerformers.byLeads.leads} leads</div>
          </div>
          <div className="performer-card">
            <div className="performer-title">Most Appointments</div>
            <div className="performer-name">{topPerformers.byAppointments.name}</div>
            <div className="performer-value">{topPerformers.byAppointments.appointments} appointments</div>
          </div>
          <div className="performer-card">
            <div className="performer-title">Best Conversion</div>
            <div className="performer-name">{topPerformers.byConversion.name}</div>
            <div className="performer-value">{topPerformers.byConversion.conversionRate}%</div>
          </div>
          <div className="performer-card">
            <div className="performer-title">Most Referrals</div>
            <div className="performer-name">{topPerformers.byReferrals.name}</div>
            <div className="performer-value">{topPerformers.byReferrals.referrals} referrals</div>
          </div>
        </div>
      </div>

      {/* NEW: Quality Scorecard */}
      <div className="quality-scorecard">
        <h2>Quality Scorecard</h2>
        <div className="scorecard-grid">
          <div className="score-item">
            <div className="score-label">Lead Quality</div>
            <div className={`score-value ${getScoreClass(qualityScores.leadQuality)}`}>
              {qualityScores.leadQuality.toFixed(1)}%
            </div>
            <div className="score-subtitle">Lead to Appt Rate</div>
          </div>
          <div className="score-item">
            <div className="score-label">Appointment Quality</div>
            <div className={`score-value ${getScoreClass(qualityScores.appointmentQuality)}`}>
              {qualityScores.appointmentQuality.toFixed(1)}%
            </div>
            <div className="score-subtitle">Show Rate</div>
          </div>
          <div className="score-item">
            <div className="score-label">Sales Quality</div>
            <div className={`score-value ${getScoreClass(qualityScores.salesQuality)}`}>
              {qualityScores.salesQuality.toFixed(1)}%
            </div>
            <div className="score-subtitle">Confirmed Rate</div>
          </div>
          <div className="score-item overall">
            <div className="score-label">Overall Score</div>
            <div className="score-value-large">{qualityScores.overallScore}</div>
            <div className="score-subtitle">Composite</div>
          </div>
        </div>
      </div>

      {/* NEW: Referral Performance */}
      <div className="referral-section">
        <h2>Referral Performance</h2>
        <div className="referral-stats">
          <div className="referral-card">
            <div className="referral-title">Total Referrals</div>
            <div className="referral-value">{referralStats.totalReferrals}</div>
          </div>
          <div className="referral-card">
            <div className="referral-title">Top Referrer</div>
            <div className="referral-value">{referralStats.topReferrer?.name}</div>
            <div className="referral-rate">{referralStats.topReferrer?.referrals} referrals</div>
          </div>
        </div>
      </div>

      {/* NEW: No-Show Analysis */}
      <div className="noshow-section">
        <h2>No-Show Analysis</h2>
        <div className="noshow-alert">
          <div className="alert-title">Overall No-Show Rate</div>
          <div className={`alert-value ${parseFloat(noShowAnalysis.noShowRate) > 30 ? 'high' : 'ok'}`}>
            {noShowAnalysis.noShowRate}%
          </div>
          {parseFloat(noShowAnalysis.noShowRate) > 30 && (
            <div className="alert-warning">High no-show rate detected</div>
          )}
        </div>
        <div className="noshow-table">
          <h4>No-Show Rate by Consultant</h4>
          {noShowAnalysis.consultantNoShowRates.map((item, idx) => (
            <div key={idx} className="noshow-row">
              <span className="noshow-name">{item.name}</span>
              <span className={`noshow-rate ${parseFloat(item.rate) > 30 ? 'high' : 'ok'}`}>
                {item.rate}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* NEW: Conversion Funnel */}
      <div className="funnel-section">
        <h2>Conversion Funnel</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={funnelData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#0F172A22" />
            <XAxis type="number" stroke="#0F172A" tick={{ fill: '#0F172A', fontWeight: 600 }} />
            <YAxis dataKey="stage" type="category" width={100} stroke="#0F172A" tick={{ fill: '#0F172A', fontWeight: 600 }} />
            <Tooltip formatter={(value) => value.toLocaleString()} contentStyle={{ background: '#111827', color: '#fff', border: 'none' }} itemStyle={{ color: '#fff' }} cursor={{ fill: '#0066cc22' }} />
            <Bar dataKey="value" fill="#0066cc" radius={[6, 6, 6, 6]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="funnel-stats">
          {funnelData.map((stage, idx) => (
            <div key={idx} className="funnel-stat funnel-blue">
              <span>{stage.stage}:</span>
              <strong>{stage.value.toLocaleString()}</strong>
              <span className="funnel-pct">({stage.pct}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* NEW: Consultant Performance Heatmap */}
      <div className="heatmap-section">
        <h2>Consultant Performance Heatmap</h2>
        <div className="heatmap-grid">
          {heatmapData.map((consultant, idx) => (
            <div key={idx} className="heatmap-cell">
              <div className="heatmap-name">{consultant.name}</div>
              <div className="heatmap-metrics">
                <div className="metric-badge leads">
                  Leads: {consultant.leads}
                </div>
                <div className="metric-badge appts">
                  Appts: {consultant.appointments}
                </div>
                <div className="metric-badge conversion">
                  Conv: {consultant.conversion}%
                </div>
                <div className="metric-badge show">
                  Show: {consultant.showRate}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NEW: Consultant Ranking */}
      <div className="ranking-section">
        <h2>Top Performers This Period</h2>
        <div className="ranking-cards">
          {consultantRanking.map((consultant) => (
            <div key={consultant.rank} className="ranking-card">
              <div className="ranking-badge">#{consultant.rank}</div>
              <div className="ranking-name">{consultant.name}</div>
              <div className="ranking-trend">{consultant.trend}</div>
              <div className="ranking-stats">
                <div>{consultant.leads} leads</div>
                <div>{consultant.appointments} appts</div>
                <div>{consultant.conversion}% conversion</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NEW: Status Waterfall */}
      <div className="waterfall-section">
        <h2>💧 Appointment Status Waterfall</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={waterfallData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#8884d8">
              {waterfallData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Section */}

      <div className="charts-section">
        <div className="chart-container">
          <h3>📊 Leads by Consultant</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedConsultants}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" fill="#667eea" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>📅 Appointments by Consultant</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedConsultants}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="appointments" fill="#764ba2" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container full-width">
          <h3>📈 Cumulative Growth Trend</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="leads" stroke="#667eea" strokeWidth={3} />
              <Line type="monotone" dataKey="appointments" stroke="#764ba2" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Centered Appointment Status Breakdown Chart */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '40px 0' }}>
        <div className="chart-container" style={{ width: 600, maxWidth: '100%' }}>
          <h3 style={{ textAlign: 'center' }}>🎯 Appointment Status Breakdown</h3>
          <ResponsiveContainer width={500} height={400}>
            <PieChart>
              <Pie
                data={appointmentStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={140}
                fill="#8884d8"
                dataKey="value"
              >
                {appointmentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Consultant Table */}
      <div className="consultant-table-section">
        <h2>👥 Consultant Performance Details - {timePeriods[timePeriod].label}</h2>
        <div className="table-container">
          <table className="consultant-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')}>
                  Name {sortBy === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th onClick={() => handleSort('leads')}>
                  Leads {sortBy === 'leads' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th onClick={() => handleSort('appointments')}>
                  Appointments {sortBy === 'appointments' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th onClick={() => handleSort('referrals')}>
                  Referrals {sortBy === 'referrals' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th onClick={() => handleSort('conversionRate')}>
                  Conversion % {sortBy === 'conversionRate' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th onClick={() => handleSort('showRate')}>
                  Show Rate % {sortBy === 'showRate' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th>Showed</th>
                <th>No Show</th>
                <th>Confirmed</th>
                <th>Cancelled</th>
              </tr>
            </thead>
            <tbody>
              {sortedConsultants.map((consultant, index) => (
                <tr key={index} className={index % 2 === 0 ? 'even' : 'odd'}>
                  <td className="consultant-name">{consultant.name}</td>
                  <td className="metric">{consultant.leads}</td>
                  <td className="metric">{consultant.appointments}</td>
                  <td className="metric">{consultant.referrals}</td>
                  <td className="metric highlight">{consultant.conversionRate}%</td>
                  <td className="metric highlight">{consultant.showRate}%</td>
                  <td className="metric success">{consultant.showed}</td>
                  <td className="metric danger">{consultant.noShow}</td>
                  <td className="metric">{consultant.confirmed}</td>
                  <td className="metric">{consultant.cancelled}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-stats">
        <h2>📋 Overall Statistics</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Total Showed:</span>
            <span className="stat-value success">{kpis.totalShowed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total No-Show:</span>
            <span className="stat-value danger">{kpis.totalNoShow}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Confirmed:</span>
            <span className="stat-value">{kpis.totalConfirmed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Cancelled:</span>
            <span className="stat-value">{kpis.totalCancelled}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;