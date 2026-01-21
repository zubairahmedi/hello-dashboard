import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  Users, 
  Megaphone, 
  Database, 
  RefreshCw, 
  Download, 
  LogOut,
  LayoutDashboard,
  Menu,
  X
} from 'lucide-react';
import './Dashboard.css';
import './NewLayout.css';
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
import API_CONFIG from './config/apiConfig';

const CACHE_KEY = 'dashboardData';

function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('totals');
  const [data, setData] = useState(null); // full data object { totals, consultants }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataFreshness, setDataFreshness] = useState(null); // Track data freshness
  const [isCached, setIsCached] = useState(false); // Track if data is from cache
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      const response = await fetch(API_CONFIG.AIRTABLE_WEBHOOK);
      
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
  };

  const handleExport = () => {
    if (activeTab === 'totals') {
      exportNodeAsPdf('dashboard-root', { filename: 'dashboard-report.pdf' });
    } else if (activeTab === 'metaAds') {
      exportNodeAsPdf('meta-ads-root', { filename: 'meta-ads-report.pdf' });
    } else if (activeTab === 'sources') {
      exportNodeAsPdf('sources-root', { filename: 'sources-report.pdf' });
    }
    // Note: Consultants page has its own export in ConsultantHeader
  };

  return (
    <div id="dashboard-root" className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className={`sidebar pdf-hide ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="brand-text">
              <span style={{color: '#2c5282'}}>Franchise</span>
              <span style={{color: '#ed8936'}}>Experts</span>
            </span>
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
        
        <div className="nav-section">
          <button 
            className={`nav-item ${activeTab === 'totals' ? 'active' : ''}`}
            onClick={() => setActiveTab('totals')}
            title="Analytics"
          >
            <BarChart2 size={20} />
            {!sidebarCollapsed && <span>Analytics</span>}
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'consultants' ? 'active' : ''}`}
            onClick={() => setActiveTab('consultants')}
            title="Consultants"
          >
            <Users size={20} />
            {!sidebarCollapsed && <span>Consultants</span>}
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'metaAds' ? 'active' : ''}`}
            onClick={() => setActiveTab('metaAds')}
            title="Meta Ads"
          >
            <Megaphone size={20} />
            {!sidebarCollapsed && <span>Meta Ads</span>}
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'sources' ? 'active' : ''}`}
            onClick={() => setActiveTab('sources')}
            title="Sources"
          >
            <Database size={20} />
            {!sidebarCollapsed && <span>Sources</span>}
          </button>
        </div>

        <div className="nav-divider" />

        <div className="nav-section">
          <button className="nav-item" onClick={onLogout} title="Logout">
            <LogOut size={20} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
        
        {dataFreshness && !sidebarCollapsed && (
          <div className="data-freshness">
            {dataFreshness}
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-header pdf-hide">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="mobile-menu-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                padding: '0.5rem',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <Menu size={24} />
            </button>
            <h1 className="page-title">
              {activeTab === 'totals' && 'Franchise Analytics'}
              {activeTab === 'consultants' && 'Consultant Performance'}
              {activeTab === 'metaAds' && 'Meta Ads Overview'}
              {activeTab === 'sources' && 'Lead Sources'}
            </h1>
          </div>
          
          <div className="header-actions">
            <button className="btn-action" onClick={handleRefresh} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            
            {(activeTab === 'totals' || activeTab === 'metaAds' || activeTab === 'sources') && (
              <button className="btn-action btn-primary" onClick={handleExport}>
                <Download size={16} />
                Export PDF
              </button>
            )}
          </div>
        </header>

        <div className="dashboard-content">
          {activeTab === 'totals' && (
            <DataViewer
              data={data}
              loading={loading}
              error={error}
            />
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

          {activeTab === 'sources' && (
            <Sources />
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
