import React, { useMemo, useState } from 'react';
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
    <div className="month-comparison-section">
      <div className="comparison-header">
        <h3>Month Comparison</h3>
        <p className="comparison-subtitle">Compare performance metrics across multiple months</p>
      </div>

      {/* Month Selection */}
      <div className="comparison-controls">
        <label>Select months to compare:</label>
        <div className="month-dropdown-wrapper">
          <button
            className="month-dropdown-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span>
              {selectedMonths.length === 0
                ? 'Choose months...'
                : `${selectedMonths.length} month${selectedMonths.length !== 1 ? 's' : ''} selected`}
            </span>
            <span className="dropdown-arrow">{isDropdownOpen ? '▲' : '▼'}</span>
          </button>

          {isDropdownOpen && (
            <div className="month-dropdown-menu">
              {availableMonths.map(month => (
                <label key={month.key} className="month-dropdown-item">
                  <input
                    type="checkbox"
                    checked={selectedMonths.includes(month.key)}
                    onChange={() => toggleMonth(month.key)}
                    className="month-checkbox"
                  />
                  <span className="checkmark"></span>
                  <span className="month-label">{month.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedMonths.length >= 2 ? (
        <>
          {/* Charts */}
          <div className="comparison-charts">
            {/* Spend Comparison */}
            <div className="comparison-chart-wrapper">
              <h4>Spend by Month</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataByMetric.spend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Bar dataKey="spend" fill="#667eea" name="Spend" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Leads Comparison */}
            <div className="comparison-chart-wrapper">
              <h4>Leads by Month</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataByMetric.leads}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#764ba2" name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Impressions Comparison */}
            <div className="comparison-chart-wrapper">
              <h4>Impressions by Month</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartDataByMetric.impressions}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ month, impressions }) => `${month} (${impressions.toLocaleString()})`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="impressions"
                  >
                    {chartDataByMetric.impressions.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* CPL Comparison */}
            <div className="comparison-chart-wrapper">
              <h4>Cost Per Lead by Month</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataByMetric.cpl}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Bar dataKey="cpl" fill="#f093fb" name="CPL" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="comparison-table-section">
            <h4>Monthly Comparison</h4>
            <div className="table-scroll">
              <table className="comparison-table">
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
                      <td>{row.month}</td>
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
          </div>
        </>
      ) : (
        <div className="comparison-empty">
          <p className="muted">Select at least 2 months to view comparison charts and table</p>
        </div>
      )}
    </div>
  );
}

export default MonthComparison;
