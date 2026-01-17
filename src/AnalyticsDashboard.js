import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Users, Calendar, CheckCircle, XCircle, TrendingUp, Award, Share2 } from 'lucide-react';
import { Card, StatCard, TopPerformerCard } from './components/UI/Card';
import ConsultantRankingTable from './components/Analytics/ConsultantRankingTable';
import './AnalyticsDashboard.css';
import './NewAnalytics.css';

const STATUS_COLORS = {
  showed: '#3182ce',
  no_show: '#e53e3e',
  confirmed: '#38a169',
  cancelled: '#718096'
};

const AnalyticsDashboard = ({ data }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Time periods configuration
  const timePeriods = {
    '7d': { label: '7 Days', key: 'Last 7 Days', suffix: '_7d', windowKey: 'last7' },
    '14d': { label: '14 Days', key: 'Last 14 Days', suffix: '_14d', windowKey: 'last14' },
    '30d': { label: '30 Days', key: 'Last 30 Days', suffix: '_30d', windowKey: 'last30' },
    '60d': { label: '60 Days', key: 'Last 60 Days', suffix: '_60d', windowKey: 'last60' },
    '150d': { label: '150 Days', key: 'Last 150 Days', suffix: '_150d', windowKey: 'last150' },
    '180d': { label: '180 Days', key: 'Last 180 Days', suffix: '_180d', windowKey: 'last180' },
    '365d': { label: '1 Year', key: 'Last 365 Days', suffix: '_365d', windowKey: 'last365' }
  };
  
  const currentSuffix = timePeriods[selectedPeriod].suffix;

  // Aggregate stats from consultant data (Single Source of Truth)
  // This replaces the old totals logic with consultant-sum logic
  const stats = useMemo(() => {
    if (!data || !data.consultants) return null;

    let leads = 0;
    let appointments = 0;
    let referrals = 0;

    data.consultants.forEach(c => {
      leads += Number(c[`leads${currentSuffix}`] || 0);
      appointments += Number(c[`appointments${currentSuffix}`] || 0);
      referrals += Number(c[`referrals${currentSuffix}`] || 0);
    });

    const conversionRate = leads > 0 ? ((appointments / leads) * 100).toFixed(1) : 0;
    const referralRate = appointments > 0 ? ((referrals / appointments) * 100).toFixed(1) : 0;
    
    // Status Aggregation (using status_windows)
    // Note: This logic follows statusAggregationService patterns
    const windowKeyMap = {
      '7d': 'last7',
      '14d': 'last14',
      '30d': 'last30',
      '60d': 'last60',
      '150d': 'last150',
      '180d': 'last180',
      '365d': 'last365'
    };
    const windowKey = windowKeyMap[selectedPeriod];
    
    let showed = 0;
    let noShow = 0;
    let confirmed = 0;
    let cancelled = 0;

    data.consultants.forEach(c => {
      const w = c.status_windows?.[windowKey] || {};
      showed += Number(w.showed || 0);
      noShow += Number(w.no_show || 0);
      // Logic from ConsultantDetail: unrecorded appointments default to confirmed
      const cConf = Number(w.confirmed || 0);
      const cCanc = Number(w.cancelled || 0);
      const cShow = Number(w.showed || 0);
      const cNo = Number(w.no_show || 0);
      const recorded = cConf + cCanc + cShow + cNo;
      const cAppts = Number(c[`appointments${currentSuffix}`] || 0);
      const unrecorded = Math.max(0, cAppts - recorded);
      
      confirmed += (cConf + unrecorded);
      cancelled += cCanc;
    });

    const totalShowedAndNoShow = showed + noShow;
    const showRate = totalShowedAndNoShow > 0 ? ((showed / totalShowedAndNoShow) * 100).toFixed(1) : 0;

    // Calculate Top Performers
    const consultants = [...data.consultants];
    
    // Top Lead Volume
    const topLeadsConsultant = [...consultants].sort((a, b) => 
      Number(b[`leads${currentSuffix}`] || 0) - Number(a[`leads${currentSuffix}`] || 0)
    )[0];

    // Top Appointments
    const topApptsConsultant = [...consultants].sort((a, b) => 
      Number(b[`appointments${currentSuffix}`] || 0) - Number(a[`appointments${currentSuffix}`] || 0)
    )[0];

    // Top Conversion (minimum 10 leads to be significant)
    const topConvConsultant = [...consultants]
      .filter(c => Number(c[`leads${currentSuffix}`] || 0) >= 10)
      .sort((a, b) => {
        const rateA = (Number(a[`appointments${currentSuffix}`] || 0) / Number(a[`leads${currentSuffix}`] || 0));
        const rateB = (Number(b[`appointments${currentSuffix}`] || 0) / Number(b[`leads${currentSuffix}`] || 0));
        return rateB - rateA;
      })[0];

    return {
      leads,
      appointments,
      referrals,
      conversionRate,
      referralRate,
      showRate,
      showed,
      noShow,
      confirmed,
      cancelled,
      totalStatus: showed + noShow + confirmed + cancelled,
      topPerformers: {
        leads: topLeadsConsultant,
        appointments: topApptsConsultant,
        conversion: topConvConsultant
      }
    };
  }, [data, currentSuffix, selectedPeriod]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    if (!stats) return [];
    
    return [
      { name: 'Showed', value: stats.showed, color: STATUS_COLORS.showed },
      { name: 'No Show', value: stats.no_show, color: STATUS_COLORS.no_show },
      { name: 'Confirmed', value: stats.confirmed, color: STATUS_COLORS.confirmed },
      { name: 'Cancelled', value: stats.cancelled, color: STATUS_COLORS.cancelled }
    ];
  }, [stats]);
  
  // Trend Mock Data (since we don't have historical snapshots in main webhook)
  // We use the periods array to simulate a "trend" view over time
  // This is smarter than random data - it uses the actual 7d/14d/30d aggregations
  const trendData = useMemo(() => {
    if(!data || !data.consultants) return [];

    const periods = [
        { key: '7d', label: '7D' },
        { key: '14d', label: '14D' },
        { key: '30d', label: '30D' },
        { key: '60d', label: '60D' },
        { key: '150d', label: '150D' },
        { key: '180d', label: '180D' },
        { key: '365d', label: '1Y' }
    ];

    return periods.map(p => {
        let leads = 0;
        let appointments = 0;
        const s = timePeriods[p.key].suffix;
        data.consultants.forEach(c => {
            leads += Number(c[`leads${s}`] || 0);
            appointments += Number(c[`appointments${s}`] || 0);
        });
        return { name: p.label, leads, appointments };
    });
  }, [data]);


  if (!data || !stats) return <div className="loading-state">Loading Analytics...</div>;

  return (
    <div className="analytics-dashboard">
      <div className="period-selector">
        {Object.entries(timePeriods).map(([key, config]) => (
          <button
            key={key}
            className={`period-btn ${selectedPeriod === key ? 'active' : ''}`}
            onClick={() => setSelectedPeriod(key)}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="analytics-grid kpi-row">
        <StatCard 
          label="Total Leads" 
          value={stats.leads.toLocaleString()} 
          trend={0} 
          trendLabel="total"
          icon={Users} 
        />
        <StatCard 
          label="Appointments" 
          value={stats.appointments.toLocaleString()} 
          trend={0} 
          trendLabel="total"
          icon={Calendar} 
        />
        <StatCard 
          label="Conversion Rate" 
          value={`${stats.conversionRate}%`} 
          trend={0} 
          trendLabel="avg"
          icon={TrendingUp} 
        />
        <StatCard 
          label="Confirmed" 
          value={stats.confirmed.toLocaleString()} 
          trend={0} 
          trendLabel="upcoming"
          icon={CheckCircle} 
        />
      </div>

      {/* Top Performers Row */}
      <div className="analytics-grid" style={{ marginBottom: '2rem' }}>
        <TopPerformerCard 
          label="Top Lead Volume" 
          name={stats.topPerformers.leads?.name || 'N/A'} 
          metric={Number(stats.topPerformers.leads?.[`leads${currentSuffix}`] || 0)} 
          metricLabel="leads"
          icon={Users} 
        />
        <TopPerformerCard 
          label="Top Appointments" 
          name={stats.topPerformers.appointments?.name || 'N/A'} 
          metric={Number(stats.topPerformers.appointments?.[`appointments${currentSuffix}`] || 0)} 
          metricLabel="appts"
          icon={Calendar} 
        />
        <TopPerformerCard 
          label="Top Conversion" 
          name={stats.topPerformers.conversion?.name || 'N/A'} 
          metric={stats.topPerformers.conversion ? 
            `${((Number(stats.topPerformers.conversion[`appointments${currentSuffix}`] || 0) / 
            Number(stats.topPerformers.conversion[`leads${currentSuffix}`] || 0)) * 100).toFixed(1)}%` : '0%'} 
          metricLabel="rate"
          icon={TrendingUp} 
        />
        <TopPerformerCard 
          label="Best Show Rate" 
          name={(() => {
            const bestShow = [...data.consultants]
              .filter(c => {
                const w = c.status_windows?.[timePeriods[selectedPeriod].windowKey] || {};
                return (Number(w.showed || 0) + Number(w.no_show || 0)) >= 5;
              })
              .sort((a, b) => {
                const wA = a.status_windows?.[timePeriods[selectedPeriod].windowKey] || {};
                const wB = b.status_windows?.[timePeriods[selectedPeriod].windowKey] || {};
                const rA = Number(wA.showed || 0) / (Number(wA.showed || 0) + Number(wA.no_show || 0));
                const rB = Number(wB.showed || 0) / (Number(wB.showed || 0) + Number(wB.no_show || 0));
                return rB - rA;
              })[0];
            return bestShow?.name || 'N/A';
          })()} 
          metric={(() => {
            const bestShow = [...data.consultants]
              .filter(c => {
                const w = c.status_windows?.[timePeriods[selectedPeriod].windowKey] || {};
                return (Number(w.showed || 0) + Number(w.no_show || 0)) >= 5;
              })
              .sort((a, b) => {
                const wA = a.status_windows?.[timePeriods[selectedPeriod].windowKey] || {};
                const wB = b.status_windows?.[timePeriods[selectedPeriod].windowKey] || {};
                const rA = Number(wA.showed || 0) / (Number(wA.showed || 0) + Number(wA.no_show || 0));
                const rB = Number(wB.showed || 0) / (Number(wB.showed || 0) + Number(wB.no_show || 0));
                return rB - rA;
              })[0];
            if (!bestShow) return '0%';
            const w = bestShow.status_windows?.[timePeriods[selectedPeriod].windowKey] || {};
            return `${((Number(w.showed || 0) / (Number(w.showed || 0) + Number(w.no_show || 0))) * 100).toFixed(1)}%`;
          })()} 
          metricLabel="rate"
          icon={Award} 
        />
      </div>

      {/* Quality Scorecard */}
      <div className="quality-scorecard" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Award size={28} />
          <h2 style={{ margin: 0 }}>Team Quality Scorecard</h2>
        </div>
        <div className="scorecard-grid">
          <div className="score-item overall">
            <span className="score-label">Overall Show Rate</span>
            <span className="score-value-large">{stats.showRate > 0 ? `${stats.showRate}%` : <span style={{color: '#cbd5e0'}}>—</span>}</span>
            <span className="score-subtitle">of total appointments</span>
          </div>
          <div className="score-item">
            <span className="score-label">Appointment Rate</span>
            <div className="score-value">{stats.conversionRate > 0 ? `${stats.conversionRate}%` : <span style={{color: '#cbd5e0'}}>—</span>}</div>
            <span className="score-subtitle">Lead to Appointment</span>
          </div>
          <div className="score-item">
            <span className="score-label">Confirmation Stability</span>
            <div className="score-value">
              {stats.appointments > 0 
                ? `${(((stats.confirmed + stats.showed) / stats.appointments) * 100).toFixed(1)}%` 
                : <span style={{color: '#cbd5e0'}}>—</span>}
            </div>
            <span className="score-subtitle">Confirmed or Showed</span>
          </div>
          <div className="score-item">
            <span className="score-label">Cancel Rate</span>
            <div className="score-value" style={{ color: stats.appointments > 0 && stats.cancelled > 0 ? '#e53e3e' : '#cbd5e0' }}>
              {stats.appointments > 0 && stats.cancelled > 0
                ? `${((stats.cancelled / stats.appointments) * 100).toFixed(1)}%`
                : '—'}
            </div>
            <span className="score-subtitle">of total appointments</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Row 1: Traffic Overview (full width) */}
        <Card title="Traffic Overview (Trends)" className="chart-card">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3182ce" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3182ce" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38a169" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#38a169" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="leads" stroke="#3182ce" fillOpacity={1} fill="url(#colorLeads)" />
              <Area type="monotone" dataKey="appointments" stroke="#38a169" fillOpacity={1} fill="url(#colorAppts)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Row 2: Conversion Funnel (60%) + Lead Quality (40%) */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }}>
          {/* Conversion Funnel - Left side (60%) */}
          <Card title="Conversion Funnel" className="chart-card">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                layout="vertical"
                data={[
                  { name: 'Leads', value: stats.leads, fill: '#3182ce' },
                  { name: 'Appointments', value: stats.appointments, fill: '#4299e1' },
                  { name: 'Confirmed', value: stats.confirmed, fill: '#38a169' },
                  { name: 'Showed', value: stats.showed, fill: '#2b6cb0' },
                ]}
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="value" barSize={24} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Lead Quality - Right side (40%) */}
          <Card title={`Lead Quality (${timePeriods[selectedPeriod].label})`} className="chart-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Appointment Status Donut */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Appointment Status
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={55}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: '10px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Referral Performance - Compact */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Referrals
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #3182ce' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#2c5282' }}>{stats.referrals}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{stats.referralRate}% of appts</div>
                  </div>
                  <div style={{ flex: 1, background: '#f0fff4', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #38a169' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Avg/Consultant</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#276749' }}>{(stats.referrals > 0 ? (stats.referrals / data.consultants.length).toFixed(1) : 0)}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>efficiency</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      <ConsultantRankingTable 
        data={data}
        period={timePeriods[selectedPeriod]}
        consultants={data.consultants || []}
      />
    </div>
  );
};

export default AnalyticsDashboard;
