import React, { useMemo, useState, useEffect } from 'react';
import { Card, StatCard } from '../UI/Card';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid, ComposedChart, PieChart, Pie, Cell,
  Tooltip as RechartsTooltip
} from 'recharts';
import { ChevronDown } from 'lucide-react';
import './Consultant.css';
// ⚠️ SEPARATE MONTHLY WEBHOOK SERVICE - DO NOT TOUCH MAIN DASHBOARD DATA
import { fetchMonthlyPerformance, analyzeBestWorstMonths } from '../../utils/monthlyPerformanceService';

export default function ConsultantDetail({ consultant, allConsultants }) {
  // ========== SEPARATE MONTHLY DATA SERVICE ==========
  // ⚠️ This uses a DIFFERENT webhook for monthly breakdown
  // ⚠️ Does NOT affect main dashboard data or charts
  const [monthlyPerformance, setMonthlyPerformance] = useState(null);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [showInsights, setShowInsights] = useState(false);

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
    <div id="consultant-root" className="analytics-dashboard" style={{ paddingTop: '1rem' }}>
      <h3 style={{
        marginTop: '2.5rem',
        marginBottom: '1.5rem',
        color: '#2c5282',
        fontSize: '1.25rem',
        fontWeight: '700',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid #e2e8f0',
        width: '100%',
        display: 'block',
        clear: 'both'
      }}>
        Detailed Performance Analytics
      </h3>

      {/* ROW 1: Volume (60%) + Efficiency (40%) */}
      <div className="trends-row">
        {/* 1. Leads vs Appointments Trend - 58% width */}
        <Card title="Lead & Appointment Trends" className="chart-card">
            <div className="chart-content">
              <p className="chart-description" style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Volume: lead generation and appointment creation over time.</p>
              <ResponsiveContainer width="100%" height={220}>
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
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => v.toFixed(0)} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
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
              <div style={{marginTop: '12px', padding: '10px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #667eea'}}>
                <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#2c5282'}}>📊 Result:</p>
                <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                  1-year: {chartData[6]?.leads || 0} leads → {chartData[6]?.appointments || 0} appointments ({chartData[6]?.conversion || 0}% conversion). 
                  Trend: {chartData[0]?.leads < chartData[6]?.leads ? 'Growing' : 'Declining'} lead volume.
                </p>
              </div>
            </div>
        </Card>

        {/* 2. Conversion Rate Trend - 42% width */}
        <Card title="Conversion & Show Rate Trends" className="chart-card">
            <div className="chart-content">
              <p className="chart-description" style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Efficiency: conversion and show rate performance.</p>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={conversionTrend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="conversion" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Conv %" />
                  <Line yAxisId="right" type="monotone" dataKey="showRate" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} name="Show %" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend-pdf">
              <h5>Chart Guide</h5>
              <ul>
                <li><span className="color-indicator" style={{background: '#f59e0b'}}></span><strong>Orange:</strong> Conversion %</li>
                <li><span className="color-indicator" style={{background: '#06b6d4'}}></span><strong>Cyan:</strong> Show Rate %</li>
                <li><strong>Target:</strong> Conv 20%+, Show 50%+</li>
              </ul>
              <div style={{marginTop: '12px', padding: '10px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #f59e0b'}}>
                <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#2c5282'}}>Result:</p>
                <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                  Current: {currentPeriod.conversion}% conv, {currentPeriod.showRate}% show. 
                  {currentPeriod.conversion >= 20 && currentPeriod.showRate >= 50 ? '✓ On target' : '⚠ Below target'}
                </p>
              </div>
            </div>
        </Card>
      </div>

      {/* ROW 2: Three equal charts (33% each) */}
      <div className="breakdowns-row">
        {/* 6-Month Performance */}
        <Card title="6-Month Performance" className="chart-card">
          <div className="chart-content">
            <p className="chart-description" style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>180-day avg vs current 30-day.</p>
            <ResponsiveContainer width="100%" height={200}>
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
            <div style={{marginTop: '12px', padding: '10px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #06b6d4'}}>
              <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#2c5282'}}>Result:</p>
              <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                Conversion: {(chartData.find(d => d.period === '180D')?.conversion || 0).toFixed(1)}% (6M) → {currentPeriod.conversion}% (30D) {currentPeriod.conversion > (chartData.find(d => d.period === '180D')?.conversion || 0) ? 'Up' : 'Down'}. 
                Show Rate: {(chartData.find(d => d.period === '180D')?.showRate || 0).toFixed(1)}% → {currentPeriod.showRate}% {currentPeriod.showRate > (chartData.find(d => d.period === '180D')?.showRate || 0) ? 'Up' : 'Down'}.
              </p>
            </div>
          </div>
        </Card>

        {/* Status Breakdown Pie Chart */}
        <Card title="Status Distribution" className="chart-card">
          <div className="chart-content">
            <p className="chart-description" style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Appointment outcomes breakdown.</p>
            <ResponsiveContainer width="100%" height={200}>
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
            <div style={{marginTop: '12px', padding: '10px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #10b981'}}>
              <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#2c5282'}}>📊 Result:</p>
              <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                Of {currentPeriod.appointments} appointments: {currentPeriod.showed} showed ({((currentPeriod.showed/currentPeriod.appointments)*100).toFixed(0)}%), 
                {currentPeriod.noShow} no-shows ({((currentPeriod.noShow/currentPeriod.appointments)*100).toFixed(0)}%). 
                {currentPeriod.noShow > currentPeriod.showed ? '⚠ No-shows exceed shows' : '✓ More shows than no-shows'}.
              </p>
            </div>
          </div>
        </Card>

        {/* Performance vs Team */}
        <Card title="vs Team Average" className="chart-card">
          <div className="chart-content">
            <p className="chart-description" style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Individual vs team metrics.</p>
            <ResponsiveContainer width="100%" height={200}>
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
            <div style={{marginTop: '12px', padding: '10px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #667eea'}}>
              <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#2c5282'}}>📊 Result:</p>
              <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                {currentPeriod.vsTeam > 0 ? `🏆 Outperforming team by ${currentPeriod.vsTeam}%` : currentPeriod.vsTeam < 0 ? `📉 ${Math.abs(currentPeriod.vsTeam)}% below team average` : 'At team average'}. 
                Leads: {currentPeriod.leads} vs team avg {currentPeriod.teamLeads.toFixed(0)}.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ROW 3: Two charts side by side */}
      <div className="two-col-row">
        {/* Status Details Bar Chart */}
        <Card title="Appointment Status Details" className="chart-card">
          <div className="chart-content">
            <p className="chart-description" style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Each outcome category.</p>
            <ResponsiveContainer width="100%" height={200}>
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
              <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#2c5282'}}>📊 Result:</p>
              <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                Highest: {Math.max(currentPeriod.showed, currentPeriod.confirmed, currentPeriod.noShow, currentPeriod.cancelled) === currentPeriod.showed ? 'Showed' : Math.max(currentPeriod.showed, currentPeriod.confirmed, currentPeriod.noShow, currentPeriod.cancelled) === currentPeriod.noShow ? 'No-shows' : Math.max(currentPeriod.showed, currentPeriod.confirmed, currentPeriod.noShow, currentPeriod.cancelled) === currentPeriod.confirmed ? 'Confirmed' : 'Cancelled'} ({Math.max(currentPeriod.showed, currentPeriod.confirmed, currentPeriod.noShow, currentPeriod.cancelled)}). 
                {currentPeriod.confirmed > 0 ? `${currentPeriod.confirmed} pending confirmations to convert.` : 'No pending confirmations.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Period-over-Period Growth */}
        <Card title="Period Growth Rate" className="chart-card">
          <div className="chart-content">
            <p className="chart-description" style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Momentum in lead/appointment generation.</p>
            <ResponsiveContainer width="100%" height={200}>
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
              <p style={{margin: 0, fontSize: '11px', fontWeight: '600', color: '#2c5282'}}>📊 Result:</p>
              <p style={{margin: '4px 0 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.5'}}>
                Recent trend: {growthData[growthData.length-1]?.leadGrowth > 0 ? '📈 Growing' : '📉 Declining'} leads ({growthData[growthData.length-1]?.leadGrowth > 0 ? '+' : ''}{growthData[growthData.length-1]?.leadGrowth}%), 
                {growthData[growthData.length-1]?.apptGrowth > 0 ? '📈 Growing' : '📉 Declining'} appointments ({growthData[growthData.length-1]?.apptGrowth > 0 ? '+' : ''}{growthData[growthData.length-1]?.apptGrowth}%).
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* FULL-WIDTH: Performance Table */}
      <Card title="Complete Period Performance Breakdown" className="chart-card" style={{ marginBottom: '24px' }}>
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="consultant-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: '#2c5282', borderBottom: '2px solid #1e4175' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: 'white', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Period</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'white', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Leads</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'white', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Appts</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'white', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conv %</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'white', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#2d6a4f' }}>Showed</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'white', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>No Show</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'white', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confirmed</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'white', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cancelled</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'white', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Show %</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'white', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>vs Team</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, idx) => (
                <tr key={row.period} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fafcfd' }}>
                  <td style={{ padding: '16px', fontWeight: 700, color: '#1e293b' }}>{row.period}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>{row.leads}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>{row.appointments}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, background: row.conversion > row.teamConversion ? '#f0fdf4' : '#fefce8', color: row.conversion > row.teamConversion ? '#166534' : '#854d0e' }}>
                      {row.conversion}%
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#166534', background: idx % 2 === 0 ? '#f0fdf4' : '#dcfce7' }}>{row.showed}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#9a3412' }}>{row.noShow}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#0369a1' }}>{row.confirmed}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#991b1b' }}>{row.cancelled}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, background: row.showRate > 50 ? '#f0fdf4' : row.showRate > 25 ? '#fefce8' : '#fef2f2', color: row.showRate > 50 ? '#166534' : row.showRate > 25 ? '#854d0e' : '#991b1b' }}>
                      {row.showRate}%
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, background: row.vsTeam > 0 ? '#f0fdf4' : '#fef2f2', color: row.vsTeam > 0 ? '#166534' : '#991b1b' }}>
                      {row.vsTeam > 0 ? '+' : ''}{row.vsTeam}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 6-Month Performance Analysis - Collapsible */}
      <Card className="chart-card wide" style={{marginTop: '30px'}}>
        <div 
          className="insights-header"
          onClick={() => setShowInsights(!showInsights)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: showInsights ? '20px' : '0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#2c5282' }}>
              📊 6-Month Performance Analysis & Insights
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className={`trend-badge ${performanceTrend.conversionChange < 0 ? 'negative' : 'positive'}`}>
                Conversion {performanceTrend.conversionChange > 0 ? '+' : ''}{performanceTrend.conversionChange.toFixed(1)}%
              </span>
              <span className={`trend-badge ${performanceTrend.showRateChange < 0 ? 'negative' : 'positive'}`}>
                Show Rate {performanceTrend.showRateChange > 0 ? '+' : ''}{performanceTrend.showRateChange.toFixed(1)}%
              </span>
              <span className={`trend-badge ${performanceTrend.leadsVelocityChange < 0 ? 'negative' : 'positive'}`}>
                Leads {performanceTrend.leadsVelocityChange > 0 ? '+' : ''}{performanceTrend.leadsVelocityChange.toFixed(1)}%
              </span>
            </div>
          </div>
          <ChevronDown 
            size={20} 
            style={{ 
              transition: 'transform 0.3s ease',
              transform: showInsights ? 'rotate(180deg)' : 'rotate(0deg)',
              color: '#64748b'
            }}
          />
        </div>

        {showInsights && (
          <>
            {/* Mini Trend Chart */}
            <div style={{ marginBottom: '24px', height: '100px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { 
                    name: '6M Avg', 
                    conversion: performanceTrend.sixMonthData.conversion, 
                    showRate: performanceTrend.sixMonthData.showRate, 
                    leads: performanceTrend.leadsPerMonth 
                  },
                  { 
                    name: 'Current', 
                    conversion: performanceTrend.oneMonthData.conversion, 
                    showRate: performanceTrend.oneMonthData.showRate, 
                    leads: performanceTrend.oneMonthData.leads 
                  }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                  <RechartsTooltip 
                    contentStyle={{ 
                      background: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="conversion" 
                    stroke="#ec4899" 
                    strokeWidth={2} 
                    name="Conversion %"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="showRate" 
                    stroke="#f472b6" 
                    strokeWidth={2} 
                    name="Show Rate %"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="#a855f7" 
                    strokeWidth={2} 
                    name="Leads/Month"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}>
              {/* Conversion Rate Trend */}
              <div style={{
                padding: '16px',
                background: performanceTrend.conversionChange < 0 ? '#fef2f2' : '#f0fdf4',
                border: `2px solid ${performanceTrend.conversionChange < 0 ? '#fecaca' : '#bbf7d0'}`,
                borderRadius: '8px'
              }}>
                <p style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  color: '#64748b', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px' 
                }}>
                  CONVERSION RATE TREND
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: performanceTrend.conversionChange < 0 ? '#dc2626' : '#16a34a'
                }}>
                  {performanceTrend.conversionChange > 0 ? '+' : ''}{performanceTrend.conversionChange.toFixed(1)}%
                </p>
                <p style={{ 
                  margin: '4px 0 8px 0', 
                  fontSize: '13px', 
                  color: '#475569' 
                }}>
                  {performanceTrend.sixMonthData.conversion.toFixed(1)}% → {performanceTrend.oneMonthData.conversion.toFixed(1)}%
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '12px', 
                  color: '#64748b', 
                  fontStyle: 'italic' 
                }}>
                  {performanceTrend.conversionChange < 0 ? 'Fewer leads converting to appointments' : 'More leads converting to appointments'}
                </p>
              </div>

              {/* Show Rate Trend */}
              <div style={{
                padding: '16px',
                background: performanceTrend.showRateChange < 0 ? '#fef2f2' : '#f0fdf4',
                border: `2px solid ${performanceTrend.showRateChange < 0 ? '#fecaca' : '#bbf7d0'}`,
                borderRadius: '8px'
              }}>
                <p style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  color: '#64748b', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px' 
                }}>
                  SHOW RATE TREND
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: performanceTrend.showRateChange < 0 ? '#dc2626' : '#16a34a'
                }}>
                  {performanceTrend.showRateChange > 0 ? '+' : ''}{performanceTrend.showRateChange.toFixed(1)}%
                </p>
                <p style={{ 
                  margin: '4px 0 8px 0', 
                  fontSize: '13px', 
                  color: '#475569' 
                }}>
                  {performanceTrend.sixMonthData.showRate.toFixed(1)}% → {performanceTrend.oneMonthData.showRate.toFixed(1)}%
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '12px', 
                  color: '#64748b', 
                  fontStyle: 'italic' 
                }}>
                  {performanceTrend.showRateChange < 0 ? 'Fewer clients attending appointments' : 'More clients attending appointments'}
                </p>
              </div>

              {/* Lead Velocity */}
              <div style={{
                padding: '16px',
                background: performanceTrend.leadsVelocityChange < 0 ? '#fef2f2' : '#f0fdf4',
                border: `2px solid ${performanceTrend.leadsVelocityChange < 0 ? '#fecaca' : '#bbf7d0'}`,
                borderRadius: '8px'
              }}>
                <p style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  color: '#64748b', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px' 
                }}>
                  LEAD VELOCITY
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: performanceTrend.leadsVelocityChange < 0 ? '#dc2626' : '#16a34a'
                }}>
                  {performanceTrend.leadsVelocityChange > 0 ? '+' : ''}{performanceTrend.leadsVelocityChange.toFixed(1)}%
                </p>
                <p style={{ 
                  margin: '4px 0 8px 0', 
                  fontSize: '13px', 
                  color: '#475569' 
                }}>
                  {performanceTrend.leadsPerMonth.toFixed(0)}/month → {performanceTrend.oneMonthData.leads}/month
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '12px', 
                  color: '#64748b', 
                  fontStyle: 'italic' 
                }}>
                  {performanceTrend.leadsVelocityChange < 0 ? 'Lead generation slowing' : 'Lead generation accelerating'}
                </p>
              </div>
            </div>

            {/* Daily Performance Pace */}
            <div style={{
              padding: '16px',
              background: '#ecfeff',
              border: '2px solid #67e8f9',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <p style={{ 
                margin: '0 0 12px 0', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#0e7490',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                ⚡ DAILY PERFORMANCE PACE
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#0e7490', fontWeight: '600' }}>
                    6-Month Average Daily:
                  </p>
                  <p style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#0f172a' }}>
                    {performanceTrend.sixMonthDailyLeads.toFixed(2)} leads/day
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#0f172a' }}>
                    {(performanceTrend.sixMonthData.appointments / 180).toFixed(2)} appointments/day
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#0e7490', fontWeight: '600' }}>
                    Current 30-Day Daily:
                  </p>
                  <p style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>
                    {performanceTrend.thirtyDayDailyLeads.toFixed(2)} leads/day
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>
                    {(performanceTrend.oneMonthData.appointments / 30).toFixed(2)} appointments/day
                  </p>
                </div>
              </div>
            </div>

            {/* Interpretation Section */}
            <div style={{
              padding: '16px',
              background: '#fefce8',
              border: '3px solid #fde047',
              borderLeft: '6px solid #eab308',
              borderRadius: '8px'
            }}>
              <p style={{ 
                margin: '0 0 8px 0', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#713f12',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                💡 WHAT THIS MEANS
              </p>
              <div 
                style={{fontSize: '13px', color: '#422006', lineHeight: '1.6'}}
                dangerouslySetInnerHTML={{__html: performanceTrend.detailedAnalysis}}
              />
            </div>
          </>
        )}
      </Card>

      {/* ========== SEPARATE MONTHLY BEST/WORST SECTION ========== */}
      {/* ⚠️ This data comes from DIFFERENT webhook service */}
      {/* ⚠️ Does NOT affect any data above this section */}
      <Card title="Historical Monthly Performance" className="chart-card wide" style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            Source: Separate data source (Monthly Webhook)
          </p>
          <button
            onClick={loadMonthlyData}
            disabled={loadingMonthly}
            className="period-btn active"
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
            title="Refresh monthly data from webhook"
          >
            {loadingMonthly ? '⏳ Loading...' : '🔄 Refresh Monthly'}
          </button>
        </div>

        {loadingMonthly ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
            <p>⏳ Loading monthly breakdown...</p>
          </div>
        ) : !bestWorstAnalysis.best && !bestWorstAnalysis.worst ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
            <p>📊 No monthly data available</p>
          </div>
        ) : (
          <div className="analytics-grid" style={{ marginBottom: 0 }}>
            {/* Monthly Trend Chart */}
            {monthlyTrendData.length > 0 && (
              <Card title="Monthly Performance Trend (Last 12 Months)" className="chart-card wide">
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={monthlyTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e3e6f0" />
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
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value, name) => {
                          if (name === 'Show Rate') return [value + '%', name];
                          return [value, name];
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '15px' }} iconType="rect" />
                      
                      {/* Stacked Bar */}
                      <Bar yAxisId="left" dataKey="showed" stackId="a" name="Showed" fill="#10b981" />
                      <Bar yAxisId="left" dataKey="confirmed" stackId="a" name="Confirmed" fill="#06b6d4" />
                      <Bar yAxisId="left" dataKey="noshow" stackId="a" name="No Show" fill="#ef4444" />
                      <Bar yAxisId="left" dataKey="cancelled" stackId="a" name="Cancelled" fill="#f59e0b" radius={[4, 4, 0, 0]} />

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
                </div>
              </Card>
            )}

            {/* Best/Worst Month Cards */}
            <div className="analytics-grid" style={{ gridColumn: 'span 4', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Best Month Card */}
              {bestWorstAnalysis.best && (
                <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', borderLeft: '4px solid #10b981', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🏆</span> Best Month
                  </h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', fontWeight: '600' }}>
                    {bestWorstAnalysis.best.label}
                  </p>
                  <p style={{ margin: '0 0 12px 0', fontSize: '24px', color: '#10b981', fontWeight: '700' }}>
                    {bestWorstAnalysis.best.appointments} Appointments
                  </p>
                  <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '12px' }}>
                    <span style={{ fontWeight: 500 }}>{bestWorstAnalysis.best.showRate}% show rate</span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span>Score: {bestWorstAnalysis.best.score}</span>
                  </div>
                </div>
              )}

              {/* Worst Month Card */}
              {bestWorstAnalysis.worst && (
                <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', borderLeft: '4px solid #ef4444', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚠️</span> Weakest Month
                  </h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', fontWeight: '600' }}>
                    {bestWorstAnalysis.worst.label}
                  </p>
                  <p style={{ margin: '0 0 12px 0', fontSize: '24px', color: '#ef4444', fontWeight: '700' }}>
                    {bestWorstAnalysis.worst.appointments} Appointments
                  </p>
                  <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '12px' }}>
                    <span style={{ fontWeight: 500 }}>{bestWorstAnalysis.worst.showRate}% show rate</span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span>Score: {bestWorstAnalysis.worst.score}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
      {/* ========== END SEPARATE MONTHLY SECTION ========== */}
    </div>
  );
}
