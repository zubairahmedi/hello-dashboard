import React, { useMemo } from 'react';
import { DollarSign, Users, Target, Eye, Activity, Percent } from 'lucide-react';
import { Card, StatCard } from '../UI/Card';
import '../../NewAnalytics.css';
import './MetaAdsAccountView.css';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { CHART_PALETTE } from '../../utils/chartColors';

function MetaAdsAccountView({ data, accountName }) {
  console.log('[MetaAdsAccountView] Rendering with props:', { accountName, dataLength: data?.length, data });
  
  // Separate monthly and campaign data
  const monthlyRows = useMemo(
    () => {
      const filtered = data ? data.filter(row => row._aggregation_type === 'monthly_campaign') : [];
      console.log('[MetaAdsAccountView] monthlyRows computed:', { count: filtered.length, rows: filtered });
      return filtered;
    },
    [data]
  );

  const campaignRows = useMemo(
    () => (data ? data.filter(row => row._aggregation_type === 'yearly_campaign') : []),
    [data]
  );

  // Calculate aggregate KPIs from monthly data
  const kpis = useMemo(() => {
    console.log('[MetaAdsAccountView] Computing KPIs for monthlyRows:', monthlyRows);
    if (!monthlyRows || monthlyRows.length === 0) {
      console.log('[MetaAdsAccountView] No monthly rows, returning null KPIs');
      return null;
    }

    const totalSpend = monthlyRows.reduce((sum, row) => sum + (row.totalspend || 0), 0);
    const totalLeads = monthlyRows.reduce((sum, row) => sum + (row.totalleads || 0), 0);
    const totalImpressions = monthlyRows.reduce((sum, row) => sum + (row.impressions || 0), 0);
    const totalReach = monthlyRows.reduce((sum, row) => sum + (row.Reach || 0), 0);
    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const avgCTR = totalImpressions > 0 ? (monthlyRows.reduce((sum, row) => sum + (row.link_click || 0), 0) / totalImpressions) : 0;
    const avgEngagementRate = monthlyRows.reduce((sum, row) => sum + (row.engagement_rate || 0), 0) / monthlyRows.length;

    return {
      totalSpend: totalSpend.toFixed(2),
      totalLeads,
      totalImpressions,
      totalReach,
      avgCPL: avgCPL.toFixed(2),
      avgCTR: (avgCTR * 100).toFixed(2),
      avgEngagementRate: (avgEngagementRate * 100).toFixed(2),
      monthCount: monthlyRows.length,
    };
  }, [monthlyRows]);

  // Prepare chart data
  const trendData = useMemo(() => {
    if (!monthlyRows || monthlyRows.length === 0) {
      console.log('[MetaAdsAccountView] No monthly rows for charts');
      return [];
    }
    const chartData = monthlyRows
      .sort((a, b) => a.month_index - b.month_index)
      .map(row => ({
        month: `${row.month_name.slice(0, 3)} '${String(row.year).slice(-2)}`,
        spend: parseFloat(row.totalspend) || 0,
        leads: row.totalleads || 0,
        impressions: row.impressions || 0,
        reach: row.Reach || 0,
        cpl: parseFloat(row.costperlead) || 0,
        ctr: parseFloat(row.ctr * 100) || 0,
        cpm: parseFloat(row.cpm) || 0,
        engagement: parseFloat(row.engagement_rate * 100) || 0,
      }));
    console.log('[MetaAdsAccountView] trendData for charts:', { count: chartData.length, chartData });
    return chartData;
  }, [monthlyRows]);

  const campaignData = useMemo(() => {
    if (!campaignRows || campaignRows.length === 0) return [];
    const total = campaignRows.reduce((sum, r) => sum + r.totalspend, 0);
    return campaignRows.map(row => ({
      name: row.campaignname || 'Unknown',
      spend: parseFloat(row.totalspend),
      leads: row.totalleads,
      share: total > 0 ? parseFloat(((row.totalspend / total) * 100).toFixed(1)) : 0,
    }));
  }, [campaignRows]);

  // Early return after all hooks are declared
  if (!data || data.length === 0) {
    return (
      <div className="meta-ads-account-view">
        <p className="muted">No data available for {accountName}</p>
      </div>
    );
  }

  if (!kpis) {
    return <div className="muted">No monthly data to display</div>;
  }

  return (
    <div className="analytics-dashboard">
      {/* KPI Cards */}
      <div className="analytics-grid kpi-row">
        <StatCard label="Total Spend" value={`$${kpis.totalSpend}`} icon={DollarSign} trend={0} trendLabel="total" />
        <StatCard label="Total Leads" value={kpis.totalLeads} icon={Users} trend={0} trendLabel="total" />
        <StatCard label="Avg CPL" value={`$${kpis.avgCPL}`} icon={Target} trend={0} trendLabel="avg" />
        <StatCard label="Impressions" value={kpis.totalImpressions.toLocaleString()} icon={Eye} trend={0} trendLabel="total" />
        <StatCard label="Reach" value={kpis.totalReach.toLocaleString()} icon={Activity} trend={0} trendLabel="unique" />
        <StatCard label="Avg Engagement" value={`${kpis.avgEngagementRate}%`} icon={Percent} trend={0} trendLabel="rate" />
      </div>

      {/* Comprehensive Data Table */}
      <Card title="All Performance Data" className="chart-card wide">
        <div className="table-scroll">
          <table className="meta-ads-details-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Year</th>
                <th>Campaign</th>
                <th>Status</th>
                <th>Objective</th>
                <th>Spend</th>
                <th>Leads</th>
                <th>CPL</th>
                <th>Impressions</th>
                <th>Reach</th>
                <th>Link Clicks</th>
                <th>Page Engagement</th>
                <th>Post Engagement</th>
                <th>Post Interaction</th>
                <th>Posts</th>
                <th>Reactions</th>
                <th>Likes</th>
                <th>CTR (%)</th>
                <th>CPC</th>
                <th>CPM</th>
                <th>Engagement Rate (%)</th>
                <th>Complete Registration</th>
                <th>Search Leads</th>
                <th>Content View Leads</th>
                <th>Submit Application</th>
                <th>CPA Complete Reg</th>
                <th>CPA Search</th>
                <th>CPA Content View</th>
                <th>CPA Link Click</th>
                <th>CPA Post Engagement</th>
                <th>Post Net Like</th>
                <th>Post Save</th>
                <th>Post Net Save</th>
                <th>Lead Grouped</th>
                <th>Total Leads</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.month_name}</td>
                  <td>{row.year}</td>
                  <td>{row.campaignname}</td>
                  <td>{row.campaignstatus}</td>
                  <td>{row.campaignobjective}</td>
                  <td>${parseFloat(row.totalspend).toFixed(2)}</td>
                  <td>{row.totalleads}</td>
                  <td>${parseFloat(row.costperlead).toFixed(2)}</td>
                  <td>{row.impressions.toLocaleString()}</td>
                  <td>{row.Reach.toLocaleString()}</td>
                  <td>{row.link_click}</td>
                  <td>{row.page_engagement}</td>
                  <td>{row.post_engagement}</td>
                  <td>{row.post_interaction_gross}</td>
                  <td>{row.post}</td>
                  <td>{row.post_reaction}</td>
                  <td>{row.like}</td>
                  <td>{(row.ctr * 100).toFixed(2)}</td>
                  <td>${parseFloat(row.cpc).toFixed(2)}</td>
                  <td>${parseFloat(row.cpm).toFixed(2)}</td>
                  <td>{(row.engagement_rate * 100).toFixed(2)}</td>
                  <td>{row.offsite_complete_registration_add_meta_leads}</td>
                  <td>{row.offsite_search_add_meta_leads}</td>
                  <td>{row.offsite_content_view_add_meta_leads}</td>
                  <td>{row.offsite_submit_application_add_meta_leads}</td>
                  <td>${parseFloat(row.cpa_offsite_complete_registration_add_meta_leads).toFixed(2)}</td>
                  <td>${parseFloat(row.cpa_offsite_search_add_meta_leads).toFixed(2)}</td>
                  <td>${parseFloat(row.cpa_offsite_complete_registration_add_meta_leads).toFixed(2)}</td>
                  <td>${parseFloat(row.cpa_link_click).toFixed(2)}</td>
                  <td>${parseFloat(row.cpa_post_engagement).toFixed(2)}</td>
                  <td>{row['onsite_conversion.post_net_like']}</td>
                  <td>{row['onsite_conversion.post_save']}</td>
                  <td>{row['onsite_conversion.post_net_save']}</td>
                  <td>{row['onsite_conversion.lead_grouped']}</td>
                  <td>{row.lead}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default MetaAdsAccountView;
