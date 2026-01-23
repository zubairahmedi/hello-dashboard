import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import '../../Dashboard.css';

const GOOGLE_ADS_WEBHOOK = process.env.REACT_APP_GOOGLE_ADS_WEBHOOK || 'https://n8n.aiclinicgenius.com/webhook/Google_Ads';

const TIMEWINDOW_OPTIONS = [
  'Last 7 days',
  'Last 30 days',
  'Last 2 months',
  'Last 6 months',
  'Last 1 year',
  'Last 2 years',
  'Last 3 years'
];

const METRIC_TIPS = {
  impressions: 'Impressions: number of impressions (count)',
  clicks: 'Clicks: number of clicks (count)',
  conversions: 'Conversions: number of conversions (count)',
  ctr: 'CTR: Click-Through Rate = (clicks / impressions) × 100 (%)',
  conversion_rate: 'Conversion Rate: conversions per interactions × 100 (%)',
  cvr: 'CVR: conversions per clicks × 100 (%)',
  cost: 'Cost: total spend ($)',
  avg_cpc: 'Avg CPC: average cost per click ($)',
  cpa: 'CPA: cost per acquisition/conversion ($)',
  cpm: 'CPM: cost per 1000 impressions ($)'
};

const CHART_COLORS = ['#4f46e5', '#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#a855f7', '#0ea5e9', '#6366f1'];

const renderMetricLabel = (key, label) => (
  <abbr className="metric-abbr" title={METRIC_TIPS[key] || label}>
    {label}
  </abbr>
);

const FALLBACK_DATA = [
  {
    campaign_name: 'PMax - Home Services',
    status: 'PAUSED',
    channel: 'PERFORMANCE_MAX',
    bidding_strategy: 'MAXIMIZE_CONVERSIONS',
    impressions: 532,
    clicks: 46,
    conversions: 23,
    ctr: 8.65,
    conversion_rate: 50,
    cost: 178.63,
    avg_cpc: 3.88,
    cpa: 7.77,
    cpm: 335.77,
    cvr: 50,
    timewindow: 'Last 7 days',
    id: 'ecc752ef-abcb-4b2c-b813-e8956f634f56'
  },
  {
    campaign_name: 'PMax - Home Services New LP',
    status: 'PAUSED',
    channel: 'PERFORMANCE_MAX',
    bidding_strategy: 'MAXIMIZE_CONVERSIONS',
    impressions: 20154,
    clicks: 47,
    conversions: 4,
    ctr: 0.23,
    conversion_rate: 8.51,
    cost: 170.54,
    avg_cpc: 3.63,
    cpa: 42.63,
    cpm: 8.46,
    cvr: 8.51,
    timewindow: 'Last 7 days',
    id: 'ca84c451-0c91-490b-90da-241f31e10431'
  },
  {
    campaign_name: 'PMax - Home Services',
    status: 'PAUSED',
    channel: 'PERFORMANCE_MAX',
    bidding_strategy: 'MAXIMIZE_CONVERSIONS',
    impressions: 1183,
    clicks: 187,
    conversions: 102,
    ctr: 15.81,
    conversion_rate: 54.55,
    cost: 709.5,
    avg_cpc: 3.79,
    cpa: 6.96,
    cpm: 599.75,
    cvr: 54.55,
    timewindow: 'Last 30 days',
    id: '3db328e6-2a97-4c16-9314-58bec523fe37'
  },
  {
    campaign_name: 'PMax - Home Services New LP',
    status: 'PAUSED',
    channel: 'PERFORMANCE_MAX',
    bidding_strategy: 'MAXIMIZE_CONVERSIONS',
    impressions: 74234,
    clicks: 286,
    conversions: 11,
    ctr: 0.39,
    conversion_rate: 3.85,
    cost: 731.1,
    avg_cpc: 2.56,
    cpa: 66.46,
    cpm: 9.85,
    cvr: 3.85,
    timewindow: 'Last 30 days',
    id: 'edbd7849-3fac-4e60-929c-f0a655e227f1'
  },
  {
    campaign_name: 'PMax - Home Services',
    status: 'PAUSED',
    channel: 'PERFORMANCE_MAX',
    bidding_strategy: 'MAXIMIZE_CONVERSIONS',
    impressions: 3001,
    clicks: 514,
    conversions: 232,
    ctr: 17.13,
    conversion_rate: 45.14,
    cost: 1546.05,
    avg_cpc: 3.01,
    cpa: 6.66,
    cpm: 515.18,
    cvr: 45.14,
    timewindow: 'Last 2 months',
    id: 'b37b5af4-c93d-431f-95f8-5bf77e9e62ef'
  }
];

