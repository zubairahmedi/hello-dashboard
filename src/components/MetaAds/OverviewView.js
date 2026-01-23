import React, { useMemo, useState } from 'react';
import { DollarSign, Eye, MousePointer, Target, Search, ArrowUpDown, TrendingUp } from 'lucide-react';
import { Card } from '../UI/Card';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { CATEGORY_COLORS } from '../../utils/chartColors';
import '../../NewAnalytics.css';
import './MetaAdsAccountView.css';

function toNumber(val, fallback = 0) {
  const n = typeof val === 'string' ? parseFloat(val) : Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function formatMoney(n) {
  return `$${toNumber(n).toFixed(2)}`;
}

function formatCompact(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function round2(n) {
  const x = toNumber(n);
  return Math.round(x * 100) / 100;
}

// Account/Category tabs
const CATEGORY_TABS = [
  { key: 'all', label: 'All Categories' },
  { key: 'MFE - FOOD', label: 'Food' },
  { key: 'MFE - RECREATION', label: 'Recreation' },
  { key: 'MFE - HOME', label: 'Home' },
  { key: 'MFE - PET', label: 'Pet' },
  { key: 'MFE - BEAUTY', label: 'Beauty' },
  { key: 'MFE - FINANCIAL', label: 'Financial' }
];

function OverviewView({ data }) {
  const rows = Array.isArray(data) ? data : [];
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'totalspend', direction: 'desc' });
  
  // Build year options from data
  const yearOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const y = toNumber(r?.year, null);
      if (Number.isFinite(y)) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const [selectedYear, setSelectedYear] = useState(null);
  
  React.useEffect(() => {
    if (selectedYear == null && yearOptions.length > 0) {
      setSelectedYear(yearOptions[0]);
    }
  }, [yearOptions, selectedYear]);

  // Filter rows by selected category
  const filteredRows = useMemo(() => {
    if (selectedCategory === 'all') return rows;
    return rows.filter(r => r?.accountname === selectedCategory);
  }, [rows, selectedCategory]);

  // Calculate Global KPIs
  const kpis = useMemo(() => {
    const monthlyRows = filteredRows.filter(r => 
      r?._aggregation_type === 'monthly_campaign' && 
      toNumber(r?.year, null) === selectedYear
    );
    
    if (monthlyRows.length === 0) return null;

    const totalSpend = monthlyRows.reduce((sum, r) => sum + toNumber(r?.totalspend ?? r?.spend), 0);
    const totalLeads = monthlyRows.reduce((sum, r) => sum + toNumber(r?.totalleads ?? r?.leads), 0);
    const totalImpressions = monthlyRows.reduce((sum, r) => sum + toNumber(r?.impressions), 0);
    const totalClicks = monthlyRows.reduce((sum, r) => sum + toNumber(r?.link_click), 0);
    
    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const roas = totalSpend > 0 ? (totalLeads * 100) / totalSpend : 0; // Simplified ROAS proxy

    return {
      totalSpend,
      totalLeads,
      totalImpressions,
      totalClicks,
      avgCPL,
      avgCPM,
      avgCTR,
      roas
    };
  }, [filteredRows, selectedYear]);

  // Trend data for charts (monthly aggregation)
  const trendData = useMemo(() => {
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthlyRows = filteredRows.filter(r => 
      r?._aggregation_type === 'monthly_campaign' && 
      toNumber(r?.year, null) === selectedYear
    );

    // Aggregate by month
    const byMonth = new Map();
    monthlyRows.forEach(r => {
      const mi = toNumber(r?.month_index, null);
      if (mi === null) return;
      
      const cur = byMonth.get(mi) || { 
        month: MONTHS[mi] || '', 
        monthIndex: mi,
        spend: 0, 
        leads: 0,
        impressions: 0,
        clicks: 0
      };
      
      cur.spend += toNumber(r?.totalspend ?? r?.spend);
      cur.leads += toNumber(r?.totalleads ?? r?.leads);
      cur.impressions += toNumber(r?.impressions);
      cur.clicks += toNumber(r?.link_click);
      
      byMonth.set(mi, cur);
    });

    return Array.from(byMonth.values())
      .sort((a, b) => a.monthIndex - b.monthIndex)
      .map(d => ({
        ...d,
        monthLabel: d.month.slice(0, 3),
        cpl: d.leads > 0 ? d.spend / d.leads : 0
      }));
  }, [filteredRows, selectedYear]);

  // Category breakdown for pie chart
  const categoryBreakdown = useMemo(() => {
    if (selectedCategory !== 'all') return [];
    
    const monthlyRows = rows.filter(r => 
      r?._aggregation_type === 'monthly_campaign' && 
      toNumber(r?.year, null) === selectedYear
    );

    const byAccount = new Map();
    monthlyRows.forEach(r => {
      const account = r?.accountname || 'Unknown';
      const cur = byAccount.get(account) || { name: account, spend: 0, leads: 0 };
      cur.spend += toNumber(r?.totalspend ?? r?.spend);
      cur.leads += toNumber(r?.totalleads ?? r?.leads);
      byAccount.set(account, cur);
    });

    return Array.from(byAccount.values())
      .filter(d => d.spend > 0)
      .sort((a, b) => b.spend - a.spend);
  }, [rows, selectedYear, selectedCategory]);

  // Yearly per-account aggregation for selected year
  const yearlyAccountRows = useMemo(() => {
    if (!Number.isFinite(selectedYear)) return [];
    const monthlyRows = filteredRows.filter(r => 
      r?._aggregation_type === 'monthly_campaign' && 
      toNumber(r?.year, null) === selectedYear
    );
    
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
        clicks: 0,
        ctrWeighted: 0,
        engagementWeighted: 0,
      };

      const spend = toNumber(r?.totalspend ?? r?.spend);
      const leads = toNumber(r?.totalleads ?? r?.leads);
      const impressions = toNumber(r?.impressions);
      const reach = toNumber(r?.Reach ?? r?.reach);
      const clicks = toNumber(r?.link_click);
      const ctr = toNumber(r?.ctr);
      const engagement = toNumber(r?.engagement_rate);

      cur.totalspend += spend;
      cur.totalleads += leads;
      cur.impressions += impressions;
      cur.reach += reach;
      cur.clicks += clicks;
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
        ...r,
        avgCpl,
        avgCtr,
        avgCpm,
        avgEngagement,
      };
    });

    return list.sort((a, b) => a.accountname.localeCompare(b.accountname));
  }, [filteredRows, selectedYear]);

  // Table data with search and sort
  const tableData = useMemo(() => {
    let filtered = yearlyAccountRows;
    
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.accountname.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const aVal = sortConfig.key === 'accountname' ? a.accountname.toLowerCase() : a[sortConfig.key];
      const bVal = sortConfig.key === 'accountname' ? b.accountname.toLowerCase() : b[sortConfig.key];
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [yearlyAccountRows, searchTerm, sortConfig]);

  const yearlyTotals = useMemo(() => {
    if (!Number.isFinite(selectedYear)) return null;
    const rowsAcc = yearlyAccountRows;
    const spend = rowsAcc.reduce((s, r) => s + round2(r.totalspend), 0);
    const leads = rowsAcc.reduce((s, r) => s + toNumber(r.totalleads), 0);
    const impressions = rowsAcc.reduce((s, r) => s + toNumber(r.impressions), 0);
    const reach = rowsAcc.reduce((s, r) => s + toNumber(r.reach), 0);
    const clicks = rowsAcc.reduce((s, r) => s + toNumber(r.clicks), 0);
    const avgCpl = leads > 0 ? spend / leads : 0;
    const avgCtr = impressions > 0
      ? rowsAcc.reduce((s, r) => s + (toNumber(r.avgCtr) * toNumber(r.impressions)), 0) / impressions
      : 0;
    const avgEngagement = impressions > 0
      ? rowsAcc.reduce((s, r) => s + (toNumber(r.avgEngagement) * toNumber(r.impressions)), 0) / impressions
      : 0;
    const avgCpm = impressions > 0 ? (spend * 1000) / impressions : 0;
    return { spend, leads, impressions, reach, clicks, avgCpl, avgCtr, avgCpm, avgEngagement };
  }, [yearlyAccountRows, selectedYear]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Max values for progress bars
  const maxSpend = useMemo(() => Math.max(...yearlyAccountRows.map(r => r.totalspend), 1), [yearlyAccountRows]);
  const maxCTR = useMemo(() => Math.max(...yearlyAccountRows.map(r => r.avgCtr * 100), 1), [yearlyAccountRows]);

  // Debug logging
  console.log('[OverviewView] Debug:', { 
    rowsLength: rows.length, 
    yearOptions, 
    selectedYear, 
    kpis,
    yearlyAccountRowsLength: yearlyAccountRows.length 
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="meta-chart-tooltip">
          <p className="meta-tooltip-label">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="meta-tooltip-value" style={{ color: p.color }}>
              {p.name}: {p.name === 'Spend' ? formatMoney(p.value) : p.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Early return if no data at all
  if (rows.length === 0) {
    return (
      <div className="meta-overview-container">
        <div className="meta-empty-state">
          <p>No Meta Ads data available. Click "Refresh Data" to fetch the latest data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="meta-overview-container">
      {/* Year Selector */}
      <div className="meta-year-selector">
        <label htmlFor="overview-year">Year:</label>
        <select 
          id="overview-year" 
          value={selectedYear || ''} 
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Category Pills */}
      <div className="meta-category-pills">
        {CATEGORY_TABS.map(cat => (
          <button
            key={cat.key}
            className={`meta-category-pill ${selectedCategory === cat.key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* No data for selected filters message */}
      {!kpis && (
        <div className="meta-no-data-message">
          <p>No data available for the selected year and category. Try selecting a different year or category.</p>
        </div>
      )}

      {/* KPI Cards Row */}
      {kpis && (
        <div className="meta-kpi-row">
          <div className="meta-kpi-card">
            <div className="meta-kpi-icon" style={{ background: '#dbeafe' }}>
              <DollarSign size={20} color="#2563eb" />
            </div>
            <div className="meta-kpi-content">
              <span className="meta-kpi-label">Total Spend</span>
              <span className="meta-kpi-value">{formatMoney(kpis.totalSpend)}</span>
              <span className="meta-kpi-subvalue">{kpis.totalLeads} leads generated</span>
            </div>
          </div>

          <div className="meta-kpi-card">
            <div className="meta-kpi-icon" style={{ background: '#e0e7ff' }}>
              <Eye size={20} color="#4f46e5" />
            </div>
            <div className="meta-kpi-content">
              <span className="meta-kpi-label">Impressions</span>
              <span className="meta-kpi-value">{formatCompact(kpis.totalImpressions)}</span>
              <span className="meta-kpi-subvalue">CPM: {formatMoney(kpis.avgCPM)}</span>
            </div>
          </div>

          <div className="meta-kpi-card">
            <div className="meta-kpi-icon" style={{ background: '#d1fae5' }}>
              <MousePointer size={20} color="#059669" />
            </div>
            <div className="meta-kpi-content">
              <span className="meta-kpi-label">Clicks</span>
              <span className="meta-kpi-value">{formatCompact(kpis.totalClicks)}</span>
              <span className="meta-kpi-subvalue">CTR: {kpis.avgCTR.toFixed(2)}%</span>
            </div>
          </div>

          <div className="meta-kpi-card">
            <div className="meta-kpi-icon" style={{ background: '#fef3c7' }}>
              <Target size={20} color="#d97706" />
            </div>
            <div className="meta-kpi-content">
              <span className="meta-kpi-label">Cost Per Lead</span>
              <span className="meta-kpi-value">{formatMoney(kpis.avgCPL)}</span>
              <span className="meta-kpi-subvalue">{kpis.totalLeads} total leads</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="meta-charts-row">
        {/* Spend vs Leads Trend */}
        <div className="meta-chart-card meta-chart-large">
          <h3 className="meta-section-title">
            <TrendingUp size={18} style={{ marginRight: '8px' }} />
            Spend vs Lead Generation
          </h3>
          <div className="meta-chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={trendData} margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="monthLabel" />
                <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  tickFormatter={(v) => v.toLocaleString()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="spend" name="Spend" fill="#3182ce" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="leads" name="Leads" stroke="#38a169" strokeWidth={3} dot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        {selectedCategory === 'all' && categoryBreakdown.length > 0 && (
          <div className="meta-chart-card meta-chart-small">
            <h3 className="meta-section-title">Spend by Category</h3>
            <div className="meta-chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="spend"
                    label={({ name, percent }) => `${name.replace('MFE - ', '')} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#718096'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="meta-category-legend">
              {categoryBreakdown.map((cat, idx) => (
                <div key={idx} className="meta-legend-item">
                  <span className="meta-legend-dot" style={{ background: CATEGORY_COLORS[cat.name] || '#718096' }} />
                  <span className="meta-legend-name">{cat.name.replace('MFE - ', '')}</span>
                  <span className="meta-legend-value">{formatMoney(cat.spend)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Account Performance Table */}
      <div className="meta-table-section">
        <div className="meta-table-header">
          <h3 className="meta-section-title">Account Performance Summary</h3>
          <div className="meta-search-wrapper">
            <Search size={18} className="meta-search-icon" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="meta-search-input"
            />
          </div>
        </div>

        <div className="meta-table-scroll">
          <table className="meta-master-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('accountname')} className="sortable">
                  Account <ArrowUpDown size={14} />
                </th>
                <th onClick={() => handleSort('totalspend')} className="sortable">
                  Spend <ArrowUpDown size={14} />
                </th>
                <th onClick={() => handleSort('totalleads')} className="sortable">
                  Leads <ArrowUpDown size={14} />
                </th>
                <th onClick={() => handleSort('avgCpl')} className="sortable">
                  CPL <ArrowUpDown size={14} />
                </th>
                <th onClick={() => handleSort('avgCtr')} className="sortable">
                  CTR <ArrowUpDown size={14} />
                </th>
                <th>CTR Progress</th>
                <th onClick={() => handleSort('avgEngagement')} className="sortable">
                  Engagement <ArrowUpDown size={14} />
                </th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((r, idx) => {
                const ctrPercent = (r.avgCtr * 100);
                const ctrBarWidth = (ctrPercent / maxCTR) * 100;
                const getCTRStyle = (ctr) => {
                  if (ctr >= 1.5) return { color: '#166534', bg: '#d1fae5' }; // Good
                  if (ctr >= 0.8) return { color: '#854d0e', bg: '#fef3c7' }; // Okay
                  return { color: '#991b1b', bg: '#fee2e2' }; // Needs work
                };
                const ctrStyle = getCTRStyle(ctrPercent);
                
                return (
                  <tr key={idx}>
                    <td className="meta-account-name">{r.accountname}</td>
                    <td className="meta-spend">{formatMoney(r.totalspend)}</td>
                    <td className="meta-leads">{r.totalleads}</td>
                    <td className="meta-cpl">{formatMoney(r.avgCpl)}</td>
                    <td>
                      <span 
                        className="meta-ctr-badge"
                        style={{ background: ctrStyle.bg, color: ctrStyle.color }}
                      >
                        {ctrPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="meta-bar-cell">
                      <div className="meta-mini-bar-wrapper">
                        <div 
                          className="meta-mini-bar"
                          style={{ 
                            width: `${ctrBarWidth}%`,
                            background: ctrPercent >= 1.5 ? '#38a169' : ctrPercent >= 0.8 ? '#d69e2e' : '#e53e3e'
                          }}
                        />
                      </div>
                    </td>
                    <td className="meta-engagement">{(r.avgEngagement * 100).toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
            {yearlyTotals && (
              <tfoot>
                <tr>
                  <th>Total</th>
                  <th>{formatMoney(yearlyTotals.spend)}</th>
                  <th>{yearlyTotals.leads}</th>
                  <th>{formatMoney(yearlyTotals.avgCpl)}</th>
                  <th>{(yearlyTotals.avgCtr * 100).toFixed(2)}%</th>
                  <th></th>
                  <th>{(yearlyTotals.avgEngagement * 100).toFixed(2)}%</th>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="meta-table-footer">
          Showing {tableData.length} of {yearlyAccountRows.length} accounts
        </div>
      </div>
    </div>
  );
}

export default OverviewView;
