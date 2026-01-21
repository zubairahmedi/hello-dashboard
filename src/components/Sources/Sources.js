import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  Legend 
} from 'recharts';
import { Database, TrendingUp, Award, Search, ArrowUpDown, Zap } from 'lucide-react';
import './Sources.css';
import API_CONFIG from '../../config/apiConfig';
import {
  initDB,
  getData,
  saveData,
  getDataFreshnessMessage
} from '../../utils/indexedDbService';
import exportNodeAsPdf from '../../utils/pdfExport';
import { SOURCE_TYPE_COLORS } from '../../utils/chartColors';

const SOURCES_CACHE_KEY = 'sourcesData';
const SOURCES_WEBHOOK_URL = API_CONFIG.SOURCES_WEBHOOK;

// Source type categorization
const categorizeSource = (sourceName) => {
  const name = sourceName.toLowerCase();
  if (name.includes('facebook') || name.includes('google') || name.includes('ads') || name.includes('meta') || name.includes('bing')) {
    return 'Paid';
  }
  if (name.includes('referral') || name.includes('organic') || name.includes('direct') || name.includes('seo')) {
    return 'Organic';
  }
  if (name.includes('franchise') || name.includes('bizbuysell') || name.includes('marketplace') || name.includes('franchise gator') || name.includes('franchise direct')) {
    return 'Marketplace';
  }
  return 'Other';
};

