import React from 'react';
import './DataViewer.css';
import AnalyticsDashboard from './AnalyticsDashboard';

export default function DataViewer({ data, loading, error }) {
  if (!data) {
    return (
      <div className="data-viewer">
        <div className="placeholder">
          Click "Refresh" button to load analytics
        </div>
      </div>
    );
  }

  return (
    <div className="data-viewer">
      <div className="controls">
        {data && data.totals && (
          <div className="data-info">
            Data loaded • Last updated: {new Date(data.totals.last_updated).toLocaleString()}
          </div>
        )}
        
        {loading && (
          <div className="data-info">
            Loading...
          </div>
        )}
      </div>

      {error && (
        <div className="error-box">
          Error: {error}
        </div>
      )}

      {data && <AnalyticsDashboard data={data} />}
    </div>
  );
}