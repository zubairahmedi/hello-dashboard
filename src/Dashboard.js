import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import DataViewer from './DataViewer';
import ConsultantSelector from './components/Consultants/ConsultantSelector';
import exportNodeAsPdf from './utils/pdfExport';
import { 
  initDB, 
  saveData, 
  getData, 
  getDataFreshnessMessage 
} from './utils/indexedDbService';
import MetaAds from './components/MetaAds/MetaAds';

const CACHE_KEY = 'dashboardData';

function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('totals');
  const [data, setData] = useState(null); // full data object { totals, consultants }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataFreshness, setDataFreshness] = useState(null); // Track data freshness
  const [isCached, setIsCached] = useState(false); // Track if data is from cache

  // Initialize IndexedDB on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        // Try to load cached data first
        await loadCachedData();
      } catch (err) {
        console.error('Failed to initialize IndexedDB:', err);
      }
    };
    initialize();
  }, []);

  // Load data from cache
  const loadCachedData = async () => {
    try {
      const cached = await getData(CACHE_KEY);
      if (cached) {
        setData(cached.data);
        setIsCached(true);
        setDataFreshness(getDataFreshnessMessage(cached.savedAt));
        console.log('Data loaded from cache');
        return true;
      }
    } catch (err) {
      console.error('Error loading cached data:', err);
    }
    return false;
  };

  // Fetch data function - works from any tab
  const fetchData = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://n8n.aiclinicgenius.com/webhook/airtable');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const json = await response.json();
      
      // Save to IndexedDB
      await saveData(CACHE_KEY, json);
      
      setData(json);
      setIsCached(false);
      setDataFreshness('Live (just now)');
      console.log('Data fetched and cached:', json);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
      
      // If fetch fails, fall back to cached data if available
      if (!forceRefresh) {
        const hasCached = await loadCachedData();
        if (!hasCached) {
          setError(err.message + ' (and no cached data available)');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData(true); // Force refresh ignoring cache
    // ℹ️ NOTE: This refresh button only refreshes MAIN DASHBOARD DATA from Airtable webhook
    // Monthly data has its own SEPARATE refresh button on the consultant detail page
    // This keeps the two data sources independent and prevents response mixing
  };

  return (
    <div id="dashboard-root" className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-left">
          <h2>Franchise Experts</h2>
          {dataFreshness && (
            <span className="data-freshness" title={isCached ? 'Data from browser cache' : 'Live data from webhook'}>
              {dataFreshness}
            </span>
          )}
        </div>
        <div className="nav-buttons">
          <button
            onClick={() => setActiveTab('totals')}
            className={activeTab === 'totals' ? 'active-tab' : ''}
          >
            Totals
          </button>
          <button
            onClick={() => setActiveTab('consultants')}
            className={activeTab === 'consultants' ? 'active-tab' : ''}
          >
            Consultants
          </button>
          <button
            onClick={() => setActiveTab('metaAds')}
            className={activeTab === 'metaAds' ? 'active-tab' : ''}
          >
            Meta Ads
          </button>

          <button 
            onClick={handleRefresh}
            className="refresh-button"
            title="Fetch fresh data from webhook"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>

          {activeTab === 'totals' && (
            <button
              id="export-dashboard-pdf"
              onClick={() => exportNodeAsPdf('dashboard-root', { filename: 'dashboard-report.pdf' })}
              className="export-button"
              title="Export dashboard as PDF"
            >
              Export PDF
            </button>
          )}

          <button onClick={onLogout} className="logout-button">
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        {activeTab === 'totals' && (
          <div className="data-viewer">
            <DataViewer
              data={data}
              loading={loading}
              error={error}
            />
          </div>
        )}

        {activeTab === 'consultants' && (
          <div>
            {data && data.consultants && data.consultants.length > 0 ? (
              <ConsultantSelector data={data.consultants} />
            ) : (
              <p>Loading consultants data…</p>
            )}
          </div>
        )}

        {activeTab === 'metaAds' && (
          <MetaAds />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
