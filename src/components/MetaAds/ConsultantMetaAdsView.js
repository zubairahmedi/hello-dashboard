import React from 'react';
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

  // Log detailed raw data structure for the first consultant
  React.useMemo(() => {
    if (data && data.length > 0) {
      const first = data[0];
      console.log('[ConsultantMetaAdsView] DETAILED RAW DATA - First Consultant:', {
        name: first.assignedTo,
        totalTaggedContacts: first.totalTaggedContacts,
        countsByTimeWindow: first.countsByTimeWindow,
        tagCountsByTimeWindow: first.tagCountsByTimeWindow
      });
      
      // For each window, show what tags exist and their sum
      ['30', '90', '150', '365'].forEach(window => {
        if (first.tagCountsByTimeWindow?.[window]) {
          console.log(`[ConsultantMetaAdsView] ${first.assignedTo} - All tags in window ${window}:`, first.tagCountsByTimeWindow[window]);
          const sum = Object.values(first.tagCountsByTimeWindow[window]).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
          const claimed = first.countsByTimeWindow[window];
          console.log(`[ConsultantMetaAdsView] ${first.assignedTo} - Window ${window}: Sum of all tags: ${sum}, Claimed: ${claimed}, Diff: ${claimed - sum}`);
        }
      });
    }
  }, [data]);

  // Get all unique tags
  const allTags = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const tagsSet = new Set();
    data.forEach(consultant => {
      if (consultant.tagCountsByTimeWindow) {
        const timeWindows = Object.values(consultant.tagCountsByTimeWindow);
        console.log(`[ConsultantMetaAdsView] ${consultant.assignedTo} - timeWindows:`, timeWindows);
        if (timeWindows.length > 0) {
          Object.keys(timeWindows[0]).forEach(tag => {
            console.log(`[ConsultantMetaAdsView] Adding tag: "${tag}"`);
            tagsSet.add(tag);
          });
        }
      }
    });
    const sortedTags = Array.from(tagsSet).sort();
    console.log('[ConsultantMetaAdsView] All unique tags found:', sortedTags);
    return sortedTags;
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
    
    console.log('[Totals Calculation] Starting with data:', { count: data.length, allTags });
    
    timeWindows.forEach(window => {
      totalsByWindow[window] = data.reduce((sum, c) => {
        const val = c.countsByTimeWindow?.[window] || 0;
        console.log(`[Totals] Adding ${c.assignedTo} window ${window}: ${val}`);
        return sum + val;
      }, 0);
      console.log(`[Totals] Window ${window} total claimed: ${totalsByWindow[window]}`);
    });

    allTags.forEach(tag => {
      totalsByTag[tag] = {};
      timeWindows.forEach(window => {
        totalsByTag[tag][window] = data.reduce((sum, c) => {
          const val = c.tagCountsByTimeWindow?.[window]?.[tag] || 0;
          return sum + val;
        }, 0);
      });
      console.log(`[Totals] Tag "${tag}":`, totalsByTag[tag]);
    });

    console.log('[Totals Calculation] FINAL totals:', { totalContacts, totalsByWindow, totalsByTag });
    
    // DEBUG: For each consultant, compare claimed vs calculated
    data.forEach(consultant => {
      console.log(`[DATA VALIDATION] ${consultant.assignedTo}:`, {
        totalTaggedContacts: consultant.totalTaggedContacts,
        countsByTimeWindow: consultant.countsByTimeWindow,
        tagCountsByTimeWindow: consultant.tagCountsByTimeWindow,
        allTagsInWindow90: consultant.tagCountsByTimeWindow?.['90'] ? Object.entries(consultant.tagCountsByTimeWindow['90']).map(([k, v]) => `${k}: ${v}`).join(', ') : 'N/A',
        sum90: consultant.tagCountsByTimeWindow?.['90'] ? Object.values(consultant.tagCountsByTimeWindow['90']).reduce((a, b) => a + b, 0) : 'N/A',
        claimed90: consultant.countsByTimeWindow?.['90'],
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
    <div className="consultant-meta-ads-view">
      <div className="consultant-header">
        <h3>Consultant Meta Ads Performance</h3>
        <p className="muted">Tagged contacts by consultant and campaign over time windows</p>
      </div>

      {/* Summary KPIs */}
      <div className="kpi-cards">
        <div className="kpi-card">
          <div className="kpi-label">Total Consultants</div>
          <div className="kpi-value">{data.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Tagged Contacts</div>
          <div className="kpi-value">{totals.totalContacts}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Last 90 Days</div>
          <div className="kpi-value">{totals.totalsByWindow['90']}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Last 365 Days</div>
          <div className="kpi-value">{totals.totalsByWindow['365']}</div>
        </div>
      </div>

      {/* Leads Comparison Chart */}
      <div className="table-section">
        <h4>Consultant Leads by Time Window</h4>
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
      </div>

      {/* Single Expandable Table */}
      <div className="table-section">
        <h4>Consultant Performance Overview</h4>
        <div className="table-scroll">
          <table className="meta-ads-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Consultant</th>
                {timeWindows.map(window => (
                  <th key={window}>{window}</th>
                ))}
                <th>Total Contacts</th>
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
                
                // FIX: Calculate correct values from tags instead of using potentially incorrect countsByTimeWindow
                const correctedCounts = {};
                timeWindows.forEach(window => {
                  correctedCounts[window] = allTags.reduce((sum, tag) =>
                    sum + (consultant.tagCountsByTimeWindow?.[window]?.[tag] || 0), 0
                  );
                });
                
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
                      {timeWindows.map(window => (
                        <td key={window}>{correctedCounts[window]}</td>
                      ))}
                      <td style={{ fontWeight: '600' }}>{consultant.totalTaggedContacts}</td>
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
                                      const hasData = timeWindows.some(window => 
                                        (consultant.tagCountsByTimeWindow?.[window]?.[tag] || 0) > 0
                                      );
                                      console.log(`[Expanded] ${consultant.assignedTo} - tag "${tag}": hasData=${hasData}`, {
                                        tagData: consultant.tagCountsByTimeWindow ? Object.keys(consultant.tagCountsByTimeWindow).map(w => ({
                                          window: w,
                                          count: consultant.tagCountsByTimeWindow[w][tag]
                                        })) : 'N/A'
                                      });
                                      if (!hasData) {
                                        console.log(`[Expanded] SKIPPING tag "${tag}" for ${consultant.assignedTo}`);
                                        return null;
                                      }
                                      return (
                                        <tr key={tag}>
                                          <td></td>
                                          <td style={{ fontWeight: '600', textTransform: 'capitalize', textAlign: 'left' }}>{tag}</td>
                                          {timeWindows.map(window => {
                                            const count = consultant.tagCountsByTimeWindow?.[window]?.[tag] || 0;
                                            return (
                                              <td key={window} style={{ 
                                                background: count > 0 ? `rgba(102, 126, 234, ${Math.min(count / 20, 0.3)})` : 'transparent',
                                                textAlign: 'center',
                                                fontWeight: count > 0 ? '500' : 'normal'
                                              }}>
                                                {count}
                                              </td>
                                            );
                                          })}
                                          <td></td>
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
      </div>

    </div>
  );
}

export default ConsultantMetaAdsView;
