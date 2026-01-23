import React from 'react';
import './Cards.css';

export function Card({ children, title, className = '' }) {
  return (
    <div className={`modern-card ${className}`}>
      {title && (
        <div className="modern-card-header">
          <h3 className="modern-card-title">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ label, value, trend, trendLabel, icon: Icon }) {
  const isPositive = trend >= 0;
  
  return (
    <Card>
      <div className="stat-card">
        <div className="stat-card-row">
          <div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
          </div>
          {Icon && (
            <div className="stat-icon-wrapper">
              <Icon size={20} />
            </div>
          )}
        </div>
        
        {trend !== undefined && (
          <div className={`stat-trend ${isPositive ? 'positive' : 'negative'}`}>
            <span>{isPositive ? '↑' : '↓'} {Math.abs(trend)}%</span>
            <span style={{ color: 'var(--text-tertiary)', marginLeft: '4px', fontWeight: 'normal' }}>
              {trendLabel || 'vs prev period'}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export function TopPerformerCard({ label, name, metric, metricLabel, icon: Icon }) {
  return (
    <Card>
      <div className="top-performer-card">
        <div className="top-performer-header">
          <div className="stat-label">{label}</div>
          {Icon && (
            <div className="stat-icon-wrapper small">
              <Icon size={16} />
            </div>
          )}
        </div>
        <div className="top-performer-content">
          <span className="performer-name-pill">{name}</span>
          <span className="performer-metric">{metric} <span className="performer-metric-label">{metricLabel}</span></span>
        </div>
      </div>
    </Card>
  );
}
