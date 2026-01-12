import React from 'react';
import { Card } from '../UI/Card';
import '../../NewAnalytics.css';
import './MetaAdsAccountView.css';
// Charts removed per request. Overview now shows table only.

function toNumber(val, fallback = 0) {
  const n = typeof val === 'string' ? parseFloat(val) : Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function formatMoney(n) {
  return `$${toNumber(n).toFixed(2)}`;
}

function round2(n) {
  const x = toNumber(n);
  return Math.round(x * 100) / 100;
}

// Group by campaign across all accounts
// Aggregation helpers removed with charts.

function OverviewView({ data }) {
  const rows = Array.isArray(data) ? data : [];
  // Build year options from data
  const yearOptions = React.useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const y = toNumber(r?.year, null);
      if (Number.isFinite(y)) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const [selectedYear, setSelectedYear] = React.useState(null);
  React.useEffect(() => {
    if (selectedYear == null && yearOptions.length > 0) {
      setSelectedYear(yearOptions[0]);
    }
  }, [yearOptions, selectedYear]);
  const monthlyBreakdown = React.useMemo(() => {
    // Helpers for month normalization
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const nameToIndex = (name) => {
      if (!name) return null;
      const i = MONTHS.findIndex((m) => m.toLowerCase() === String(name).toLowerCase());
      return i >= 0 ? i : null;
    };
    const monthKeyForRow = (row) => {
      // Prefer explicit month index and year
      const year = toNumber(row?.year, null);
      let mi = toNumber(row?.month_index, null);
      if (!Number.isFinite(mi)) {
        const fromName = nameToIndex(row?.month_name || row?.month_label);
        if (fromName != null) mi = fromName;
      }
      if (year != null && mi != null) return `${year}-${String(mi + 1).padStart(2,'0')}`;
      // Fallback: if no month, treat as invalid for monthly breakdown
      return null;
    };
    const monthLabelFromKey = (key) => {
      const [y, m] = (key || '').split('-');
      const idx = toNumber(m, 0) - 1;
      return `${MONTHS[idx] || ''} ${y || ''}`.trim();
    };

    // Aggregate by campaign + monthKey, summing values across accounts
    const agg = new Map();
    rows.forEach((row) => {
      // Exclude yearly-only rows or anything without a valid month
      const monthKey = monthKeyForRow(row);
      if (!monthKey) return;
      const campaign = row?.campaignname || 'Unknown Campaign';
      const key = `${campaign}::${monthKey}`;

      const spend = toNumber(row?.spend ?? row?.totalspend);
      const leads = toNumber(row?.leads ?? row?.totalleads);
      const impressions = toNumber(row?.impressions);
      const reach = toNumber(row?.Reach ?? row?.reach);
      const ctr = toNumber(row?.ctr); // fraction
      const cpm = toNumber(row?.cpm);
      const engagement = toNumber(row?.engagement_rate);

      const cur = agg.get(key) || {
        campaignname: campaign,
        monthKey,
        spend: 0,
        leads: 0,
        impressions: 0,
        reach: 0,
        ctrSum: 0,
        cpmSum: 0,
        engagementSum: 0,
        count: 0,
      };

      cur.spend += spend;
      cur.leads += leads;
      cur.impressions += impressions;
      cur.reach += reach;
      cur.ctrSum += ctr;
      cur.cpmSum += cpm;
      cur.engagementSum += engagement;
      cur.count += 1;

      agg.set(key, cur);
    });

    const list = Array.from(agg.values()).map((r) => ({
      campaignname: r.campaignname,
      month: monthLabelFromKey(r.monthKey),
      spend: r.spend,
      leads: r.leads,
      cpl: r.leads > 0 ? r.spend / r.leads : 0,
      impressions: r.impressions,
      reach: r.reach,
      ctr: r.count > 0 ? r.ctrSum / r.count : 0,
      cpm: r.count > 0 ? r.cpmSum / r.count : 0,
      engagement: r.count > 0 ? r.engagementSum / r.count : 0,
      sortKey: r.monthKey,
    }));

    return list.sort((a, b) => {
      if (a.campaignname !== b.campaignname) return a.campaignname.localeCompare(b.campaignname);
      // Sort by month descending
      return (b.sortKey || '').localeCompare(a.sortKey || '');
    });
  }, [rows]);

  // Yearly per-account aggregation for selected year
  const yearlyAccountRows = React.useMemo(() => {
    if (!Number.isFinite(selectedYear)) return [];
    // Compute strictly from monthly rows to avoid aggregated row discrepancies
    const monthlyRows = rows.filter((r) => r?._aggregation_type === 'monthly_campaign' && toNumber(r?.year, null) === selectedYear);
    const byAccount = new Map();

    monthlyRows.forEach((r) => {
      const account = r?.accountname || 'Unknown Account';
      const cur = byAccount.get(account) || {
        accountname: account,
        year: selectedYear,
        totalspend: 0,
        totalleads: 0,
        impressions: 0,
        reach: 0,
        ctrWeighted: 0, // sum(ctr * impressions)
        engagementWeighted: 0, // sum(engagement * impressions)
      };

      const spend = toNumber(r?.totalspend ?? r?.spend);
      const leads = toNumber(r?.totalleads ?? r?.leads);
      const impressions = toNumber(r?.impressions);
      const reach = toNumber(r?.Reach ?? r?.reach);
      const ctr = toNumber(r?.ctr);
      const engagement = toNumber(r?.engagement_rate);

      cur.totalspend += spend;
      cur.totalleads += leads;
      cur.impressions += impressions;
      cur.reach += reach;
      cur.ctrWeighted += ctr * impressions;
      cur.engagementWeighted += engagement * impressions;

      byAccount.set(account, cur);
    });

    const list = Array.from(byAccount.values()).map((r) => {
      const avgCpl = r.totalleads > 0 ? r.totalspend / r.totalleads : 0;
      const avgCtr = r.impressions > 0 ? r.ctrWeighted / r.impressions : 0;
      const avgEngagement = r.impressions > 0 ? r.engagementWeighted / r.impressions : 0;
      const avgCpm = r.impressions > 0 ? (r.totalspend * 1000) / r.impressions : 0;
      return {
        accountname: r.accountname,
        year: r.year,
        totalspend: r.totalspend,
        totalleads: r.totalleads,
        impressions: r.impressions,
        reach: r.reach,
        avgCpl,
        avgCtr,
        avgCpm,
        avgEngagement,
      };
    });

    return list.sort((a, b) => a.accountname.localeCompare(b.accountname));
  }, [rows, selectedYear]);

  const yearlyTotals = React.useMemo(() => {
    if (!Number.isFinite(selectedYear)) return null;
    // Sum from computed per-account list to mirror table exactly
    const rowsAcc = yearlyAccountRows;
    // Sum the rounded per-account spend to match displayed values exactly
    const spend = rowsAcc.reduce((s, r) => s + round2(r.totalspend), 0);
    const leads = rowsAcc.reduce((s, r) => s + toNumber(r.totalleads), 0);
    const impressions = rowsAcc.reduce((s, r) => s + toNumber(r.impressions), 0);
    const reach = rowsAcc.reduce((s, r) => s + toNumber(r.reach), 0);
    const avgCpl = leads > 0 ? spend / leads : 0;
    // Weighted averages: weight by impressions so totals reflect overall performance
    const avgCtr = impressions > 0
      ? rowsAcc.reduce((s, r) => s + (toNumber(r.avgCtr) * toNumber(r.impressions)), 0) / impressions
      : 0;
    const avgEngagement = impressions > 0
      ? rowsAcc.reduce((s, r) => s + (toNumber(r.avgEngagement) * toNumber(r.impressions)), 0) / impressions
      : 0;
    // CPM derived from totals: spend per 1000 impressions
    const avgCpm = impressions > 0 ? (spend * 1000) / impressions : 0;
    return { spend, leads, impressions, reach, avgCpl, avgCtr, avgCpm, avgEngagement };
  }, [yearlyAccountRows, selectedYear]);

  return (
    <div className="analytics-dashboard">
      {/* Yearly Account Summary */}
      <Card className="chart-card wide" title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>Yearly Account Summary</span>
          <div style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>
            <label htmlFor="overview-year-select" style={{ marginRight: 8, color: '#64748b' }}>Year:</label>
            <select 
              id="overview-year-select" 
              value={selectedYear || ''} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      }>
        <div className="table-scroll">
          <table className="meta-ads-details-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Total Spend</th>
                <th>Total Leads</th>
                <th>Avg CPL</th>
                <th>Total Impressions</th>
                <th>Total Reach</th>
                <th>Avg CTR (%)</th>
                <th>Avg CPM</th>
                <th>Avg Engagement (%)</th>
              </tr>
            </thead>
            <tbody>
              {yearlyAccountRows.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.accountname}</td>
                  <td>{formatMoney(r.totalspend)}</td>
                  <td>{r.totalleads}</td>
                  <td>{formatMoney(r.avgCpl)}</td>
                  <td>{r.impressions.toLocaleString()}</td>
                  <td>{r.reach.toLocaleString()}</td>
                  <td>{(r.avgCtr * 100).toFixed(2)}</td>
                  <td>{formatMoney(r.avgCpm)}</td>
                  <td>{(r.avgEngagement * 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            {yearlyTotals && (
              <tfoot>
                <tr>
                  <th>Total</th>
                  <th>{formatMoney(yearlyTotals.spend)}</th>
                  <th>{yearlyTotals.leads}</th>
                  <th>{formatMoney(yearlyTotals.avgCpl)}</th>
                  <th>{yearlyTotals.impressions.toLocaleString()}</th>
                  <th>{yearlyTotals.reach.toLocaleString()}</th>
                  <th>{(yearlyTotals.avgCtr * 100).toFixed(2)}</th>
                  <th>{formatMoney(yearlyTotals.avgCpm)}</th>
                  <th>{(yearlyTotals.avgEngagement * 100).toFixed(2)}</th>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
      {/* Monthly Breakdown Table */}
      <Card title="Campaign Performance by Month (All Accounts)" className="chart-card wide" style={{ marginTop: '20px' }}>
        <div className="table-scroll">
          <table className="meta-ads-details-table">
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
              {monthlyBreakdown.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.campaignname}</td>
                  <td>{row.month}</td>
                  <td>{formatMoney(row.spend)}</td>
                  <td>{row.leads}</td>
                  <td>{formatMoney(row.cpl)}</td>
                  <td>{row.impressions.toLocaleString()}</td>
                  <td>{row.reach.toLocaleString()}</td>
                  <td>{(row.ctr * 100).toFixed(2)}</td>
                  <td>{formatMoney(row.cpm)}</td>
                  <td>{(row.engagement * 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default OverviewView;