function aggregateMetrics(rows) {
  const totals = rows.reduce(
    (acc, row) => {
      acc.impressions += Number(row.impressions) || 0;
      acc.clicks += Number(row.clicks) || 0;
      acc.conversions += Number(row.conversions) || 0;
      acc.cost += Number(row.cost) || 0;
      return acc;
    },
    { impressions: 0, clicks: 0, conversions: 0, cost: 0 }
  );

  const ctr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0;
  const cvr = totals.clicks ? (totals.conversions / totals.clicks) * 100 : 0;
  const avgCpc = totals.clicks ? totals.cost / totals.clicks : 0;
  const cpa = totals.conversions ? totals.cost / totals.conversions : 0;
  const cpm = totals.impressions ? (totals.cost / totals.impressions) * 1000 : 0;

  return {
    ...totals,
    ctr,
    conversion_rate: cvr,
    cvr,
    avg_cpc: avgCpc,
    cpa,
    cpm
  };
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatMoney(value) {
  if (!value && value !== 0) return '-';
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value) {
  if (!value && value !== 0) return '-';
  return `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function GoogleAds() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeView, setActiveView] = useState('account'); // 'account' | 'campaign'
  const [selectedTimewindow, setSelectedTimewindow] = useState(TIMEWINDOW_OPTIONS[0]);
  const [selectedCampaign, setSelectedCampaign] = useState('All Campaigns');
  const [showConvChart, setShowConvChart] = useState(true);
  const [showSpendChart, setShowSpendChart] = useState(true);
  const [showPieLegend, setShowPieLegend] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(GOOGLE_ADS_WEBHOOK);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      const list = Array.isArray(json) ? json : [];
      setRows(list);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[GoogleAds] Fetch failed, using fallback data', err);
      setError(`Failed to fetch Google Ads data: ${err.message}. Showing fallback sample.`);
      setRows(FALLBACK_DATA);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const campaignOptions = useMemo(() => {
    const unique = new Set(rows.map((r) => r.campaign_name));
    return ['All Campaigns', ...Array.from(unique)];
  }, [rows]);

  const timeFilteredRows = useMemo(() => {
    if (!selectedTimewindow) return rows;
    return rows.filter((row) => row.timewindow === selectedTimewindow);
  }, [rows, selectedTimewindow]);

  const campaignFilteredRows = useMemo(() => {
    if (selectedCampaign === 'All Campaigns') return timeFilteredRows;
    return timeFilteredRows.filter((row) => row.campaign_name === selectedCampaign);
  }, [timeFilteredRows, selectedCampaign]);

  const accountTotals = useMemo(() => aggregateMetrics(timeFilteredRows), [timeFilteredRows]);

  const campaignTotals = useMemo(() => aggregateMetrics(campaignFilteredRows), [campaignFilteredRows]);

  const campaignAgg = useMemo(() => {
    const map = new Map();
    timeFilteredRows.forEach((row) => {
      const key = row.campaign_name || 'Unknown';
      const prev = map.get(key) || { campaign: key, conversions: 0, cost: 0 };
      prev.conversions += Number(row.conversions) || 0;
      prev.cost += Number(row.cost) || 0;
      map.set(key, prev);
    });
    const arr = Array.from(map.values());
    arr.sort((a, b) => b.conversions - a.conversions);
    return arr;
  }, [timeFilteredRows]);

  const maxConv = useMemo(() => Math.max(1, ...campaignAgg.map((c) => c.conversions || 0)), [campaignAgg]);
  const maxCost = useMemo(() => Math.max(1, ...campaignAgg.map((c) => c.cost || 0)), [campaignAgg]);

  const spendTotal = useMemo(
    () => campaignAgg.reduce((sum, c) => sum + (Number(c.cost) || 0), 0),
    [campaignAgg]
  );

  const pieSegments = useMemo(() => {
    if (!spendTotal) return [];
    return campaignAgg.map((c, idx) => ({
      name: c.campaign,
      value: Number(c.cost) || 0,
      fill: CHART_COLORS[idx % CHART_COLORS.length]
    }));
  }, [campaignAgg, spendTotal]);

  const cpaBarData = useMemo(() => {
    return campaignAgg.map((c) => {
      const conversions = Number(c.conversions) || 0;
      const cost = Number(c.cost) || 0;
      return {
        name: c.campaign,
        cpa: conversions ? cost / conversions : 0
      };
    });
  }, [campaignAgg]);

  const trendData = useMemo(() => {
    return TIMEWINDOW_OPTIONS.map((window) => {
      const scoped = rows.filter((r) => r.timewindow === window);
      const totals = aggregateMetrics(scoped);
      return {
        window,
        spend: totals.cost,
        ctr: totals.ctr,
        conversions: totals.conversions
      };
    });
  }, [rows]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return null;
    return lastUpdated.toLocaleString();
  }, [lastUpdated]);

  const renderTable = (tableRows) => {
    if (!tableRows.length) {
      return <p className="google-ads-note">No rows for the selected filters.</p>;
    }
    return (
      <div className="meta-ads-table google-ads-table">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Time</th>
                <th>Status</th>
                <th>Channel</th>
                <th>Strategy</th>
                <th>{renderMetricLabel('impressions', 'Impr')}</th>
                <th>{renderMetricLabel('clicks', 'Clicks')}</th>
                <th>{renderMetricLabel('conversions', 'Conv')}</th>
                <th>{renderMetricLabel('ctr', 'CTR')}</th>
                <th>{renderMetricLabel('cvr', 'CVR')}</th>
                <th>{renderMetricLabel('cost', 'Cost')}</th>
                <th>{renderMetricLabel('avg_cpc', 'Avg CPC')}</th>
                <th>{renderMetricLabel('cpa', 'CPA')}</th>
                <th>{renderMetricLabel('cpm', 'CPM')}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.campaign_name}</td>
                  <td>{row.timewindow}</td>
                  <td>{row.status}</td>
                  <td>{row.channel}</td>
                  <td>{row.bidding_strategy}</td>
                  <td>{formatNumber(row.impressions)}</td>
                  <td>{formatNumber(row.clicks)}</td>
                  <td>{formatNumber(row.conversions)}</td>
                  <td>{renderMetricLabel('ctr', formatPercent(row.ctr))}</td>
                  <td>{renderMetricLabel('cvr', formatPercent(row.cvr ?? row.conversion_rate))}</td>
                  <td>{renderMetricLabel('cost', formatMoney(row.cost))}</td>
                  <td>{renderMetricLabel('avg_cpc', formatMoney(row.avg_cpc))}</td>
                  <td>{renderMetricLabel('cpa', formatMoney(row.cpa))}</td>
                  <td>{renderMetricLabel('cpm', formatMoney(row.cpm))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="meta-ads-page google-ads-page">
      <div className="google-ads-header">
        <div>
          <h2>Google Ads</h2>
          <p className="google-ads-subtitle">Standalone Google Ads workspace with account and campaign views</p>
        </div>
        <div className="google-ads-pill">Live</div>
      </div>

      <div className="google-ads-controls">
        <div className="google-ads-view-toggle">
          <button
            className={`google-ads-view-btn ${activeView === 'account' ? 'active' : ''}`}
            onClick={() => setActiveView('account')}
          >
            Account View
          </button>
          <button
            className={`google-ads-view-btn ${activeView === 'campaign' ? 'active' : ''}`}
            onClick={() => setActiveView('campaign')}
          >
            Campaign View
          </button>
        </div>
        <div className="google-ads-actions">
          {lastUpdatedLabel && <span className="data-freshness">Updated {lastUpdatedLabel}</span>}
          <button className="refresh-button" onClick={fetchData} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="meta-ads-error">{error}</div>}

      <div className="google-ads-filters">
        <div className="google-ads-filter">
          <label htmlFor="ga-timewindow">Time Range</label>
          <select
            id="ga-timewindow"
            value={selectedTimewindow}
            onChange={(e) => setSelectedTimewindow(e.target.value)}
          >
            {TIMEWINDOW_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {activeView === 'campaign' && (
          <div className="google-ads-filter">
            <label htmlFor="ga-campaign">Campaign</label>
            <select
              id="ga-campaign"
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
            >
              {campaignOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeView === 'account' && (
        <>
          <div className="google-ads-card">
            <h3>Account Totals ({selectedTimewindow})</h3>
            <div className="google-ads-stats-grid">
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('impressions', 'Impressions')}</span>
                <strong>{formatNumber(accountTotals.impressions)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('clicks', 'Clicks')}</span>
                <strong>{formatNumber(accountTotals.clicks)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('conversions', 'Conversions')}</span>
                <strong>{formatNumber(accountTotals.conversions)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('cost', 'Spend')}</span>
                <strong>{formatMoney(accountTotals.cost)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('ctr', 'CTR')}</span>
                <strong>{formatPercent(accountTotals.ctr)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('cvr', 'CVR')}</span>
                <strong>{formatPercent(accountTotals.cvr)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('avg_cpc', 'Avg CPC')}</span>
                <strong>{formatMoney(accountTotals.avg_cpc)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('cpa', 'CPA')}</span>
                <strong>{formatMoney(accountTotals.cpa)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('cpm', 'CPM')}</span>
                <strong>{formatMoney(accountTotals.cpm)}</strong>
              </div>
            </div>
          </div>

          <div className="google-ads-card">
            <div className="table-header collapsible">
              <span>Campaign Conversions</span>
              <button
                className="collapse-btn"
                onClick={() => setShowConvChart((v) => !v)}
                aria-expanded={showConvChart}
              >
                {showConvChart ? 'Hide' : 'Show'}
              </button>
            </div>
            {showConvChart && (
              <div className="google-ads-chart">
                {campaignAgg.length === 0 && <p className="google-ads-note">No data for this time range.</p>}
                {campaignAgg.map((c) => (
                  <div key={c.campaign} className="google-ads-bar-row">
                    <div className="google-ads-bar-label">{c.campaign}</div>
                    <div className="google-ads-bar-track" aria-label={`${c.conversions} conversions`}>
                      <div
                        className="google-ads-bar-fill"
                        style={{ width: `${Math.min(100, (c.conversions / maxConv) * 100)}%` }}
                      />
                    </div>
                    <div className="google-ads-bar-value">{formatNumber(c.conversions)} conv</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="google-ads-card">
            <div className="table-header">Campaign Breakdown</div>
            {renderTable(timeFilteredRows)}
          </div>

          <div className="google-ads-card google-ads-bottom-charts">
            <div className="google-ads-bottom-grid">
              <div className="google-ads-bottom-chart">
                <div className="table-header collapsible">
                  <span>Spend Share (Pie)</span>
                  <button
                    className="collapse-btn"
                    onClick={() => setShowPieLegend((v) => !v)}
                    aria-expanded={showPieLegend}
                  >
                    {showPieLegend ? 'Hide Legend' : 'Show Legend'}
                  </button>
                </div>
                {pieSegments.length === 0 ? (
                  <p className="google-ads-note">No spend data for this range.</p>
                ) : (
                  <div className="google-ads-pie-wrap">
                    <ResponsiveContainer width="220" height="220">
                      <PieChart>
                        <Pie
                          dataKey="value"
                          data={pieSegments}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={45}
                          paddingAngle={2}
                        >
                          {pieSegments.map((entry, index) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => formatMoney(val)} />
                      </PieChart>
                    </ResponsiveContainer>
                    {showPieLegend && (
                      <div className="google-ads-legend legend-scroll">
                        {pieSegments.map((seg) => {
                          const pct = spendTotal ? ((seg.value / spendTotal) * 100).toFixed(1) : '0.0';
                          return (
                            <div key={seg.name} className="legend-row">
                              <span className="legend-swatch" style={{ background: seg.fill }} />
                              <span className="legend-label">{seg.name}</span>
                              <span className="legend-value">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="google-ads-bottom-chart">
                <div className="table-header">Spend, CTR, Conversions (3yr trend)</div>
                {trendData.every((d) => !d.spend && !d.conversions) ? (
                  <p className="google-ads-note">No trend data available.</p>
                ) : (
                  <div style={{ width: '100%', height: 320, maxWidth: '700px', margin: '0 auto' }}>
                    <ResponsiveContainer>
                      <ComposedChart data={trendData} margin={{ top: 12, right: 24, left: 12, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="window" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          tick={{ fontSize: 10 }}
                          interval={0}
                        />
                        <YAxis yAxisId="left" scale="log" domain={['auto', 'auto']} tickFormatter={(v) => formatNumber(v)} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v.toFixed(1)}%`} />
                        <Tooltip
                          formatter={(value, name) => {
                            if (name === 'Spend') return formatMoney(value);
                            if (name === 'CTR') return `${Number(value).toFixed(2)}%`;
                            if (name === 'Conversions') return formatNumber(value);
                            return value;
                          }}
                          labelFormatter={(label) => `Time Window: ${label}`}
                        />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="spend"
                          name="Spend"
                          barSize={18}
                          fill="#4f46e5"
                          radius={[6, 6, 6, 6]}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="ctr"
                          name="CTR"
                          stroke="#06b6d4"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="conversions"
                          name="Conversions"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeView === 'campaign' && (
        <>
          <div className="google-ads-card">
            <h3>Campaign Metrics: {selectedCampaign} ({selectedTimewindow})</h3>
            <div className="google-ads-stats-grid">
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('impressions', 'Impressions')}</span>
                <strong>{formatNumber(campaignTotals.impressions)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('clicks', 'Clicks')}</span>
                <strong>{formatNumber(campaignTotals.clicks)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('conversions', 'Conversions')}</span>
                <strong>{formatNumber(campaignTotals.conversions)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('cost', 'Spend')}</span>
                <strong>{formatMoney(campaignTotals.cost)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('ctr', 'CTR')}</span>
                <strong>{formatPercent(campaignTotals.ctr)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('cvr', 'CVR')}</span>
                <strong>{formatPercent(campaignTotals.cvr)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('avg_cpc', 'Avg CPC')}</span>
                <strong>{formatMoney(campaignTotals.avg_cpc)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('cpa', 'CPA')}</span>
                <strong>{formatMoney(campaignTotals.cpa)}</strong>
              </div>
              <div className="google-ads-stat-card">
                <span className="label">{renderMetricLabel('cpm', 'CPM')}</span>
                <strong>{formatMoney(campaignTotals.cpm)}</strong>
              </div>
            </div>
          </div>

          <div className="google-ads-card">
            <div className="table-header">Campaign Details</div>
            {renderTable(campaignFilteredRows)}
          </div>
        </>
      )}
    </div>
  );
}

export default GoogleAds;