function Sources() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataFreshness, setDataFreshness] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState('all');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('last30Days');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'count', direction: 'desc' });

  // Time periods configuration matching Analytics Dashboard
  const timePeriods = [
    { value: 'last7Days', label: '7 Days' },
    { value: 'last14Days', label: '14 Days' },
    { value: 'last30Days', label: '30 Days' },
    { value: 'last2Months', label: '2 Months' },
    { value: 'last3Months', label: '3 Months' },
    { value: 'last6Months', label: '6 Months' },
    { value: 'last1Year', label: '1 Year' }
  ];

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

  // Get aggregated sources (combined across consultants if "all" is selected)
  const getAggregatedSources = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    let consultantsToShow = data;
    
    if (selectedConsultant !== 'all') {
      consultantsToShow = data.filter(item => item.consultant_id === selectedConsultant);
    }

    // Aggregate sources by source name
    const aggregated = {};
    consultantsToShow.forEach(consultant => {
      const periodData = consultant[selectedTimePeriod];
      if (periodData && typeof periodData === 'object') {
        Object.entries(periodData).forEach(([sourceName, count]) => {
          if (!aggregated[sourceName]) {
            aggregated[sourceName] = { source: sourceName, count: 0, type: categorizeSource(sourceName) };
          }
          aggregated[sourceName].count += count;
        });
      }
    });

    return Object.values(aggregated).sort((a, b) => b.count - a.count);
  }, [data, selectedConsultant, selectedTimePeriod]);

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    const sources = getAggregatedSources;
    const totalSources = sources.length;
    const totalLeads = sources.reduce((sum, s) => sum + s.count, 0);
    
    // Top source by volume
    const topSource = sources[0] || { source: 'N/A', count: 0 };
    
    // "Most Efficient" - Highest average leads per source type (using marketplace as proxy for quality)
    const marketplaceSources = sources.filter(s => s.type === 'Marketplace');
    const organicSources = sources.filter(s => s.type === 'Organic');
    
    // Most improved: Compare to previous period (mock for now - would need historical data)
    // For now, show the organic leader as "highest quality" since organic = free leads
    const topOrganic = organicSources.sort((a, b) => b.count - a.count)[0] || { source: 'N/A', count: 0 };
    
    return {
      totalSources,
      totalLeads,
      topSource,
      topOrganic
    };
  }, [getAggregatedSources]);

  // Top 10 sources for leaderboard
  const topSources = useMemo(() => {
    return getAggregatedSources.slice(0, 10);
  }, [getAggregatedSources]);

  // Source type breakdown for donut chart
  const sourceTypeBreakdown = useMemo(() => {
    const sources = getAggregatedSources;
    const breakdown = { Organic: 0, Paid: 0, Marketplace: 0, Other: 0 };
    
    sources.forEach(s => {
      breakdown[s.type] += s.count;
    });

    return Object.entries(breakdown)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value, color: SOURCE_TYPE_COLORS[name] }));
  }, [getAggregatedSources]);

  // Volume chart data (top 8 sources)
  const volumeChartData = useMemo(() => {
    return getAggregatedSources.slice(0, 8).map(s => ({
      name: s.source.length > 15 ? s.source.substring(0, 15) + '...' : s.source,
      fullName: s.source,
      leads: s.count,
      type: s.type
    }));
  }, [getAggregatedSources]);

  // Filtered and sorted table data
  const tableData = useMemo(() => {
    let filtered = getAggregatedSources;
    
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const aVal = sortConfig.key === 'source' ? a.source.toLowerCase() : a[sortConfig.key];
      const bVal = sortConfig.key === 'source' ? b.source.toLowerCase() : b[sortConfig.key];
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [getAggregatedSources, searchTerm, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const maxLeadCount = useMemo(() => {
    return Math.max(...getAggregatedSources.map(s => s.count), 1);
  }, [getAggregatedSources]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="sources-tooltip">
          <p className="sources-tooltip-label">{payload[0].payload.fullName || label}</p>
          <p className="sources-tooltip-value">{payload[0].value} leads</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="sources-root" className="sources-container">
      {/* Data Freshness Indicator */}
      {dataFreshness && (
        <div className="sources-freshness-badge pdf-hide">
          {isCached ? '📦 ' : '✓ '}{dataFreshness}
        </div>
      )}

      {error && (
        <div className="sources-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Time Period Selector */}
      {data && Array.isArray(data) && data.length > 0 && (
        <div className="sources-period-selector pdf-hide">
          {timePeriods.map(period => (
            <button
              key={period.value}
              className={`sources-period-btn ${selectedTimePeriod === period.value ? 'active' : ''}`}
              onClick={() => setSelectedTimePeriod(period.value)}
            >
              {period.label}
            </button>
          ))}
        </div>
      )}

      {/* Consultant Filter Pills */}
      {data && Array.isArray(data) && data.length > 0 && (
        <div className="sources-consultant-pills pdf-hide">
          <button
            className={`sources-pill ${selectedConsultant === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedConsultant('all')}
          >
            All Consultants
          </button>
          {getConsultants().map(consultant => (
            <button
              key={consultant.id}
              className={`sources-pill ${selectedConsultant === consultant.id ? 'active' : ''}`}
              onClick={() => setSelectedConsultant(consultant.id)}
            >
              {consultant.name}
            </button>
          ))}
        </div>
      )}

      <div className="sources-content">
        {!data ? (
          <p className="sources-empty">No data available. Click refresh to load data.</p>
        ) : !Array.isArray(data) || data.length === 0 ? (
          <p className="sources-empty">No sources data found.</p>
        ) : (
          <>
            {/* Row 1: KPI Cards */}
            <div className="sources-kpi-row">
              <div className="sources-kpi-card">
                <div className="sources-kpi-icon" style={{ background: '#e0e7ff' }}>
                  <Database size={20} color="#4f46e5" />
                </div>
                <div className="sources-kpi-content">
                  <span className="sources-kpi-label">Active Sources</span>
                  <span className="sources-kpi-value">{kpiMetrics.totalSources}</span>
                </div>
              </div>

              <div className="sources-kpi-card">
                <div className="sources-kpi-icon" style={{ background: '#dbeafe' }}>
                  <TrendingUp size={20} color="#2563eb" />
                </div>
                <div className="sources-kpi-content">
                  <span className="sources-kpi-label">Total Leads</span>
                  <span className="sources-kpi-value">{kpiMetrics.totalLeads.toLocaleString()}</span>
                </div>
              </div>

              <div className="sources-kpi-card">
                <div className="sources-kpi-icon" style={{ background: '#fef3c7' }}>
                  <Award size={20} color="#d97706" />
                </div>
                <div className="sources-kpi-content">
                  <span className="sources-kpi-label">Top Source</span>
                  <span className="sources-kpi-value sources-kpi-text">{kpiMetrics.topSource.source}</span>
                  <span className="sources-kpi-subvalue">{kpiMetrics.topSource.count} leads</span>
                </div>
              </div>

              <div className="sources-kpi-card">
                <div className="sources-kpi-icon" style={{ background: '#d1fae5' }}>
                  <Zap size={20} color="#059669" />
                </div>
                <div className="sources-kpi-content">
                  <span className="sources-kpi-label">Top Organic Source</span>
                  <span className="sources-kpi-value sources-kpi-text">{kpiMetrics.topOrganic.source}</span>
                  <span className="sources-kpi-subvalue">{kpiMetrics.topOrganic.count} leads</span>
                </div>
              </div>
            </div>

            {/* Row 2: Top Sources Leaderboard */}
            <div className="sources-leaderboard-section">
              <h3 className="sources-section-title">
                Top 10 Lead Sources
                {selectedConsultant !== 'all' && ` - ${getConsultants().find(c => c.id === selectedConsultant)?.name}`}
              </h3>
              <div className="sources-leaderboard">
                {topSources.map((source, idx) => {
                  const percentage = (source.count / maxLeadCount) * 100;
                  const totalPercentage = ((source.count / kpiMetrics.totalLeads) * 100).toFixed(1);
                  
                  return (
                    <div key={idx} className="sources-leaderboard-row">
                      <div className="sources-leaderboard-rank">
                        <span className={`sources-rank-badge ${idx < 3 ? 'top-three' : ''}`}>
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="sources-leaderboard-info">
                        <span className="sources-leaderboard-name" title={source.source}>
                          {source.source}
                        </span>
                        <span className={`sources-type-badge ${source.type.toLowerCase()}`}>
                          {source.type}
                        </span>
                      </div>
                      <div className="sources-leaderboard-bar-wrapper">
                        <div 
                          className="sources-leaderboard-bar"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="sources-leaderboard-stats">
                        <span className="sources-leaderboard-count">{source.count}</span>
                        <span className="sources-leaderboard-pct">{totalPercentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Source Efficiency Charts */}
            <div className="sources-charts-row">
              {/* Volume Bar Chart */}
              <div className="sources-chart-card sources-chart-large">
                <h3 className="sources-section-title">Source Volume Comparison</h3>
                <div className="sources-chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={volumeChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={120} 
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="leads" 
                        radius={[0, 4, 4, 0]}
                        fill="#3182ce"
                      >
                        {volumeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SOURCE_TYPE_COLORS[entry.type]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Source Type Donut */}
              <div className="sources-chart-card sources-chart-small">
                <h3 className="sources-section-title">Source Type Breakdown</h3>
                <div className="sources-chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sourceTypeBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {sourceTypeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value.toLocaleString()} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="sources-type-legend">
                  {sourceTypeBreakdown.map((type, idx) => (
                    <div key={idx} className="sources-type-item">
                      <span className="sources-type-dot" style={{ background: type.color }} />
                      <span className="sources-type-name">{type.name}</span>
                      <span className="sources-type-count">{type.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 4: Master Source Table */}
            <div className="sources-table-section">
              <div className="sources-table-header">
                <h3 className="sources-section-title">All Sources</h3>
                <div className="sources-search-wrapper">
                  <Search size={18} className="sources-search-icon" />
                  <input
                    type="text"
                    placeholder="Search sources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="sources-search-input"
                  />
                </div>
              </div>
              
              <div className="sources-table-wrapper">
                <table className="sources-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('source')} className="sortable">
                        Source <ArrowUpDown size={14} />
                      </th>
                      <th onClick={() => handleSort('type')} className="sortable">
                        Type <ArrowUpDown size={14} />
                      </th>
                      <th onClick={() => handleSort('count')} className="sortable sources-count-header">
                        Leads <ArrowUpDown size={14} />
                      </th>
                      <th className="sources-bar-header">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="sources-no-data">
                          No sources found matching "{searchTerm}"
                        </td>
                      </tr>
                    ) : (
                      tableData.map((item, idx) => {
                        const barPercentage = (item.count / maxLeadCount) * 100;
                        return (
                          <tr key={idx}>
                            <td className="sources-name">{item.source}</td>
                            <td>
                              <span className={`sources-type-badge ${item.type.toLowerCase()}`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="sources-count">{item.count}</td>
                            <td className="sources-bar-cell">
                              <div className="sources-mini-bar-wrapper">
                                <div 
                                  className="sources-mini-bar" 
                                  style={{ 
                                    width: `${barPercentage}%`,
                                    background: SOURCE_TYPE_COLORS[item.type]
                                  }} 
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="sources-table-footer">
                Showing {tableData.length} of {getAggregatedSources.length} sources
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Sources;