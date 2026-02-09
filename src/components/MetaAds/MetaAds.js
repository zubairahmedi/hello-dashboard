import React, { useEffect, useState, useCallback } from 'react';
import '../../AnalyticsDashboard.css';
import '../../Dashboard.css';
import './MetaAdsAccountView.css';
import MetaAdsAccountView from './MetaAdsAccountView';
import MonthComparison from './MonthComparison';
import YearlyView from './YearlyView';
import OverviewView from './OverviewView';
import ConsultantMetaAdsView from './ConsultantMetaAdsView';
import {
  initDB,
  getData,
  saveData,
  getDataFreshnessMessage
} from '../../utils/indexedDbService';
import {
  fetchAllCampaigns,
  fetchDeltaMetaAds,
  mergeMetaAdsData,
  META_ADS_FULL_KEY,
  META_ADS_MERGED_KEY,
  isDeltaConfigured
} from '../../utils/metaAdsService';
import { buildMonthOptions, filterRowsByMonth } from '../../utils/timeFilterService';
import {
  fetchConsultantMetaAds,
  CONSULTANT_META_ADS_KEY
} from '../../utils/consultantMetaAdsService';

// Campaigns are now dynamic, generated from data

function MetaAds({ onRefreshTrigger = 0 }) {
  const [mergedData, setMergedData] = useState(null);
  const [dataFreshness, setDataFreshness] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [hardLoading, setHardLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [loadProgress, setLoadProgress] = useState(0); // 0-100 percentage
  const [selectedCampaign, setSelectedCampaign] = useState('All Campaigns');
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [mainViewMode, setMainViewMode] = useState('accounts'); // 'accounts' or 'consultants'
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'yearly'
  const [consultantData, setConsultantData] = useState(null);
  const [consultantLoading, setConsultantLoading] = useState(false);
  const [consultantDataFreshness, setConsultantDataFreshness] = useState(null);

  // Load cached merged data on mount and run a quick delta update
  useEffect(() => {
    const bootstrap = async () => {
      try {
        console.log('[MetaAds] Bootstrap starting...');
        await initDB();
        console.log('[MetaAds] IndexedDB initialized');
        const hasCached = await loadCachedMerged();
        console.log('[MetaAds] Cache check complete:', { hasCached });
        if (isDeltaConfigured()) {
          await handleQuickUpdate();
        }
      } catch (err) {
        console.error('Meta Ads init failed', err);
        setError(err.message);
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCachedMerged = useCallback(async () => {
    try {
      const cached = await getData(META_ADS_MERGED_KEY);
      console.log('[MetaAds] Raw cached object:', cached);
      if (cached) {
        // Handle nested data structure from IndexedDB
        const actualData = cached.data?.data || cached.data || cached;
        console.log('[MetaAds] Loading cached data:', { 
          hasCached: !!cached, 
          dataLength: Array.isArray(actualData) ? actualData.length : 'not an array',
          actualData: actualData
        });
        setMergedData(actualData);
        setDataFreshness(getDataFreshnessMessage(cached.savedAt));
        setIsCached(true);
        setStatus('');
        return true;
      } else {
        console.log('[MetaAds] No cached data found');
      }
    } catch (err) {
      console.error('Meta Ads cache read failed', err);
    }
    return false;
  }, []);

  const handleQuickUpdate = useCallback(async () => {
    if (!isDeltaConfigured()) {
      return;
    }
    setQuickLoading(true);
    setError(null);
    setStatus('');

    try {
      const baseFull = await getData(META_ADS_FULL_KEY);
      const delta = await fetchDeltaMetaAds();
      const baseData = baseFull?.data?.data || baseFull?.data || [];
      const merged = mergeMetaAdsData(baseData, delta.data);

      const payload = { data: merged, lastUpdated: delta.lastUpdated || Date.now() };
      await saveData(META_ADS_MERGED_KEY, payload);

      setMergedData(merged);
      setDataFreshness(getDataFreshnessMessage(Date.now()));
      setIsCached(false);
      setStatus('');
    } catch (err) {
      console.error('Meta Ads quick update failed', err);
      setError(err.message);
      setStatus('');
      await loadCachedMerged();
    } finally {
      setQuickLoading(false);
    }
  }, [loadCachedMerged]);

  const handleHardRefresh = useCallback(async () => {
    setHardLoading(true);
    setError(null);
    setStatus(''); // Clear status during fetch

    try {
      // Fetch all campaigns from single webhook
      setStatus('Loading campaigns...');
      setLoadProgress(50);
      
      const result = await fetchAllCampaigns();
      const combinedData = result.data ?? [];
      setLoadProgress(100);

      const payload = { data: combinedData, lastUpdated: Date.now() };
      console.log('[MetaAds] Saving combined dataset:', { length: Array.isArray(combinedData) ? combinedData.length : 'not an array' });
      await saveData(META_ADS_FULL_KEY, payload);
      await saveData(META_ADS_MERGED_KEY, payload);

      setMergedData(combinedData);
      setDataFreshness(getDataFreshnessMessage(Date.now()));
      setIsCached(false);
      setStatus(''); // Clear status after successful fetch
    } catch (err) {
      console.error('Meta Ads hard refresh failed', err);
      setError(`${err.message}`);
      setStatus('');
      await loadCachedMerged();
    } finally {
      setHardLoading(false);
    }
  }, [loadCachedMerged]);

  // Listen for refresh trigger from Dashboard
  useEffect(() => {
    if (onRefreshTrigger > 0) {
      console.log('[MetaAds] Refresh triggered from Dashboard');
      handleHardRefresh();
    }
  }, [onRefreshTrigger, handleHardRefresh]);

  const handleConsultantRefresh = useCallback(async () => {
    setConsultantLoading(true);
    setError(null);

    try {
      console.log('[MetaAds] Fetching consultant meta ads data...');
      const result = await fetchConsultantMetaAds();
      
      // Save to IndexedDB
      const payload = { data: result.data, lastUpdated: result.lastUpdated };
      await saveData(CONSULTANT_META_ADS_KEY, payload);
      
      setConsultantData(result.data);
      setConsultantDataFreshness(getDataFreshnessMessage(result.lastUpdated));
    } catch (err) {
      console.error('[MetaAds] Consultant data fetch failed:', err);
      setError(`Failed to fetch consultant data: ${err.message}`);
      
      // Try to load from cache on error
      try {
        const cached = await getData(CONSULTANT_META_ADS_KEY);
        if (cached) {
          const actualData = cached.data?.data || cached.data || cached;
          setConsultantData(actualData);
          setConsultantDataFreshness(getDataFreshnessMessage(cached.savedAt));
        }
      } catch (cacheErr) {
        console.error('[MetaAds] Cache read failed:', cacheErr);
      }
    } finally {
      setConsultantLoading(false);
    }
  }, []);

  // Load consultant data from cache when switching to consultants view
  useEffect(() => {
    if (mainViewMode === 'consultants' && !consultantData) {
      const loadConsultantCache = async () => {
        try {
          const cached = await getData(CONSULTANT_META_ADS_KEY);
          if (cached) {
            const actualData = cached.data?.data || cached.data || cached;
            setConsultantData(actualData);
            setConsultantDataFreshness(getDataFreshnessMessage(cached.savedAt));
          } else {
            // Auto-fetch if no cache exists
            await handleConsultantRefresh();
          }
        } catch (err) {
          console.error('[MetaAds] Failed to load consultant cache:', err);
        }
      };
      loadConsultantCache();
    }
  }, [mainViewMode, consultantData, handleConsultantRefresh]);

  const dataArray = Array.isArray(mergedData) ? mergedData : [];
  
  // Generate dynamic campaign tabs from data
  const campaignTabs = React.useMemo(() => {
    if (!dataArray || dataArray.length === 0) return ['All Campaigns'];
    const unique = new Set(dataArray.map(r => r.campaignname).filter(Boolean));
    return ['All Campaigns', ...Array.from(unique).sort()];
  }, [dataArray]);
  
  // Debug logging
  console.log('[MetaAds] Data state:', { 
    mergedData: mergedData ? 'exists' : 'null', 
    dataArrayLength: dataArray.length,
    selectedCampaign,
    campaignTabs
  });

  const monthOptions = React.useMemo(() => buildMonthOptions(dataArray), [dataArray]);

  useEffect(() => {
    if (!selectedMonthKey && monthOptions.length > 0) {
      setSelectedMonthKey(monthOptions[0].key);
    }
  }, [monthOptions, selectedMonthKey]);

  // All data for the selected campaign (no month filter)
  const campaignData = React.useMemo(() => {
    let rows = dataArray;
    if (selectedCampaign && selectedCampaign !== 'All Campaigns') {
      rows = rows.filter((row) => row?.campaignname === selectedCampaign);
    }
    console.log('[MetaAds] campaignData computed:', { selectedCampaign, totalRows: rows.length, rows });
    return rows;
  }, [dataArray, selectedCampaign]);

  const filteredData = React.useMemo(() => {
    let rows = dataArray;
    if (selectedCampaign && selectedCampaign !== 'All Campaigns') {
      rows = rows.filter((row) => row?.campaignname === selectedCampaign);
    }
    const monthMeta = monthOptions.find((m) => m.key === selectedMonthKey);
    rows = filterRowsByMonth(rows, monthMeta);
    return [...rows].sort((a, b) => {
      const aY = Number(a?.year) || 0;
      const bY = Number(b?.year) || 0;
      if (bY !== aY) return bY - aY;
      const aM = Number(a?.month_index) || (a?.month_name ? 0 : 0);
      const bM = Number(b?.month_index) || (b?.month_name ? 0 : 0);
      return (bM || 0) - (aM || 0);
    });
  }, [dataArray, selectedCampaign, selectedMonthKey, monthOptions]);

  return (
    <div id="meta-ads-root" className="meta-ads-page">
      <div className="meta-ads-header pdf-hide">
        <div>
          <h2>Meta Ads</h2>
          <p className="meta-ads-subtitle">Showing monthly data per campaign</p>
        </div>
        {mainViewMode === 'accounts' && (
          <div className="meta-ads-actions">
            {dataFreshness && (
              <span
                className="data-freshness"
                title={isCached ? 'Data from browser cache' : 'Live Meta Ads data'}
              >
                {dataFreshness}
              </span>
            )}
          </div>
        )}
      </div>

      {status && <div className="meta-ads-status">{status}</div>}
      {loadProgress > 0 && loadProgress < 100 && (
        <div style={{ margin: '12px 0', padding: '8px', background: '#f0f9ff', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#0369a1' }}>
            Loading Meta Ads Data: {loadProgress}%
          </div>
          <div style={{ width: '100%', height: '6px', background: '#e0f2fe', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${loadProgress}%`, height: '100%', background: '#0284c7', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}
      {error && <div className="meta-ads-error">{error}</div>}

      {/* Main View Switcher */}
      <div className="period-selector" style={{ marginBottom: '1.5rem', background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`period-btn ${mainViewMode === 'accounts' ? 'active' : ''}`}
            onClick={() => setMainViewMode('accounts')}
          >
            Accounts View
          </button>
          <button
            className={`period-btn ${mainViewMode === 'consultants' ? 'active' : ''}`}
            onClick={() => setMainViewMode('consultants')}
          >
            Consultants View
          </button>
        </div>
        {mainViewMode === 'consultants' && (
          <button
            className="consultant-refresh-btn"
            onClick={handleConsultantRefresh}
            disabled={consultantLoading}
            title="Refresh consultant data"
          >
            {consultantLoading ? 'Loading...' : 'Refresh'}
          </button>
        )}
      </div>

      <div className="meta-ads-content">
        {mainViewMode === 'accounts' ? (
          <>
            <div className="dashboard-header" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.5rem', color: '#1e293b' }}>Meta Ads Performance</h3>
            </div>
            {!mergedData && <p className="muted">No Meta Ads data loaded yet. Click "Refresh Data" to fetch.</p>}

        {/* Campaign dropdown */}
        <div className="meta-ads-filters pdf-hide" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="meta-ads-month-filter">
              <label htmlFor="meta-ads-campaign" style={{ fontWeight: 600, marginRight: '0.5rem' }}>Campaign:</label>
              <select
                id="meta-ads-campaign"
                value={selectedCampaign || 'All Campaigns'}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                style={{ minWidth: '250px' }}
              >
                {campaignTabs.map((campaign) => (
                  <option key={campaign} value={campaign}>{campaign}</option>
                ))}
              </select>
            </div>

            {monthOptions.length > 0 && viewMode === 'monthly' && selectedCampaign !== 'All Campaigns' && (
              <div className="meta-ads-month-filter">
                <label htmlFor="meta-ads-month" style={{ fontWeight: 600, marginRight: '0.5rem' }}>Month:</label>
                <select
                  id="meta-ads-month"
                  value={selectedMonthKey || ''}
                  onChange={(e) => setSelectedMonthKey(e.target.value)}
                >
                  {monthOptions.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Display campaign view based on selected tab */}
        {selectedCampaign && selectedCampaign !== 'All Campaigns' ? (
          (() => {
            const monthMeta = monthOptions.find((m) => m.key === selectedMonthKey);
            console.log('[MetaAds] Rendering view with:', { selectedCampaign, viewMode, selectedMonthKey, monthMeta, dataLength: filteredData?.length });
            return (
              <>
                {/* Mini Tab Switcher */}
                <div className="view-mode-switcher">
                  <button
                    className={`view-mode-btn ${viewMode === 'monthly' ? 'active' : ''}`}
                    onClick={() => setViewMode('monthly')}
                  >
                    Monthly View
                  </button>
                  <button
                    className={`view-mode-btn ${viewMode === 'yearly' ? 'active' : ''}`}
                    onClick={() => setViewMode('yearly')}
                  >
                    Yearly Data
                  </button>
                </div>

                {viewMode === 'monthly' ? (
                  <>
                    <MetaAdsAccountView data={filteredData} accountName={selectedCampaign} />
                    <MonthComparison data={campaignData} accountName={selectedCampaign} monthOptions={monthOptions} />
                  </>
                ) : (
                  <YearlyView data={campaignData} accountName={selectedCampaign} />
                )}
              </>
            );
          })()
        ) : (
          <OverviewView data={dataArray} />
        )}

        {/* Raw data preview removed per request */}
          </>
        ) : (
          <ConsultantMetaAdsView data={consultantData} />
        )}
      </div>
    </div>
  );
}

export default MetaAds;
