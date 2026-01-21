import React, { useMemo } from 'react';
import { DollarSign, Trophy, TrendingUp, Users, Target, Activity } from 'lucide-react';
import { Card, StatCard } from '../UI/Card';
import '../../NewAnalytics.css';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { CHART_PALETTE } from '../../utils/chartColors';

function YearlyView({ data, accountName }) {
  console.log('[YearlyView] Rendering with:', { accountName, dataLength: data?.length });

  // Filter for monthly campaign data
  const monthlyData = useMemo(() => {
    return data ? data.filter(row => row._aggregation_type === 'monthly_campaign') : [];
  }, [data]);

  // Get yearly campaign aggregations
  const yearlyData = useMemo(() => {
    return data ? data.filter(row => row._aggregation_type === 'yearly_campaign') : [];
  }, [data]);

  // Calculate yearly KPIs from monthly data
  const yearlyKPIs = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return null;

    const totalSpend = monthlyData.reduce((sum, row) => sum + (row.totalspend || 0), 0);
    const totalLeads = monthlyData.reduce((sum, row) => sum + (row.totalleads || 0), 0);
    const totalImpressions = monthlyData.reduce((sum, row) => sum + (row.impressions || 0), 0);
    const totalReach = monthlyData.reduce((sum, row) => sum + (row.Reach || 0), 0);
    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const avgCTR = totalImpressions > 0 
      ? (monthlyData.reduce((sum, row) => sum + (row.ctr || 0), 0) / monthlyData.length) * 100 
      : 0;
    const avgEngagementRate = monthlyData.length > 0
      ? (monthlyData.reduce((sum, row) => sum + (row.engagement_rate || 0), 0) / monthlyData.length) * 100
      : 0;

    return {
      totalSpend: totalSpend.toFixed(2),
      totalLeads,
      totalImpressions,
      totalReach,
      avgCPL: avgCPL.toFixed(2),
      avgCTR: avgCTR.toFixed(2),
      avgEngagementRate: avgEngagementRate.toFixed(2),
      monthCount: monthlyData.length,
      campaignCount: yearlyData.length,
    };
  }, [monthlyData, yearlyData]);

  // Prepare campaign performance across months
  const campaignTrendData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return {};

    const grouped = {};
    monthlyData.forEach(row => {
      if (!grouped[row.campaignname]) {
        grouped[row.campaignname] = [];
      }
      grouped[row.campaignname].push({
        month: `${row.month_name.slice(0, 3)} '${String(row.year).slice(-2)}`,
        monthIndex: row.month_index,
        year: row.year,
        spend: parseFloat(row.totalspend) || 0,
        leads: row.totalleads || 0,
        cpl: parseFloat(row.costperlead) || 0,
        impressions: row.impressions || 0,
        reach: row.Reach || 0,
        ctr: parseFloat(row.ctr * 100) || 0,
        cpm: parseFloat(row.cpm) || 0,
        engagement: parseFloat(row.engagement_rate * 100) || 0,
      });
    });

    // Sort each campaign's data by month
    Object.keys(grouped).forEach(campaign => {
      grouped[campaign].sort((a, b) => a.monthIndex - b.monthIndex);
    });

    return grouped;
  }, [monthlyData]);

  // Prepare monthly aggregated data for timeline view
  const monthlyAggregated = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return [];

    const grouped = {};
    monthlyData.forEach(row => {
      const key = `${row.year}-${row.month_index}`;
      const monthLabel = `${row.month_name.slice(0, 3)} '${String(row.year).slice(-2)}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          month: monthLabel,
          monthIndex: row.month_index,
          spend: 0,
          leads: 0,
          impressions: 0,
          reach: 0,
        };
      }

      grouped[key].spend += parseFloat(row.totalspend) || 0;
      grouped[key].leads += row.totalleads || 0;
      grouped[key].impressions += row.impressions || 0;
      grouped[key].reach += row.Reach || 0;
    });

    return Object.values(grouped).sort((a, b) => a.monthIndex - b.monthIndex);
  }, [monthlyData]);

  const campaigns = Object.keys(campaignTrendData);

  if (!data || data.length === 0) {
    return (
      <div className="yearly-view">
        <p className="muted">No yearly data available for {accountName}</p>
      </div>
    );
  }

  if (!yearlyKPIs) {
    return <div className="muted">No data to display</div>;
  }

  return (
    <div className="analytics-dashboard">
      <div className="consultant-header" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.5rem', color: '#1e293b' }}>Yearly Performance - {accountName}</h3>
        <p className="muted" style={{ fontSize: '0.9rem', color: '#64748b' }}>Full year overview with campaign trends and comparisons</p>
      </div>

      {/* Yearly KPI Cards */}
      <div className="analytics-grid">
        <StatCard label="Total Spend (Year)" value={`$${yearlyKPIs.totalSpend}`} icon={DollarSign} trend={0} trendLabel="invested" />
        <StatCard label="Total Leads (Year)" value={yearlyKPIs.totalLeads} icon={Trophy} trend={0} trendLabel="generated" />
        <StatCard label="Avg CPL" value={`$${yearlyKPIs.avgCPL}`} icon={TrendingUp} trend={0} trendLabel="average" />
        <StatCard label="Total Impressions" value={yearlyKPIs.totalImpressions.toLocaleString()} icon={Target} trend={0} trendLabel="views" />
        <StatCard label="Total Reach" value={yearlyKPIs.totalReach.toLocaleString()} icon={Users} trend={0} trendLabel="unique" />
        <StatCard label="Active Campaigns" value={yearlyKPIs.campaignCount} icon={Activity} trend={0} trendLabel="running" />
      </div>

      {/* Monthly Timeline Charts */}
      <div className="analytics-grid" style={{ marginBottom: 0 }}>
        <Card title="Monthly Spend & Leads Timeline" className="chart-card">
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyAggregated}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e6f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#667eea" name="Spend ($)" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="leads" stroke="#f093fb" name="Leads" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Monthly Impressions & Reach" className="chart-card">
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyAggregated}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e6f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="impressions" fill="#667eea" name="Impressions" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reach" fill="#764ba2" name="Reach" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Campaign Spend Distribution - Full Width */}
      {yearlyData.length > 0 && (
        <Card title="Campaign Spend Distribution" className="chart-card wide" style={{ marginTop: '20px' }}>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={500}>
              <PieChart>
                <Pie
                  data={yearlyData.map(row => ({
                    name: row.campaignname,
                    value: parseFloat(row.totalspend),
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} ($${value.toFixed(0)})`}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {yearlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Campaign Leads Distribution */}
      {yearlyData.length > 0 && (
        <Card title="Campaign Leads Distribution" className="chart-card wide" style={{ marginTop: '20px' }}>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="campaignname" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalleads" fill="#764ba2" name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Campaign Trend Comparison */}
      {campaigns.length > 0 && (() => {
        // Separate campaigns into two groups
        const multiMonthCampaigns = [];
        const singleMonthCampaigns = [];

        campaigns.forEach((campaign) => {
          const campaignData = campaignTrendData[campaign];
          const hasMultipleMonths = campaignData && campaignData.length > 1;
          
          if (hasMultipleMonths) {
            multiMonthCampaigns.push(campaign);
          } else {
            singleMonthCampaigns.push(campaign);
          }
        });

        return (
          <>
            {/* Multi-Month Campaigns with Trend Charts */}
            {multiMonthCampaigns.length > 0 && (
              <>
                <div className="section-header" style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '1.2rem', color: '#1e293b' }}>Campaign Performance Trends (Multiple Months)</h4>
                </div>

                {multiMonthCampaigns.map((campaign, idx) => {
                  const campaignData = campaignTrendData[campaign];
                  return (
                    <div key={campaign} style={{ marginBottom: '2rem' }}>
                      <h5 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#334155', paddingLeft: '0.5rem' }}>{campaign}</h5>
                      <div className="analytics-grid" style={{ marginBottom: 0 }}>
                        <Card title="Spend & Leads Trend" className="chart-card">
                          <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={250}>
                              <LineChart data={campaignData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e3e6f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="spend" stroke={CHART_PALETTE[idx % CHART_PALETTE.length]} name="Spend ($)" strokeWidth={2} dot={{ r: 3 }} />
                                <Line yAxisId="right" type="monotone" dataKey="leads" stroke={CHART_PALETTE[(idx + 1) % CHART_PALETTE.length]} name="Leads" strokeWidth={2} dot={{ r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </Card>

                        <Card title="CPL Trend" className="chart-card">
                          <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={250}>
                              <LineChart data={campaignData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e3e6f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                                <Line type="monotone" dataKey="cpl" stroke={CHART_PALETTE[(idx + 2) % CHART_PALETTE.length]} name="CPL ($)" strokeWidth={2} dot={{ r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </Card>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Single-Month Campaigns at Bottom */}
            {singleMonthCampaigns.length > 0 && (
              <>
                <div className="section-header single-month-header">
                  <h4>Campaigns with Single Month Data</h4>
                  <p className="section-subtitle">These campaigns need at least 2 months of data to show trends</p>
                </div>

                <div className="single-month-campaigns-grid">
                  {singleMonthCampaigns.map((campaign) => {
                    const campaignData = campaignTrendData[campaign];
                    return (
                      <div key={campaign} className="single-month-campaign-card">
                        <h5>{campaign}</h5>
                        {campaignData && campaignData.length === 1 && (
                          <div className="single-month-metrics">
                            <div className="metric-item">
                              <span className="metric-label">Month:</span>
                              <span className="metric-value">{campaignData[0].month}</span>
                            </div>
                            <div className="metric-item">
                              <span className="metric-label">Spend:</span>
                              <span className="metric-value">${campaignData[0].spend?.toFixed(2)}</span>
                            </div>
                            <div className="metric-item">
                              <span className="metric-label">Leads:</span>
                              <span className="metric-value">{campaignData[0].leads}</span>
                            </div>
                            <div className="metric-item">
                              <span className="metric-label">CPL:</span>
                              <span className="metric-value">${campaignData[0].cpl?.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        );
      })()}

      {/* Monthly Breakdown Table - Single Source of Truth */}
      <Card title="Campaign Performance by Month" className="chart-card wide" style={{ marginTop: '20px' }}>
        <div className="table-scroll">
          <table className="meta-ads-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Month</th>
                <th>Spend</th>
                <th>Leads</th>
                <th>CPL</th>
                <th>Impressions</th>
                <th>Reach</th>
                <th>CTR (%)</th>
                <th>CPM</th>
                <th>Engagement (%)</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 500 }}>{row.campaignname}</td>
                  <td>{row.month_name} {row.year}</td>
                  <td>${parseFloat(row.totalspend).toFixed(2)}</td>
                  <td>{row.totalleads}</td>
                  <td>${parseFloat(row.costperlead).toFixed(2)}</td>
                  <td>{row.impressions.toLocaleString()}</td>
                  <td>{row.Reach.toLocaleString()}</td>
                  <td>{(row.ctr * 100).toFixed(2)}</td>
                  <td>${parseFloat(row.cpm).toFixed(2)}</td>
                  <td>{(row.engagement_rate * 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default YearlyView;
