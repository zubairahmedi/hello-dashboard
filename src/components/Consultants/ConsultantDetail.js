import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid, ComposedChart, PieChart, Pie, Cell
} from 'recharts';
import './Consultant.css';
// ⚠️ SEPARATE MONTHLY WEBHOOK SERVICE - DO NOT TOUCH MAIN DASHBOARD DATA
import { fetchMonthlyPerformance, analyzeBestWorstMonths } from '../../utils/monthlyPerformanceService';

export default function ConsultantDetail({ consultant, allConsultants }) {
  // ========== SEPARATE MONTHLY DATA SERVICE ==========
  // ⚠️ This uses a DIFFERENT webhook for monthly breakdown
  // ⚠️ Does NOT affect main dashboard data or charts
  const [monthlyPerformance, setMonthlyPerformance] = useState(null);
  const [loadingMonthly, setLoadingMonthly] = useState(true);

  // Function to load monthly data (can be called manually for refresh)
  const loadMonthlyData = async () => {
    setLoadingMonthly(true);
    try {
      const data = await fetchMonthlyPerformance({ id: consultant.id, name: consultant.name });
      setMonthlyPerformance(data);
    } catch (error) {
      console.error('[ConsultantDetail] Monthly fetch failed:', error);
      setMonthlyPerformance(null);
    } finally {
      setLoadingMonthly(false);
    }
  };

  // Fetch monthly performance data from SEPARATE webhook on consultant change
  useEffect(() => {
    if (consultant && consultant.name) {
      loadMonthlyData();
    }
  }, [consultant.name]);

  // Analyze best/worst months from monthly data
  const bestWorstAnalysis = useMemo(() => {
    if (!monthlyPerformance) {
      return { best: null, worst: null, allMonths: [] };
    }
    return analyzeBestWorstMonths(monthlyPerformance);
  }, [monthlyPerformance]);

  // Prepare monthly trend chart data (sorted chronologically, last 12 months)
  const monthlyTrendData = useMemo(() => {
    if (!bestWorstAnalysis.allMonths || bestWorstAnalysis.allMonths.length === 0) {
      return [];
    }

    // Sort by monthKey (YYYY-MM format sorts chronologically)
    const sorted = [...bestWorstAnalysis.allMonths].sort((a, b) => 
      a.monthKey.localeCompare(b.monthKey)
    );

    // Take last 12 months only
    const last12 = sorted.slice(-12);

    // Find the month with highest total appointments (biggest = green)
    let maxAppointments = 0;
    let maxMonthKey = null;
    last12.forEach(month => {
      if (month.appointments > maxAppointments) {
        maxAppointments = month.appointments;
        maxMonthKey = month.monthKey;
      }
    });

    // Format for chart - stacked bar with one bar per month
    return last12.map(month => {
      const showed = month.showed;
      const noshow = month.rawData.noshow || 0;
      const confirmed = month.rawData.confirmed || 0;
      const cancelled = month.rawData.cancelled || 0;
      
      return {
        month: month.label,
        showed: showed,
        noshow: noshow,
        confirmed: confirmed,
        cancelled: cancelled,
        total: month.appointments,
        showRate: month.showRate,
        monthKey: month.monthKey,
        // Color green if this is the max month
        isMax: month.monthKey === maxMonthKey
      };
    });
  }, [bestWorstAnalysis]);
  // ========== END SEPARATE MONTHLY DATA SERVICE ==========

  // periods and suffix mapping
  const periods = [
    { key: '7d', label: '7D', suffix: '_7d', windowKey: 'last7' },
    { key: '14d', label: '14D', suffix: '_14d', windowKey: 'last14' },
    { key: '30d', label: '30D', suffix: '_30d', windowKey: 'last30' },
    { key: '60d', label: '60D', suffix: '_60d', windowKey: 'last60' },
    { key: '150d', label: '150D', suffix: '_150d', windowKey: 'last150' },
    { key: '180d', label: '180D', suffix: '_180d', windowKey: 'last180' },
    { key: '365d', label: '1Y', suffix: '_365d', windowKey: 'last365' }
  ];

  const chartData = useMemo(() => {
    return periods.map((p, idx) => {
      const leads = Number(consultant[`leads${p.suffix}`] || 0);
      const appointments = Number(consultant[`appointments${p.suffix}`] || 0);
      const referrals = Number(consultant[`referrals${p.suffix}`] || 0);

      // Get period-specific status from status_windows
      const statusWindow = consultant.status_windows?.[p.windowKey] || {};
      const showed = Number(statusWindow.showed || 0);
      const noShow = Number(statusWindow.no_show || 0);
      let confirmed = Number(statusWindow.confirmed || 0);
      const cancelled = Number(statusWindow.cancelled || 0);
      const totalRecorded = showed + noShow + confirmed + cancelled;
      const unrecorded = Math.max(0, appointments - totalRecorded);
      // Unrecorded appointments are treated as confirmed
      confirmed = confirmed + unrecorded;

      // team average
      let teamLeads = 0;
      let teamAppointments = 0;
      let teamConversion = 0;
      if (Array.isArray(allConsultants) && allConsultants.length > 0) {
        const totals = allConsultants.reduce((acc, c) => {
          acc.leads += Number(c[`leads${p.suffix}`] || 0);
          acc.appointments += Number(c[`appointments${p.suffix}`] || 0);
          return acc;
        }, { leads: 0, appointments: 0 });
        teamLeads = Math.round(totals.leads / allConsultants.length);
        teamAppointments = Math.round(totals.appointments / allConsultants.length);
        teamConversion = totals.leads > 0 ? ((totals.appointments / totals.leads) * 100).toFixed(1) : 0;
      }

      const conversion = leads > 0 ? ((appointments / leads) * 100).toFixed(1) : '0.0';
      const showRate = appointments > 0 ? ((showed / appointments) * 100).toFixed(1) : '0.0';
      const vsTeam = teamLeads > 0 ? ((leads / teamLeads - 1) * 100).toFixed(0) : 0;

      return {
        period: p.label,
        leads,
        appointments,
        referrals,
        confirmed,
        showed,
        noShow,
        cancelled,
        conversion: parseFloat(conversion),
        showRate: parseFloat(showRate),
        teamLeads,
        teamAppointments,
        teamConversion: parseFloat(teamConversion),
        vsTeam: parseInt(vsTeam)
      };
    });
  }, [consultant, allConsultants]);

  // Get current period data (30d default)
  const currentPeriod = chartData.find(d => d.period === '30D') || chartData[2];

  const statusColors = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#9ca3af'];
  
  const statusBreakdown = useMemo(() => {
    return [
      { name: 'Showed', value: currentPeriod.showed, color: '#10b981' },
      { name: 'Confirmed', value: currentPeriod.confirmed, color: '#06b6d4' },
      { name: 'No Show', value: currentPeriod.noShow, color: '#f59e0b' },
      { name: 'Cancelled', value: currentPeriod.cancelled, color: '#ef4444' }
    ].filter(s => s.value > 0);
  }, [currentPeriod]);

  const performanceVsTeam = useMemo(() => {
    return [
      {
        metric: 'Leads',
        consultant: currentPeriod.leads,
        team: currentPeriod.teamLeads
      },
      {
        metric: 'Appointments',
        consultant: currentPeriod.appointments,
        team: currentPeriod.teamAppointments
      }
    ];
  }, [currentPeriod]);

  const conversionTrend = useMemo(() => {
    return chartData.map(d => ({
      period: d.period,
      conversion: d.conversion,
      showRate: d.showRate
    }));
  }, [chartData]);

  const growthData = useMemo(() => {
    return chartData.map((d, idx) => {
      const prev = idx > 0 ? chartData[idx - 1] : d;
      const leadGrowth = prev.leads > 0 ? (((d.leads - prev.leads) / prev.leads) * 100).toFixed(1) : 0;
      const apptGrowth = prev.appointments > 0 ? (((d.appointments - prev.appointments) / prev.appointments) * 100).toFixed(1) : 0;
      return {
        period: d.period,
        leads: d.leads,
        appointments: d.appointments,
        leadGrowth: parseFloat(leadGrowth),
        apptGrowth: parseFloat(apptGrowth)
      };
    });
  }, [chartData]);

  // 📈 Performance trend analysis (last 6 months = 180d)
  const performanceTrend = useMemo(() => {
    const sixMonthIndex = chartData.findIndex(d => d.period === '180D');
    const sixMonthData = sixMonthIndex >= 0 ? chartData[sixMonthIndex] : null;
    const oneMonthData = currentPeriod;
    
    if (!sixMonthData) return { trend: 'no-data', analysis: '' };
    
    // Calculate 6-month daily averages for better understanding
    const sixMonthDailyLeads = sixMonthData.leads / 180;
    const sixMonthDailyAppts = sixMonthData.appointments / 180;
    const thirtyDayDailyLeads = oneMonthData.leads / 30;
    const thirtyDayDailyAppts = oneMonthData.appointments / 30;
    
    // Compare metrics
    const conversionChange = oneMonthData.conversion - sixMonthData.conversion;
    const showRateChange = oneMonthData.showRate - sixMonthData.showRate;
    const leadsPerMonth = sixMonthData.leads / 6;
    const currentLeadsPerMonth = oneMonthData.leads;
    const leadsVelocityChange = ((currentLeadsPerMonth - leadsPerMonth) / leadsPerMonth) * 100;
    
    // Calculate what the changes mean in real terms
    const leadsDifference = currentLeadsPerMonth - leadsPerMonth;
    const appointmentsDifference = oneMonthData.appointments - (sixMonthData.appointments / 6);
    
    // Determine trend
    const positiveIndicators = [
      conversionChange > 0,
      showRateChange > 0,
      leadsVelocityChange > 0
    ].filter(Boolean).length;
    
    let trend = 'stable';
    let analysis = '';
    let trendIcon = '→';
    let trendColor = '#9ca3af';
    let detailedAnalysis = '';
    
    if (positiveIndicators >= 2) {
      trend = 'improving';
      trendIcon = '↑';
      trendColor = '#10b981';
      
      const conversionDesc = conversionChange > 0 ? `more effective at converting leads (+${conversionChange.toFixed(1)}%)` : 'still converting leads';
      const showRateDesc = showRateChange > 0 ? `better at getting clients to show up (+${showRateChange.toFixed(1)}%)` : 'maintaining show rates';
      const leadsDesc = leadsDifference > 0 ? `generating ${leadsDifference.toFixed(0)} more leads per month` : 'consistent lead generation';
      
      analysis = `Performance is improving! Conversion up ${conversionChange.toFixed(1)}%, Show rate up ${showRateChange.toFixed(1)}%, Lead velocity up ${leadsVelocityChange.toFixed(0)}%`;
      
      detailedAnalysis = `
        <strong>What this means:</strong> Over the last 6 months, this consultant is performing better than their historical average. They are now ${conversionDesc}, 
        ${showRateDesc}, and ${leadsDesc}. This trend indicates positive momentum and suggests current strategies are working well.
        
        <strong>Current pace (30D):</strong> Averaging ${thirtyDayDailyLeads.toFixed(1)} leads/day and ${thirtyDayDailyAppts.toFixed(1)} appointments/day.
        <strong>6-Month average pace:</strong> Was only ${sixMonthDailyLeads.toFixed(1)} leads/day and ${sixMonthDailyAppts.toFixed(1)} appointments/day.
        
        <strong>Recommendation:</strong> Continue current approach. The consultant has found what works. Consider documenting best practices to share with team.
      `;
    } else if (positiveIndicators === 1) {
      trend = 'mixed';
      trendIcon = '↔';
      trendColor = '#f59e0b';
      
      const improving = conversionChange > 0 ? 'conversion' : showRateChange > 0 ? 'show rate' : 'lead generation';
      const declining = conversionChange > 0 ? (showRateChange > 0 ? 'lead velocity' : 'show rate') : 
                       showRateChange > 0 ? 'conversion' : 'conversion';
      
      analysis = `Mixed signals: Conversion ${conversionChange > 0 ? '↑' : '↓'} ${Math.abs(conversionChange).toFixed(1)}%, Show rate ${showRateChange > 0 ? '↑' : '↓'} ${Math.abs(showRateChange).toFixed(1)}%`;
      
      detailedAnalysis = `
        <strong>What this means:</strong> Performance is inconsistent. While improving in ${improving}, there's a decline in ${declining}.
        This suggests some strategies are working but overall optimization is needed.
        
        <strong>Performance snapshot:</strong>
        • Conversion rate: ${sixMonthData.conversion.toFixed(1)}% (6M avg) → ${oneMonthData.conversion.toFixed(1)}% (current) - ${conversionChange > 0 ? `+${conversionChange.toFixed(1)}%` : `${conversionChange.toFixed(1)}%`}
        • Show rate: ${sixMonthData.showRate.toFixed(1)}% (6M avg) → ${oneMonthData.showRate.toFixed(1)}% (current) - ${showRateChange > 0 ? `+${showRateChange.toFixed(1)}%` : `${showRateChange.toFixed(1)}%`}
        • Lead velocity: ${leadsVelocityChange > 0 ? `+${leadsVelocityChange.toFixed(0)}%` : `${leadsVelocityChange.toFixed(0)}%`}
        
        <strong>Recommendation:</strong> Investigate where performance is improving and where it's declining. Identify what changed and adjust strategy accordingly.
      `;
    } else {
      trend = 'declining';
      trendIcon = '↓';
      trendColor = '#ef4444';
      
      const conversionTrend = conversionChange > 0 ? 'improving slightly' : `declining by ${Math.abs(conversionChange).toFixed(1)}%`;
      const showRateTrend = showRateChange > 0 ? 'improving slightly' : `declining by ${Math.abs(showRateChange).toFixed(1)}%`;
      const leadsTrend = leadsVelocityChange > 0 ? 'slightly increasing' : `declining by ${Math.abs(leadsVelocityChange).toFixed(0)}%`;
      
      analysis = `Performance is declining. Conversion down ${Math.abs(conversionChange).toFixed(1)}%, Show rate down ${Math.abs(showRateChange).toFixed(1)}%, Lead velocity down ${Math.abs(leadsVelocityChange).toFixed(0)}%`;
      
      detailedAnalysis = `
        <strong>What this means:</strong> This consultant's performance has declined compared to their 6-month average. 
        They are ${conversionTrend}, ${showRateTrend}, and lead generation is ${leadsTrend}. 
        This indicates a need for strategy adjustment and support.
        
        <strong>Performance snapshot:</strong>
        • Conversion rate: ${sixMonthData.conversion.toFixed(1)}% (6M avg) → ${oneMonthData.conversion.toFixed(1)}% (current) - ${conversionChange.toFixed(1)}%
        • Show rate: ${sixMonthData.showRate.toFixed(1)}% (6M avg) → ${oneMonthData.showRate.toFixed(1)}% (current) - ${showRateChange.toFixed(1)}%
        • Lead velocity: ${leadsVelocityChange.toFixed(0)}% vs 6-month average
        
        <strong>Context:</strong> Last 30 days: ${oneMonthData.leads} leads, ${oneMonthData.appointments} appointments (${oneMonthData.conversion}% conversion)
        6-month average: ${Math.round(leadsPerMonth)} leads/month, ${Math.round(sixMonthData.appointments/6)} appointments/month (${sixMonthData.conversion.toFixed(1)}% conversion)
        
        <strong>Recommendation:</strong> Schedule a coaching session to identify challenges. Review recent process changes. Consider additional training or support.
      `;
    }
    
    return {
      trend,
      analysis,
      trendIcon,
      trendColor,
      detailedAnalysis,
      conversionChange: parseFloat(conversionChange.toFixed(1)),
      showRateChange: parseFloat(showRateChange.toFixed(1)),
      leadsVelocityChange: parseFloat(leadsVelocityChange.toFixed(1)),
      sixMonthData,
      oneMonthData,
      leadsPerMonth: parseFloat(leadsPerMonth.toFixed(0)),
      sixMonthDailyLeads: parseFloat(sixMonthDailyLeads.toFixed(2)),
      thirtyDayDailyLeads: parseFloat(thirtyDayDailyLeads.toFixed(2))
    };
  }, [chartData, currentPeriod]);

  const conversion = (leads, appts) => (leads > 0 ? ((appts / leads) * 100).toFixed(1) : '0.0');

  return (
    <div id="consultant-root" className="consultant-details">
      <h3 style={{marginTop: '30px', marginBottom: '20px'}}>Detailed Performance Analytics</h3>

      <div className="charts-section">
        {/* 1. Leads vs Appointments Trend */}
        <div className="chart-container half-width">
          <div className="chart-content">
            <h4>Lead & Appointment Trends</h4>
            <p className="chart-description">Tracks lead generation and appointment creation over time periods.</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#764ba2" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#764ba2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(v) => v.toFixed(0)} />
                <Legend />
                <Area type="monotone" dataKey="leads" stroke="#667eea" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
                <Area type="monotone" dataKey="appointments" stroke="#764ba2" fillOpacity={1} fill="url(#colorAppts)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend-pdf">
            <h5>📖 Chart Guide</h5>
            <ul>
              <li><span className="color-indicator" style={{background: '#667eea'}}></span><strong>Purple Area:</strong> Leads generated</li>
              <li><span className="color-indicator" style={{background: '#764ba2'}}></span><strong>Dark Purple:</strong> Appointments booked</li>
              <li><strong>Rising Lines:</strong> Growing pipeline</li>
              <li><strong>Gap Between:</strong> Conversion opportunity</li>
            </ul>
            <div style={{marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '4px', borderLeft: '3px solid #667eea'}}>
              <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#1e293b'}}>📊 Result:</p>
              <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                1-year: {chartData[6]?.leads || 0} leads → {chartData[6]?.appointments || 0} appointments ({chartData[6]?.conversion || 0}% conversion). 
                Trend: {chartData[0]?.leads < chartData[6]?.leads ? 'Growing' : 'Declining'} lead volume.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Conversion Rate Trend */}
        <div className="chart-container half-width">
          <div className="chart-content">
            <h4>Conversion & Show Rate Trends</h4>
            <p className="chart-description">Shows how effectively leads convert to appointments and appointment show rates.</p>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={conversionTrend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="conversion" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} name="Conversion Rate (%)" />
                <Line yAxisId="right" type="monotone" dataKey="showRate" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} name="Show Rate (%)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend-pdf">
            <h5>Chart Guide</h5>
            <ul>
              <li><span className="color-indicator" style={{background: '#f59e0b'}}></span><strong>Orange Line:</strong> Lead → Appointment conversion %</li>
              <li><span className="color-indicator" style={{background: '#06b6d4'}}></span><strong>Cyan Line:</strong> Appointment show rate %</li>
              <li><strong>Upward Trend:</strong> Improving performance</li>
              <li><strong>Target:</strong> Conversion 20%+, Show Rate 50%+</li>
            </ul>
            <div style={{marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '4px', borderLeft: '3px solid #f59e0b'}}>
              <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#1e293b'}}>Result:</p>
              <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                Current: {currentPeriod.conversion}% conversion, {currentPeriod.showRate}% show rate. 
                {currentPeriod.conversion >= 20 ? 'Meeting' : 'Below'} conversion target. 
                {currentPeriod.showRate >= 50 ? 'Meeting' : 'Below'} show rate target.
              </p>
            </div>
          </div>
        </div>

        {/* 2.5 Performance Over Time (6 Month Trend) */}
        <div className="chart-container half-width">
          <div className="chart-content">
            <h4>Performance Over Time (Last 6 Months)</h4>
            <p className="chart-description">Tracks overall performance changes comparing 180-day average to current 30-day performance.</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[
                  {
                    name: 'Metric',
                    '6M Avg': 0,
                    '30D Current': 0,
                    'Conversion 6M': parseFloat((chartData.find(d => d.period === '180D')?.conversion || 0).toFixed(1)),
                    'Conversion 30D': currentPeriod.conversion,
                    'Show Rate 6M': parseFloat((chartData.find(d => d.period === '180D')?.showRate || 0).toFixed(1)),
                    'Show Rate 30D': currentPeriod.showRate
                  }
                ]}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload) {
                      return (
                        <div style={{backgroundColor: 'white', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '4px'}}>
                          <p style={{margin: '0 0 5px 0', color: '#667eea', fontWeight: '600'}}>Conversion Rate: {payload[0].payload['Conversion 6M'].toFixed(1)}% (6M) → {payload[0].payload['Conversion 30D'].toFixed(1)}% (30D)</p>
                          <p style={{margin: '0', color: '#06b6d4', fontWeight: '600'}}>Show Rate: {payload[0].payload['Show Rate 6M'].toFixed(1)}% (6M) → {payload[0].payload['Show Rate 30D'].toFixed(1)}% (30D)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="Conversion 6M" fill="#667eea" opacity={0.6} name="Conv 6M Avg" />
                <Bar dataKey="Conversion 30D" fill="#667eea" opacity={1} name="Conv 30D" />
                <Bar dataKey="Show Rate 6M" fill="#06b6d4" opacity={0.6} name="Show 6M Avg" />
                <Bar dataKey="Show Rate 30D" fill="#06b6d4" opacity={1} name="Show 30D" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend-pdf">
            <h5>Chart Guide</h5>
            <ul>
              <li><span className="color-indicator" style={{background: '#667eea', opacity: 0.6}}></span><strong>Light Purple:</strong> 6-month average conversion</li>
              <li><span className="color-indicator" style={{background: '#667eea'}}></span><strong>Dark Purple:</strong> Current 30-day conversion</li>
              <li><span className="color-indicator" style={{background: '#06b6d4', opacity: 0.6}}></span><strong>Light Cyan:</strong> 6-month average show rate</li>
              <li><span className="color-indicator" style={{background: '#06b6d4'}}></span><strong>Dark Cyan:</strong> Current 30-day show rate</li>
              <li><strong>Compare:</strong> Current vs historical trend</li>
            </ul>
            <div style={{marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '4px', borderLeft: '3px solid #06b6d4'}}>
              <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#1e293b'}}>Result:</p>
              <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                Conversion: {(chartData.find(d => d.period === '180D')?.conversion || 0).toFixed(1)}% (6M) → {currentPeriod.conversion}% (30D) {currentPeriod.conversion > (chartData.find(d => d.period === '180D')?.conversion || 0) ? 'Up' : 'Down'}. 
                Show Rate: {(chartData.find(d => d.period === '180D')?.showRate || 0).toFixed(1)}% → {currentPeriod.showRate}% {currentPeriod.showRate > (chartData.find(d => d.period === '180D')?.showRate || 0) ? 'Up' : 'Down'}.
              </p>
            </div>
          </div>
        </div>        {/* 3. Status Breakdown Pie Chart */}
        <div className="chart-container half-width">
          <div className="chart-content">
            <h4>📋 Appointment Status Distribution (30D)</h4>
            <p className="chart-description">Breakdown of appointment outcomes: showed, no-shows, confirmed, cancelled.</p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => v.toFixed(0)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend-pdf">
            <h5>📖 Chart Guide</h5>
            <ul>
              <li><span className="color-indicator" style={{background: '#10b981'}}></span><strong>Green:</strong> Showed (completed appointments)</li>
              <li><span className="color-indicator" style={{background: '#06b6d4'}}></span><strong>Cyan:</strong> Confirmed (pending)</li>
              <li><span className="color-indicator" style={{background: '#f59e0b'}}></span><strong>Orange:</strong> No Show (missed)</li>
              <li><span className="color-indicator" style={{background: '#ef4444'}}></span><strong>Red:</strong> Cancelled</li>
              <li><strong>Goal:</strong> Maximize green, minimize orange</li>
            </ul>
            <div style={{marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '4px', borderLeft: '3px solid #10b981'}}>
              <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#1e293b'}}>📊 Result:</p>
              <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                Of {currentPeriod.appointments} appointments: {currentPeriod.showed} showed ({((currentPeriod.showed/currentPeriod.appointments)*100).toFixed(0)}%), 
                {currentPeriod.noShow} no-shows ({((currentPeriod.noShow/currentPeriod.appointments)*100).toFixed(0)}%). 
                {currentPeriod.noShow > currentPeriod.showed ? '⚠ No-shows exceed shows' : '✓ More shows than no-shows'}.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Performance vs Team */}
        <div className="chart-container half-width">
          <div className="chart-content">
            <h4>👥 Performance vs Team Average (30D)</h4>
            <p className="chart-description">Compares individual performance metrics against team averages.</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={performanceVsTeam} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="consultant" fill="#667eea" name={consultant.name || 'Consultant'} />
                <Bar dataKey="team" fill="#9ca3af" name="Team Average" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend-pdf">
            <h5>📖 Chart Guide</h5>
            <ul>
              <li><span className="color-indicator" style={{background: '#667eea'}}></span><strong>Purple Bars:</strong> This consultant's metrics</li>
              <li><span className="color-indicator" style={{background: '#9ca3af'}}></span><strong>Gray Bars:</strong> Team average benchmark</li>
              <li><strong>Taller Purple:</strong> Above team average ✓</li>
              <li><strong>Taller Gray:</strong> Below team average (improvement area)</li>
            </ul>
            <div style={{marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '4px', borderLeft: '3px solid #667eea'}}>
              <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#1e293b'}}>📊 Result:</p>
              <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                {currentPeriod.vsTeam > 0 ? `🏆 Outperforming team by ${currentPeriod.vsTeam}%` : currentPeriod.vsTeam < 0 ? `📉 ${Math.abs(currentPeriod.vsTeam)}% below team average` : 'At team average'}. 
                Leads: {currentPeriod.leads} vs team avg {currentPeriod.teamLeads.toFixed(0)}.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Status Details Bar Chart */}
        <div className="chart-container half-width">
          <div className="chart-content">
            <h4>✅ Appointment Status Details (30D)</h4>
            <p className="chart-description">Detailed breakdown of each appointment outcome category.</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[{
                  name: 'Status',
                  Showed: currentPeriod.showed,
                  Confirmed: currentPeriod.confirmed,
                  'No Show': currentPeriod.noShow,
                  Cancelled: currentPeriod.cancelled
                }]}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={50} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Showed" fill="#10b981" />
                <Bar dataKey="Confirmed" fill="#06b6d4" />
                <Bar dataKey="No Show" fill="#f59e0b" />
                <Bar dataKey="Cancelled" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend-pdf">
            <h5>📖 Chart Guide</h5>
            <ul>
              <li><span className="color-indicator" style={{background: '#10b981'}}></span><strong>Showed:</strong> Client attended appointment</li>
              <li><span className="color-indicator" style={{background: '#06b6d4'}}></span><strong>Confirmed:</strong> Appointment scheduled, not yet occurred</li>
              <li><span className="color-indicator" style={{background: '#f59e0b'}}></span><strong>No Show:</strong> Client didn't attend</li>
              <li><span className="color-indicator" style={{background: '#ef4444'}}></span><strong>Cancelled:</strong> Appointment cancelled</li>
              <li><strong>Focus:</strong> Convert confirmed → showed, reduce no-shows</li>
            </ul>
            <div style={{marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '4px', borderLeft: '3px solid #10b981'}}>
              <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#1e293b'}}>📊 Result:</p>
              <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                Highest: {Math.max(currentPeriod.showed, currentPeriod.confirmed, currentPeriod.noShow, currentPeriod.cancelled) === currentPeriod.showed ? 'Showed' : Math.max(currentPeriod.showed, currentPeriod.confirmed, currentPeriod.noShow, currentPeriod.cancelled) === currentPeriod.noShow ? 'No-shows' : Math.max(currentPeriod.showed, currentPeriod.confirmed, currentPeriod.noShow, currentPeriod.cancelled) === currentPeriod.confirmed ? 'Confirmed' : 'Cancelled'} ({Math.max(currentPeriod.showed, currentPeriod.confirmed, currentPeriod.noShow, currentPeriod.cancelled)}). 
                {currentPeriod.confirmed > 0 ? `${currentPeriod.confirmed} pending confirmations to convert.` : 'No pending confirmations.'}
              </p>
            </div>
          </div>
        </div>

        {/* 6. Period-over-Period Growth */}
        <div className="chart-container half-width">
          <div className="chart-content">
            <h4>📊 Period-to-Period Growth Rate</h4>
            <p className="chart-description">Shows momentum in lead and appointment generation across periods.</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={growthData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(v) => v.toFixed(1)} />
                <Legend />
                <Bar dataKey="leadGrowth" fill="#667eea" name="Lead Growth %" />
                <Bar dataKey="apptGrowth" fill="#764ba2" name="Appointment Growth %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend-pdf">
            <h5>📖 Chart Guide</h5>
            <ul>
              <li><span className="color-indicator" style={{background: '#667eea'}}></span><strong>Purple Bars:</strong> Lead growth rate %</li>
              <li><span className="color-indicator" style={{background: '#764ba2'}}></span><strong>Dark Purple:</strong> Appointment growth rate %</li>
              <li><strong>Positive Values:</strong> Growth vs previous period</li>
              <li><strong>Negative Values:</strong> Decline vs previous period</li>
              <li><strong>Watch:</strong> Consistent positive = strong momentum</li>
            </ul>
            <div style={{marginTop: '12px', padding: '10px', background: '#fff', borderRadius: '4px', borderLeft: '3px solid #667eea'}}>
              <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#1e293b'}}>📊 Result:</p>
              <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                Recent trend: {growthData[growthData.length-1]?.leadGrowth > 0 ? '📈 Growing' : '📉 Declining'} leads ({growthData[growthData.length-1]?.leadGrowth > 0 ? '+' : ''}{growthData[growthData.length-1]?.leadGrowth}%), 
                {growthData[growthData.length-1]?.apptGrowth > 0 ? '📈 Growing' : '📉 Declining'} appointments ({growthData[growthData.length-1]?.apptGrowth > 0 ? '+' : ''}{growthData[growthData.length-1]?.apptGrowth}%).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Period Comparison Table */}
      <div className="chart-container full-width" style={{marginTop: '30px'}}>
        <h4>📈 Complete Period Performance Breakdown</h4>
        <div className="table-container">
          <table className="consultant-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Leads</th>
                <th>Appointments</th>
                <th>Conversion</th>
                <th>Showed</th>
                <th>No Show</th>
                <th>Confirmed</th>
                <th>Cancelled</th>
                <th>Show Rate</th>
                <th>vs Team</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map(row => (
                <tr key={row.period}>
                  <td><strong>{row.period}</strong></td>
                  <td className="metric">{row.leads}</td>
                  <td className="metric">{row.appointments}</td>
                  <td className="metric" style={{color: row.conversion > row.teamConversion ? '#10b981' : '#f59e0b'}}>{row.conversion}%</td>
                  <td className="metric" style={{color: '#10b981'}}>{row.showed}</td>
                  <td className="metric" style={{color: '#f59e0b'}}>{row.noShow}</td>
                  <td className="metric" style={{color: '#06b6d4'}}>{row.confirmed}</td>
                  <td className="metric" style={{color: '#ef4444'}}>{row.cancelled}</td>
                  <td className="metric" style={{color: row.showRate > 50 ? '#10b981' : row.showRate > 25 ? '#f59e0b' : '#ef4444'}}>{row.showRate}%</td>
                  <td className="metric" style={{color: row.vsTeam > 0 ? '#10b981' : '#ef4444'}}>{row.vsTeam > 0 ? '+' : ''}{row.vsTeam}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

{/* Legend & Explanations */}
<div className="metrics-legend" style={{marginTop: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb'}}>
  <h4>📌 Metric Explanations</h4>
  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px'}}>
    <div>
      <p><strong>Conversion Rate:</strong> Percentage of leads that become appointments (Appointments ÷ Leads × 100)</p>
      <p><strong>Show Rate:</strong> Percentage of appointments where the client showed up (Showed ÷ Appointments × 100)</p>
    </div>
    <div>
      <p><strong>vs Team:</strong> Performance difference vs team average (+/- %)</p>
      <p><strong>Status Categories:</strong> Showed (attended), Confirmed (booked), No Show (missed), Cancelled (cancelled)</p>
    </div>
  </div>
</div>


      {/* 6-Month Performance Trend Analysis */}
      <div className="trend-analysis-section" style={{marginTop: '30px', padding: '25px', backgroundColor: performanceTrend.trend === 'improving' ? '#ecfdf5' : performanceTrend.trend === 'declining' ? '#fef2f2' : '#f0f9ff', borderRadius: '12px', border: `2px solid ${performanceTrend.trend === 'improving' ? '#10b981' : performanceTrend.trend === 'declining' ? '#ef4444' : '#06b6d4'}`}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px'}}>
          <h3 style={{margin: 0, color: '#333', fontSize: '18px', fontWeight: '700'}}>
            📊 6-Month Performance Analysis & Insights
          </h3>
          <span style={{fontSize: '48px', color: performanceTrend.trendColor}}>{performanceTrend.trendIcon}</span>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px'}}>
          <div style={{padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: `2px solid ${performanceTrend.conversionChange > 0 ? '#06b6d4' : '#ec4899'}`, boxShadow: `0 0 12px ${performanceTrend.conversionChange > 0 ? 'rgba(6, 182, 212, 0.1)' : 'rgba(236, 72, 153, 0.1)'}`}}>
            <p style={{margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', fontWeight: '600'}}>Conversion Rate Trend</p>
            <p style={{margin: '0', fontSize: '24px', fontWeight: '700', color: performanceTrend.conversionChange > 0 ? '#06b6d4' : '#ec4899'}}>
              {performanceTrend.conversionChange > 0 ? '+' : ''}{performanceTrend.conversionChange}%
            </p>
            <p style={{margin: '5px 0 0 0', fontSize: '13px', color: '#666'}}>
              {performanceTrend.sixMonthData.conversion.toFixed(1)}% → {performanceTrend.oneMonthData.conversion.toFixed(1)}%
            </p>
            <p style={{margin: '3px 0 0 0', fontSize: '12px', color: '#999', fontStyle: 'italic'}}>
              {performanceTrend.conversionChange > 0 ? 'Better at converting leads' : 'Fewer leads converting to appointments'}
            </p>
          </div>

          <div style={{padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: `2px solid ${performanceTrend.showRateChange > 0 ? '#06b6d4' : '#ec4899'}`, boxShadow: `0 0 12px ${performanceTrend.showRateChange > 0 ? 'rgba(6, 182, 212, 0.1)' : 'rgba(236, 72, 153, 0.1)'}`}}>
            <p style={{margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', fontWeight: '600'}}>Show Rate Trend</p>
            <p style={{margin: '0', fontSize: '24px', fontWeight: '700', color: performanceTrend.showRateChange > 0 ? '#06b6d4' : '#ec4899'}}>
              {performanceTrend.showRateChange > 0 ? '+' : ''}{performanceTrend.showRateChange}%
            </p>
            <p style={{margin: '5px 0 0 0', fontSize: '13px', color: '#666'}}>
              {performanceTrend.sixMonthData.showRate.toFixed(1)}% → {performanceTrend.oneMonthData.showRate.toFixed(1)}%
            </p>
            <p style={{margin: '3px 0 0 0', fontSize: '12px', color: '#999', fontStyle: 'italic'}}>
              {performanceTrend.showRateChange > 0 ? 'More clients showing up' : 'Fewer clients attending appointments'}
            </p>
          </div>

          <div style={{padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: `2px solid ${performanceTrend.leadsVelocityChange > 0 ? '#06b6d4' : '#ec4899'}`, boxShadow: `0 0 12px ${performanceTrend.leadsVelocityChange > 0 ? 'rgba(6, 182, 212, 0.1)' : 'rgba(236, 72, 153, 0.1)'}`}}>
            <p style={{margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', fontWeight: '600'}}>Lead Velocity</p>
            <p style={{margin: '0', fontSize: '24px', fontWeight: '700', color: performanceTrend.leadsVelocityChange > 0 ? '#06b6d4' : '#ec4899'}}>
              {performanceTrend.leadsVelocityChange > 0 ? '+' : ''}{performanceTrend.leadsVelocityChange}%
            </p>
            <p style={{margin: '5px 0 0 0', fontSize: '13px', color: '#666'}}>
              {performanceTrend.leadsPerMonth.toFixed(0)}/month → {performanceTrend.oneMonthData.leads}/month
            </p>
            <p style={{margin: '3px 0 0 0', fontSize: '12px', color: '#999', fontStyle: 'italic'}}>
              {performanceTrend.leadsVelocityChange > 0 ? 'Lead generation accelerating' : 'Lead generation slowing'}
            </p>
          </div>
        </div>

        {/* Daily Pace Comparison */}
        <div style={{padding: '15px', backgroundColor: 'white', borderRadius: '8px', marginBottom: '20px', border: '2px solid #06b6d4', boxShadow: '0 0 12px rgba(6, 182, 212, 0.1)'}}>
          <p style={{margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#06b6d4', fontWeight: '700'}}>📅 Daily Performance Pace</p>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
            <div>
              <p style={{margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: '600'}}>6-Month Average Daily:</p>
              <p style={{margin: '0', fontSize: '14px', color: '#333'}}>{performanceTrend.sixMonthDailyLeads.toFixed(2)} leads/day</p>
              <p style={{margin: '3px 0 0 0', fontSize: '14px', color: '#333'}}>{(performanceTrend.sixMonthData.appointments / 180).toFixed(2)} appointments/day</p>
            </div>
            <div>
              <p style={{margin: '0 0 8px 0', fontSize: '12px', color: '#06b6d4', fontWeight: '700'}}>Current 30-Day Daily:</p>
              <p style={{margin: '0', fontSize: '14px', color: '#06b6d4', fontWeight: '700'}}>{performanceTrend.thirtyDayDailyLeads.toFixed(2)} leads/day</p>
              <p style={{margin: '3px 0 0 0', fontSize: '14px', color: '#06b6d4', fontWeight: '700'}}>{(performanceTrend.oneMonthData.appointments / 30).toFixed(2)} appointments/day</p>
            </div>
          </div>
        </div>

        {/* Detailed Analysis Section */}
        <div style={{padding: '15px', backgroundColor: 'white', borderRadius: '8px', borderLeft: `4px solid ${performanceTrend.trend === 'improving' ? '#06b6d4' : performanceTrend.trend === 'declining' ? '#ec4899' : '#06b6d4'}`, lineHeight: '1.8', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}}>
          <p style={{margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: performanceTrend.trend === 'improving' ? '#06b6d4' : performanceTrend.trend === 'declining' ? '#ec4899' : '#06b6d4', fontWeight: '700'}}>💡 What This Means</p>
          <div 
            style={{fontSize: '14px', color: '#333', lineHeight: '1.7'}}
            dangerouslySetInnerHTML={{__html: performanceTrend.detailedAnalysis}}
          />
        </div>
      </div>

      {/* ========== SEPARATE MONTHLY BEST/WORST SECTION ========== */}
      {/* ⚠️ This data comes from DIFFERENT webhook service */}
      {/* ⚠️ Does NOT affect any data above this section */}
      <div style={{marginTop: '40px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h3 style={{marginTop: '0', marginBottom: '0', fontSize: '18px', color: '#475569'}}>
            📅 Historical Monthly Performance
            <span style={{fontSize: '12px', color: '#94a3b8', fontWeight: 'normal', marginLeft: '10px'}}>
              (Separate data source)
            </span>
          </h3>
          <button
            onClick={loadMonthlyData}
            disabled={loadingMonthly}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loadingMonthly ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              opacity: loadingMonthly ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
            title="Refresh monthly data from webhook"
          >
            {loadingMonthly ? '⏳ Loading...' : '🔄 Refresh Monthly'}
          </button>
        </div>

        {loadingMonthly ? (
          <div style={{textAlign: 'center', padding: '30px', color: '#94a3b8'}}>
            <p>⏳ Loading monthly breakdown...</p>
          </div>
        ) : !bestWorstAnalysis.best && !bestWorstAnalysis.worst ? (
          <div style={{textAlign: 'center', padding: '30px', color: '#94a3b8'}}>
            <p>📊 No monthly data available</p>
          </div>
        ) : (
          <>
            {/* Monthly Trend Chart */}
            {monthlyTrendData.length > 0 && (
              <div style={{marginBottom: '30px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}}>
                <h4 style={{margin: '0 0 15px 0', fontSize: '15px', color: '#475569'}}>
                  📊 Monthly Performance Trend (Last 12 Months)
                </h4>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={monthlyTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      label={{ value: 'Appointments', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#64748b' } }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      label={{ value: 'Show Rate %', angle: 90, position: 'insideRight', style: { fontSize: 12, fill: '#64748b' } }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                      formatter={(value, name) => {
                        if (name === 'Show Rate') return [value + '%', name];
                        return [value, name];
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '15px' }}
                      iconType="rect"
                    />
                    
                    {/* Stacked Bar - One bar per month showing all statuses */}
                    <Bar 
                      yAxisId="left"
                      dataKey="showed" 
                      stackId="a"
                      name="Showed"
                      fill="#10b981"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="confirmed" 
                      stackId="a"
                      name="Confirmed"
                      fill="#06b6d4"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="noshow" 
                      stackId="a"
                      name="No Show"
                      fill="#ef4444"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="cancelled" 
                      stackId="a"
                      name="Cancelled"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />

                    {/* Show Rate Trend Line */}
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="showRate" 
                      stroke="#059669" 
                      strokeWidth={3}
                      name="Show Rate"
                      dot={{ fill: '#059669', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
                <p style={{margin: '10px 0 0 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center'}}>
                  One stacked bar per month: 🟢 Showed + 🔵 Confirmed + 🔴 No Show + 🟠 Cancelled | Line: Show Rate %
                </p>
              </div>
            )}

            {/* Best/Worst Month Cards */}
            <div className="insights-row" style={{gap: '20px', display: 'flex', flexWrap: 'wrap'}}>
              {/* Best Month Card */}
              {bestWorstAnalysis.best && (
                <div className="insight-card" style={{flex: '1', minWidth: '280px', borderLeft: '4px solid #10b981', backgroundColor: 'white'}}>
                  <h4 style={{margin: '0 0 12px 0', fontSize: '16px', color: '#059669'}}>🏆 Best Month</h4>
                  <p style={{margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', fontWeight: '600'}}>
                    {bestWorstAnalysis.best.label}
                  </p>
                  <p style={{margin: '0 0 12px 0', fontSize: '24px', color: '#10b981', fontWeight: '700'}}>
                    {bestWorstAnalysis.best.appointments} Appointments
                  </p>
                  <p style={{margin: '0', fontSize: '13px', color: '#475569'}}>
                    {bestWorstAnalysis.best.showRate}% show rate • Score: {bestWorstAnalysis.best.score}
                  </p>
                </div>
              )}

              {/* Worst Month Card */}
              {bestWorstAnalysis.worst && (
                <div className="insight-card" style={{flex: '1', minWidth: '280px', borderLeft: '4px solid #ef4444', backgroundColor: 'white'}}>
                  <h4 style={{margin: '0 0 12px 0', fontSize: '16px', color: '#dc2626'}}>⚠️ Weakest Month</h4>
                  <p style={{margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', fontWeight: '600'}}>
                    {bestWorstAnalysis.worst.label}
                  </p>
                  <p style={{margin: '0 0 12px 0', fontSize: '24px', color: '#ef4444', fontWeight: '700'}}>
                    {bestWorstAnalysis.worst.appointments} Appointments
                  </p>
                  <p style={{margin: '0', fontSize: '13px', color: '#475569'}}>
                    {bestWorstAnalysis.worst.showRate}% show rate • Score: {bestWorstAnalysis.worst.score}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <p style={{marginTop: '15px', marginBottom: '0', fontSize: '11px', color: '#94a3b8', textAlign: 'center'}}>
          ⚠️ Monthly data fetched from separate webhook service
        </p>
      </div>
      {/* ========== END SEPARATE MONTHLY SECTION ========== */}
    </div>
  );
}
