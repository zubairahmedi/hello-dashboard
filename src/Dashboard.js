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
import Sources from './components/Sources/Sources';
import GoogleAds from './components/GoogleAds/GoogleAds';

const CACHE_KEY = 'dashboardData';

function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('totals');
  const [data, setData] = useState(null); // full data object { totals, consultants }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataFreshness, setDataFreshness] = useState(null); // Track data freshness
  const [isCached, setIsCached] = useState(false); // Track if data is from cache
  const [menuOpen, setMenuOpen] = useState(false);

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

  const selectTab = (tab) => {
    setActiveTab(tab);
    setMenuOpen(false);
  };

  const handleRefreshAndClose = () => {
    setMenuOpen(false);
    handleRefresh();
  };

  const handleLogout = () => {
    setMenuOpen(false);
    onLogout();
  };

  return (
    <div id="dashboard-root" className="dashboard-container">
      <nav className="dashboard-nav pdf-hide">
        <div className="nav-left">
          <h2>Franchise Experts</h2>
          {dataFreshness && (
            <span className="data-freshness" title={isCached ? 'Data from browser cache' : 'Live data from webhook'}>
              {dataFreshness}
            </span>
          )}
        </div>
        <div className="nav-dropdown">
          <button
            className="nav-dropdown-trigger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            ☰ Menu
          </button>
          {menuOpen && (
            <div className="nav-dropdown-menu" role="menu">
              <button
                role="menuitem"
                className={`nav-dropdown-item ${activeTab === 'totals' ? 'active' : ''}`}
                onClick={() => selectTab('totals')}
              >
                Totals
              </button>
              <button
                role="menuitem"
                className={`nav-dropdown-item ${activeTab === 'consultants' ? 'active' : ''}`}
                onClick={() => selectTab('consultants')}
              >
                Consultants
              </button>
              <button
                role="menuitem"
                className={`nav-dropdown-item ${activeTab === 'metaAds' ? 'active' : ''}`}
                onClick={() => selectTab('metaAds')}
              >
                Meta Ads
              </button>
              <button
                role="menuitem"
                className={`nav-dropdown-item ${activeTab === 'googleAds' ? 'active' : ''}`}
                onClick={() => selectTab('googleAds')}
              >
                Google Ads
              </button>
              <button
                role="menuitem"
                className={`nav-dropdown-item ${activeTab === 'sources' ? 'active' : ''}`}
                onClick={() => selectTab('sources')}
              >
                Sources
              </button>

              <div className="nav-dropdown-divider" />

              <button
                role="menuitem"
                className="nav-dropdown-item"
                onClick={handleRefreshAndClose}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>

              {activeTab === 'totals' && (
                <button
                  role="menuitem"
                  className="nav-dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    exportNodeAsPdf('dashboard-root', { filename: 'dashboard-report.pdf' });
                  }}
                >
                  Export Dashboard PDF
                </button>
              )}

              {activeTab === 'metaAds' && (
                <button
                  role="menuitem"
                  className="nav-dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    exportNodeAsPdf('meta-ads-root', { filename: 'meta-ads-report.pdf' });
                  }}
                >
                  Export Meta Ads PDF
                </button>
              )}

              <div className="nav-dropdown-divider" />

              <button
                role="menuitem"
                className="nav-dropdown-item logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
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

        {activeTab === 'googleAds' && (
          <GoogleAds />
        )}

        {activeTab === 'sources' && (
          <Sources />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
