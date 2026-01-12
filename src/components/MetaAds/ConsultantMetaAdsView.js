import React from 'react';
import { Users, Calendar, Filter } from 'lucide-react';
import { Card, StatCard } from '../UI/Card';
import '../../NewAnalytics.css';
import './MetaAdsAccountView.css';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

function ConsultantMetaAdsView({ data }) {
  console.log('[ConsultantMetaAdsView] Rendering with data:', data);

  // Get all unique tags
  const allTags = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const tagsSet = new Set();
    data.forEach(consultant => {
      if (consultant.tagCountsByTimeWindow) {
        const timeWindows = Object.values(consultant.tagCountsByTimeWindow);
        if (timeWindows.length > 0) {
          Object.keys(timeWindows[0]).forEach(tag => tagsSet.add(tag));
        }
      }
    });
    return Array.from(tagsSet).sort();
  }, [data]);

  const timeWindows = ['30', '90', '150', '365'];

  // Calculate totals
  const totals = React.useMemo(() => {
    if (!data || data.length === 0) {
      return { totalContacts: 0, totalsByWindow: {}, totalsByTag: {} };
    }
    
    const totalContacts = data.reduce((sum, c) => sum + (c.totalTaggedContacts || 0), 0);
    const totalsByWindow = {};
    const totalsByTag = {};
    
    timeWindows.forEach(window => {
      totalsByWindow[window] = data.reduce((sum, c) => sum + (c.countsByTimeWindow?.[window] || 0), 0);
    });

    allTags.forEach(tag => {
      totalsByTag[tag] = {};
      timeWindows.forEach(window => {
        totalsByTag[tag][window] = data.reduce((sum, c) => 
          sum + (c.tagCountsByTimeWindow?.[window]?.[tag] || 0), 0
        );
      });
    });

    return { totalContacts, totalsByWindow, totalsByTag };
  }, [data, allTags, timeWindows]);

  // Sorted consultants memo
  const sortedConsultants = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => (b.totalTaggedContacts || 0) - (a.totalTaggedContacts || 0));
  }, [data]);

  const consultantNames = React.useMemo(
    () => sortedConsultants.map((c) => c.assignedTo || 'Unassigned'),
    [sortedConsultants]
  );

  // Chart data: rows per time window with each consultant as a series key
  const chartData = React.useMemo(() => {
    const windows = ['30', '90', '150', '365'];
    return windows.map((w) => {
      const row = { window: w, label: `${w} Days` };
      sortedConsultants.forEach((c) => {
        row[c.assignedTo || 'Unassigned'] = c.countsByTimeWindow?.[w] || 0;
      });
      return row;
    });
  }, [sortedConsultants]);

  const lineColors = ['#667eea', '#4facfe', '#54a0ff', '#00d4ff', '#f093fb', '#ff9f43', '#26de81', '#a55eea'];

  // Expand/collapse state for rows (use assignedTo as key)
  const [expandedRows, setExpandedRows] = React.useState(() => new Set());
  const toggleRow = (key) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Early return after all hooks
  if (!data || data.length === 0) {
    return (
      <div className="consultant-meta-ads-view">
        <p className="muted">No consultant data available</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="consultant-header" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.5rem', color: '#1e293b' }}>Consultant Meta Ads Performance</h3>
        <p className="muted" style={{ fontSize: '0.9rem', color: '#64748b' }}>Tagged contacts by consultant and campaign over time windows</p>
      </div>

      {/* Summary KPIs */}
      <div className="analytics-grid kpi-row">
        <StatCard label="Total Consultants" value={data.length} icon={Users} trend={0} trendLabel="active" />
        <StatCard label="Total Tagged Contacts" value={totals.totalContacts} icon={Filter} trend={0} trendLabel="lifetime" />
        <StatCard label="Last 90 Days" value={totals.totalsByWindow['90']} icon={Calendar} trend={0} trendLabel="leads" />
        <StatCard label="Last 365 Days" value={totals.totalsByWindow['365']} icon={Calendar} trend={0} trendLabel="leads" />
      </div>

      {/* Leads Comparison Chart */}
      <Card title="Consultant Leads by Time Window" className="chart-card wide">
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 12, right: 24, left: 0, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e6f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: 12 }} />
              {consultantNames.map((name, idx) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={lineColors[idx % lineColors.length]}
                  strokeWidth={2.4}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Single Expandable Table */}
      <Card title="Consultant Performance Overview" className="chart-card wide" style={{ marginTop: '20px' }}>
        <div className="table-scroll">
          <table className="meta-ads-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Consultant</th>
                <th>Total Contacts</th>
                {timeWindows.map(window => (
                  <th key={window}>{window}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedConsultants.map((consultant) => {
                const key = consultant.assignedTo || `${consultant.assignedTo}-${consultant.totalTaggedContacts}`;
                const isExpanded = expandedRows.has(key);
                const shortWindows = ['30', '90', '150'];
                const hasShortWindowData = allTags.some(tag => 
                  shortWindows.some(w => (consultant.tagCountsByTimeWindow?.[w]?.[tag] || 0) > 0)
                );
                return (
                  <React.Fragment key={key}>
                    <tr className={`consultant-row ${isExpanded ? 'expanded' : ''}`}>
                      <td className="expand-toggle">
                        <button
                          className={`expand-btn ${isExpanded ? 'open' : ''}`}
                          onClick={() => toggleRow(key)}
                          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                        >
                          {isExpanded ? '▾' : '▸'}
                        </button>
                      </td>
                      <td style={{ fontWeight: '600', color: '#333' }}>{consultant.assignedTo}</td>
                      <td style={{ fontWeight: '600' }}>{consultant.totalTaggedContacts}</td>
                      {timeWindows.map(window => (
                        <td key={window}>{consultant.countsByTimeWindow?.[window] || 0}</td>
                      ))}
                    </tr>
                    {isExpanded && (
                      <tr className="expanded-row">
                        <td colSpan={3 + timeWindows.length}>
                          <div className="expanded-content">
                            {hasShortWindowData ? (
                              <div className="table-scroll">
                                <table className="meta-ads-table subtable">
                                  <tbody>
                                    {allTags.map(tag => {
                                      const hasData = shortWindows.some(window => 
                                        (consultant.tagCountsByTimeWindow?.[window]?.[tag] || 0) > 0
                                      );
                                      if (!hasData) return null;
                                      return (
                                        <tr key={tag}>
                                          <td style={{ fontWeight: '600', textTransform: 'capitalize' }}>{tag}</td>
                                          {timeWindows.map(window => {
                                            const count = consultant.tagCountsByTimeWindow?.[window]?.[tag] || 0;
                                            return (
                                              <td key={window} style={{ 
                                                background: count > 0 ? `rgba(102, 126, 234, ${Math.min(count / 20, 0.3)})` : 'transparent'
                                              }}>
                                                {count}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="muted" style={{ padding: '8px 12px' }}>
                                No tag activity in the last 150 days.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}

export default ConsultantMetaAdsView;
