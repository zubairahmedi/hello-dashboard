import React, { useMemo, useState } from 'react';
import { Card } from '../UI/Card';
import '../../NewAnalytics.css';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00d4ff', '#54a0ff'];

function MonthComparison({ data, accountName, monthOptions }) {
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Get unique months from data
  const availableMonths = useMemo(() => {
    if (!data || data.length === 0) return [];
    const unique = {};
    data.forEach(row => {
      if (row.month_name && row.year) {
        const key = `${row.year}-${row.month_index}`;
        if (!unique[key]) {
          unique[key] = {
            key,
            label: `${row.month_name} '${String(row.year).slice(-2)}`,
            monthIndex: row.month_index,
            year: row.year,
          };
        }
      }
    });
    return Object.values(unique).sort((a, b) => b.monthIndex - a.monthIndex);
  }, [data]);

  // Handle month selection
  const toggleMonth = (monthKey) => {
    setSelectedMonths(prev =>
      prev.includes(monthKey)
        ? prev.filter(m => m !== monthKey)
        : [...prev, monthKey]
    );
  };

  // Filter data for selected months and aggregate by month
  const comparisonData = useMemo(() => {
    if (selectedMonths.length === 0 || !data) return [];

    const filtered = data.filter(row => {
      const monthKey = `${row.year}-${row.month_index}`;
      return selectedMonths.includes(monthKey);
    });

    // Group and aggregate by month
    const grouped = {};
    filtered.forEach(row => {
      const monthKey = `${row.year}-${row.month_index}`;
      const monthLabel = `${row.month_name.slice(0, 3)} '${String(row.year).slice(-2)}`;
      
      if (!grouped[monthLabel]) {
        grouped[monthLabel] = {
          month: monthLabel,
          spend: 0,
          leads: 0,
          impressions: 0,
          reach: 0,
          cpl: 0,
          ctr: 0,
          cpm: 0,
          engagement: 0,
          campaignCount: 0,
        };
      }

      grouped[monthLabel].spend += parseFloat(row.totalspend) || 0;
      grouped[monthLabel].leads += row.totalleads || 0;
      grouped[monthLabel].impressions += row.impressions || 0;
      grouped[monthLabel].reach += row.Reach || 0;
      grouped[monthLabel].campaignCount += 1;
    });

    // Calculate averages for metrics that should be averaged
    Object.values(grouped).forEach(month => {
      if (month.campaignCount > 0) {
        month.cpl = month.leads > 0 ? month.spend / month.leads : 0;
        month.ctr = month.impressions > 0 
          ? filtered
              .filter(r => `${r.month_name.slice(0, 3)} '${String(r.year).slice(-2)}` === month.month)
              .reduce((sum, r) => sum + (r.ctr || 0), 0) / month.campaignCount * 100
          : 0;
        month.cpm = month.impressions > 0 ? month.spend / (month.impressions / 1000) : 0;
        month.engagement = filtered
          .filter(r => `${r.month_name.slice(0, 3)} '${String(r.year).slice(-2)}` === month.month)
          .reduce((sum, r) => sum + (r.engagement_rate || 0) * 100, 0) / month.campaignCount;
      }
    });

    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }, [selectedMonths, data]);

  // Prepare chart data - simplified for month-to-month comparison
  const chartDataByMetric = useMemo(() => {
    return {
      spend: comparisonData,
      leads: comparisonData,
      impressions: comparisonData,
      cpl: comparisonData,
    };
  }, [comparisonData]);

  // Prepare table data - one row per month
  const tableData = useMemo(() => {
    return comparisonData.map(month => ({
      month: month.month,
      spend: month.spend,
      leads: month.leads,
      impressions: month.impressions,
      reach: month.reach,
      cpl: month.cpl,
      ctr: month.ctr,
      cpm: month.cpm,
      engagement: month.engagement,
    }));
  }, [comparisonData]);

  return (
    <div className="analytics-dashboard">
      <div className="consultant-header" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.5rem', color: '#1e293b' }}>Month Comparison</h3>
        <p className="muted" style={{ fontSize: '0.9rem', color: '#64748b' }}>Compare performance metrics across multiple months</p>
      </div>

      {/* Month Selection */}
      <Card className="chart-card wide" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
          <label style={{ fontWeight: 500, color: '#4a5568' }}>Select months to compare:</label>
          <div className="month-dropdown-wrapper" style={{ position: 'relative' }}>
            <button
              className="month-dropdown-trigger period-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{ border: '1px solid #e2e8f0', minWidth: '200px', display: 'flex', justifyContent: 'space-between' }}
            >
              <span>
                {selectedMonths.length === 0
                  ? 'Choose months...'
                  : `${selectedMonths.length} month${selectedMonths.length !== 1 ? 's' : ''} selected`}
              </span>
              <span className="dropdown-arrow">{isDropdownOpen ? '▲' : '▼'}</span>
            </button>

            {isDropdownOpen && (
              <div className="month-dropdown-menu" style={{ 
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
                padding: '0.5rem', 
                zIndex: 50, 
                minWidth: '200px',
                marginTop: '0.5rem'
              }}>
                {availableMonths.map(month => (
                  <label key={month.key} className="month-dropdown-item" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', cursor: 'pointer', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(month.key)}
                      onChange={() => toggleMonth(month.key)}
                      className="month-checkbox"
                    />
                    <span className="month-label" style={{ fontSize: '0.9rem' }}>{month.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {selectedMonths.length >= 2 ? (
        <>
          {/* Charts */}
          <div className="analytics-grid" style={{ marginBottom: 0 }}>
            {/* Spend Comparison */}
            <Card title="Spend by Month" className="chart-card">
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartDataByMetric.spend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e6f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Bar dataKey="spend" fill="#667eea" name="Spend" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Leads Comparison */}
            <Card title="Leads by Month" className="chart-card">
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartDataByMetric.leads}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e6f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="leads" fill="#764ba2" name="Leads" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Impressions Comparison */}
            <Card title="Impressions by Month" className="chart-card">
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartDataByMetric.impressions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e6f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                    <Bar dataKey="impressions" fill="#4facfe" name="Impressions" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* CPL Comparison */}
            <Card title="Cost Per Lead by Month" className="chart-card">
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartDataByMetric.cpl}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e6f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Bar dataKey="cpl" fill="#f093fb" name="CPL" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Comparison Table */}
          <Card title="Detailed Month Comparison" className="chart-card wide" style={{ marginTop: '20px' }}>
            <div className="table-scroll">
              <table className="meta-ads-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Spend</th>
                    <th>Leads</th>
                    <th>CPL</th>
                    <th>Impressions</th>
                    <th>Reach</th>
                    <th>CTR (%)</th>
                    <th>CPM</th>
                    <th>Engagement Rate (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>{row.month}</td>
                      <td>${row.spend.toFixed(2)}</td>
                      <td>{row.leads}</td>
                      <td>${row.cpl.toFixed(2)}</td>
                      <td>{row.impressions.toLocaleString()}</td>
                      <td>{row.reach.toLocaleString()}</td>
                      <td>{row.ctr.toFixed(2)}</td>
                      <td>${row.cpm.toFixed(2)}</td>
                      <td>{row.engagement.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card className="chart-card wide" style={{ marginTop: '20px', padding: '2rem', textAlign: 'center' }}>
          <div className="no-selection-placeholder">
            <h4 style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Select at least 2 months to compare</h4>
            <p className="muted" style={{ color: '#94a3b8' }}>Use the dropdown above to choose months</p>
          </div>
        </Card>
      )}
    </div>
  );
}

export default MonthComparison;
