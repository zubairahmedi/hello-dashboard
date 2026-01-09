import React, { useState, useEffect } from 'react';
import './Sources.css';
import API_CONFIG from '../../config/apiConfig';
import {
  initDB,
  getData,
  saveData,
  getDataFreshnessMessage
} from '../../utils/indexedDbService';
import exportNodeAsPdf from '../../utils/pdfExport';

const SOURCES_CACHE_KEY = 'sourcesData';
const SOURCES_WEBHOOK_URL = API_CONFIG.SOURCES_WEBHOOK;

function Sources() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataFreshness, setDataFreshness] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState('all');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('last30Days');

  // Initialize IndexedDB and load cached data on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        await loadCachedData();
      } catch (err) {
        console.error('Failed to initialize Sources:', err);
        setError(err.message);
      }
    };
    initialize();
  }, []);

  // Load data from cache
  const loadCachedData = async () => {
    try {
      const cached = await getData(SOURCES_CACHE_KEY);
      if (cached) {
        setData(cached.data);
        setIsCached(true);
        setDataFreshness(getDataFreshnessMessage(cached.savedAt));
        console.log('Sources data loaded from cache');
        return true;
      }
    } catch (err) {
      console.error('Error loading cached sources data:', err);
    }
    return false;
  };

  // Fetch data from webhook
  const fetchSourcesData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(SOURCES_WEBHOOK_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const json = await response.json();
      
      // Save to IndexedDB
      await saveData(SOURCES_CACHE_KEY, json);
      
      setData(json);
      setIsCached(false);
      setDataFreshness('Live (just now)');
      console.log('Sources data fetched and cached:', json);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching sources data:', err);
      
      // If fetch fails, try to load cached data
      const hasCached = await loadCachedData();
      if (!hasCached) {
        setError(err.message + ' (and no cached data available)');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSourcesData();
  };

  const handleExportPDF = () => {
    exportNodeAsPdf('sources-root', { filename: 'sources-report.pdf' });
  };

  // Extract unique consultants from data
  const getConsultants = () => {
    if (!data || !Array.isArray(data)) return [];
    return data.map(item => ({
      id: item.consultant_id,
      name: item.consultant_name
    })).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Get time period label
  const getTimePeriodLabel = (period) => {
    const labels = {
      last7Days: 'Last 7 Days',
      last14Days: 'Last 14 Days',
      last30Days: 'Last 30 Days',
      last2Months: 'Last 2 Months',
      last3Months: 'Last 3 Months',
      last6Months: 'Last 6 Months',
      last1Year: 'Last 1 Year'
    };
    return labels[period] || period;
  };

  // Get filtered data based on selections
  const getFilteredSources = () => {
    if (!data || !Array.isArray(data)) return [];

    let consultantsToShow = data;
    
    // Filter by consultant
    if (selectedConsultant !== 'all') {
      consultantsToShow = data.filter(item => item.consultant_id === selectedConsultant);
    }

    // Extract sources from the selected time period
    const sources = [];
    consultantsToShow.forEach(consultant => {
      const periodData = consultant[selectedTimePeriod];
      if (periodData && typeof periodData === 'object') {
        Object.entries(periodData).forEach(([sourceName, count]) => {
          sources.push({
            consultant: consultant.consultant_name,
            source: sourceName,
            count: count
          });
        });
      }
    });

    return sources.sort((a, b) => b.count - a.count);
  };

  // Calculate total count
  const getTotalCount = () => {
    const sources = getFilteredSources();
    return sources.reduce((sum, item) => sum + item.count, 0);
  };

  // Get aggregated sources (combined across consultants if "all" is selected)
  const getAggregatedSources = () => {
    const sources = getFilteredSources();
    
    if (selectedConsultant !== 'all') {
      // Show individual sources for a specific consultant
      return sources;
    }

    // Aggregate sources by source name when showing all consultants
    const aggregated = {};
    sources.forEach(item => {
      if (!aggregated[item.source]) {
        aggregated[item.source] = 0;
      }
      aggregated[item.source] += item.count;
    });

    return Object.entries(aggregated)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Get top 5 sources for each consultant
  const getTop5ByConsultant = () => {
    if (!data || !Array.isArray(data)) return [];

    return data.map(consultant => {
      const periodData = consultant[selectedTimePeriod];
      if (!periodData || typeof periodData !== 'object') {
        return {
          name: consultant.consultant_name,
          sources: [],
          total: 0,
          maxCount: 0
        };
      }

      const allSources = Object.entries(periodData)
        .map(([sourceName, count]) => ({ source: sourceName, count }))
        .sort((a, b) => b.count - a.count);
      
      const sources = allSources.slice(0, 5);
      const total = allSources.reduce((sum, s) => sum + s.count, 0);
      const maxCount = sources.length > 0 ? sources[0].count : 0;

      return {
        name: consultant.consultant_name,
        sources,
        total,
        maxCount
      };
    });
  };

  return (
    <div id="sources-root" className="sources-container">
      <div className="sources-header pdf-hide">
        <div className="sources-title-section">
          <h2>Sources</h2>
        </div>
        
        <div className="sources-controls">
          <button
            className="sources-refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? '⟳ Loading...' : '↻ Refresh'}
          </button>
          <button
            className="sources-export-btn"
            onClick={handleExportPDF}
            disabled={!data || loading}
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="sources-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && Array.isArray(data) && data.length > 0 && (
        <div className="sources-filters pdf-hide">
          <div className="filter-group">
            <label htmlFor="consultant-filter">Consultant:</label>
            <select
              id="consultant-filter"
              value={selectedConsultant}
              onChange={(e) => setSelectedConsultant(e.target.value)}
              className="sources-select"
            >
              <option value="all">All Consultants</option>
              {getConsultants().map(consultant => (
                <option key={consultant.id} value={consultant.id}>
                  {consultant.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="time-filter">Time Period:</label>
            <select
              id="time-filter"
              value={selectedTimePeriod}
              onChange={(e) => setSelectedTimePeriod(e.target.value)}
              className="sources-select"
            >
              <option value="last7Days">Last 7 Days</option>
              <option value="last14Days">Last 14 Days</option>
              <option value="last30Days">Last 30 Days</option>
              <option value="last2Months">Last 2 Months</option>
              <option value="last3Months">Last 3 Months</option>
              <option value="last6Months">Last 6 Months</option>
              <option value="last1Year">Last 1 Year</option>
            </select>
          </div>

          <div className="filter-summary">
            <strong>Total Sources: {getTotalCount()}</strong>
          </div>
        </div>
      )}

      <div className="sources-content">
        {!data ? (
          <p className="sources-empty">No data available. Click refresh to load data.</p>
        ) : !Array.isArray(data) || data.length === 0 ? (
          <p className="sources-empty">No sources data found.</p>
        ) : (
          <>
            {/* Top 5 Sources by Consultant */}
            <div className="sources-overview-section">
              <h3 className="sources-section-title">
                Top 5 Sources by Consultant - {getTimePeriodLabel(selectedTimePeriod)}
              </h3>
              <div className="sources-consultant-grid">
                {getTop5ByConsultant().map((consultant, idx) => (
                  <div key={idx} className="sources-consultant-card">
                    <h4 className="sources-consultant-name">{consultant.name}</h4>
                    
                    <div className="sources-stats">
                      <div className="sources-stat-item">
                        <span className="sources-stat-label">Total Sources:</span>
                        <span className="sources-stat-value">{consultant.total}</span>
                      </div>
                      <div className="sources-stat-item">
                        <span className="sources-stat-label">Top 5 Total:</span>
                        <span className="sources-stat-value">
                          {consultant.sources.reduce((sum, s) => sum + s.count, 0)}
                        </span>
                      </div>
                    </div>

                    {consultant.sources.length === 0 ? (
                      <div className="sources-no-data">No data available</div>
                    ) : (
                      <div className="sources-chart-container">
                        {consultant.sources.map((source, sidx) => {
                          const percentage = consultant.maxCount > 0 
                            ? (source.count / consultant.maxCount) * 100 
                            : 0;
                          const totalPercentage = consultant.total > 0
                            ? ((source.count / consultant.total) * 100).toFixed(1)
                            : 0;
                          
                          return (
                            <div key={sidx} className="sources-chart-row">
                              <div className="sources-chart-label">
                                <span className="sources-chart-rank">#{sidx + 1}</span>
                                <span className="sources-chart-name" title={source.source}>
                                  {source.source}
                                </span>
                              </div>
                              <div className="sources-chart-bar-wrapper">
                                <div 
                                  className="sources-chart-bar" 
                                  style={{ width: `${percentage}%` }}
                                >
                                  <span className="sources-chart-count">{source.count}</span>
                                </div>
                                <span className="sources-chart-percentage">{totalPercentage}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Full Sources Table */}
            <div className="sources-view-content">
              <h3 className="sources-period-title">
                {selectedConsultant === 'all' ? 'All Sources' : 'Detailed View'} - {getTimePeriodLabel(selectedTimePeriod)}
                {selectedConsultant !== 'all' && 
                  ` - ${getConsultants().find(c => c.id === selectedConsultant)?.name}`
                }
              </h3>
              <div className="sources-table-wrapper">
                <table className="sources-table">
                  <thead>
                    <tr>
                      {selectedConsultant === 'all' && <th>Source</th>}
                      {selectedConsultant !== 'all' && (
                        <>
                          <th>Source</th>
                          <th>Consultant</th>
                        </>
                      )}
                      <th className="sources-count-header">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getAggregatedSources().length === 0 ? (
                      <tr>
                        <td colSpan={selectedConsultant === 'all' ? 2 : 3} className="sources-no-data">
                          No sources found for this selection
                        </td>
                      </tr>
                    ) : (
                      getAggregatedSources().map((item, idx) => (
                        <tr key={idx}>
                          <td className="sources-name">{item.source}</td>
                          {selectedConsultant !== 'all' && (
                            <td>{item.consultant}</td>
                          )}
                          <td className="sources-count">{item.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Sources;