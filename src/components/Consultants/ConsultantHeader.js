import React, { useState } from 'react';
import './Consultant.css';
import '../../NewAnalytics.css';
import exportNodeAsPdf from '../../utils/pdfExport';
import { Users, Calendar, TrendingUp, CheckCircle, Target, UserPlus, XCircle, AlertCircle, HelpCircle, X } from 'lucide-react';
import { StatCard } from '../UI/Card';

export default function ConsultantHeader({ consultant, timePeriod, setTimePeriod, data }) {
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Map time period to status_windows key
  const getWindowKey = (period) => {
    const mapping = {
      '7d': 'last7',
      '14d': 'last14',
      '30d': 'last30',
      '60d': 'last60',
      '150d': 'last150',
      '180d': 'last180',
      '365d': 'last365'
    };
    return mapping[period] || 'last30';
  };

  const suffix = `_${timePeriod}`;
  const windowKey = getWindowKey(timePeriod);
  
  const leads = Number(consultant[`leads${suffix}`] || 0);
  const appointments = Number(consultant[`appointments${suffix}`] || 0);
  const referrals = Number(consultant[`referrals${suffix}`] || 0);
  const conversionRate = leads > 0 ? ((appointments / leads) * 100).toFixed(1) : '0.0';
  
  // Get status data from status_windows for the selected period
  const statusWindow = consultant.status_windows?.[windowKey] || {};
  const showed = Number(statusWindow.showed || 0);
  const noShow = Number(statusWindow.no_show || 0);
  let confirmed = Number(statusWindow.confirmed || 0);
  const cancelled = Number(statusWindow.cancelled || 0);
  const totalRecordedStatuses = showed + noShow + confirmed + cancelled;
  // Unrecorded appointments are treated as confirmed
  confirmed = confirmed + Math.max(0, appointments - totalRecordedStatuses);
  const showRate = appointments > 0 ? ((showed / appointments) * 100).toFixed(1) : '0.0';

  return (
    <div className="consultant-header-section" style={{ marginBottom: '2rem' }}>
      {/* Header Title with Avatar */}
      <div className="header-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#fff', padding: '1rem', borderRadius: '12px', border: '1px solid #edf2f7', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
           <h1 className="consultant-name" style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>{consultant.name}</h1>
           <p style={{ margin: '0.2rem 0 0 0', color: '#64748b' }}>Performance Overview</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="period-btn"
            onClick={() => setShowHelpModal(true)}
            style={{ background: 'white', color: 'var(--text-secondary)', border: '1px solid #e2e8f0' }}
            title="View metric definitions"
          >
            <HelpCircle size={16} style={{ marginRight: '0.25rem' }} />
            Help
          </button>
          <button
            id="export-consultant-pdf"
            className="period-btn active"
            onClick={() => exportNodeAsPdf('consultant-root', { filename: `${(consultant.name || 'consultant').replace(/\s+/g, '_')}-report.pdf`, type: 'consultant', orientation: 'landscape' })}
            style={{ background: 'var(--primary-accent)', color: 'white' }}
          >
            📄 Export Report
          </button>
        </div>
      </div>

      {/* Time Period Selector */}
      <div className="period-selector" style={{ marginBottom: '1.5rem', background: 'white', border: '1px solid #edf2f7', padding: '0.5rem', borderRadius: '10px' }}>
          {['7d', '14d', '30d', '60d', '150d', '180d', '365d'].map(period => (
            <button
              key={period}
              className={`period-btn ${timePeriod === period ? 'active' : ''}`}
              onClick={() => setTimePeriod(period)}
            >
              {period.toUpperCase()}
            </button>
          ))}
      </div>

      {/* Consolidated KPI Super Cards - 4 columns */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '24px', 
        marginBottom: '24px' 
      }}>
        {/* Card 1: Leads + Conversion + Referrals */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '20px', 
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Users size={18} color="#667eea" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Leads</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{leads}</div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ 
              padding: '6px 10px', 
              background: '#f0fdf4', 
              borderRadius: '6px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px' 
            }}>
              <TrendingUp size={14} color="#166534" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>{conversionRate}% Conv</span>
            </span>
            <span style={{ 
              padding: '6px 10px', 
              background: '#f8fafc', 
              borderRadius: '6px', 
              fontSize: '13px', 
              fontWeight: 600, 
              color: '#64748b' 
            }}>
              {referrals} Ref
            </span>
          </div>
        </div>

        {/* Card 2: Appointments + Show Rate */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '20px', 
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Calendar size={18} color="#764ba2" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Appointments</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{appointments}</div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ 
              padding: '6px 10px', 
              background: parseFloat(showRate) >= 50 ? '#f0fdf4' : '#fefce8', 
              borderRadius: '6px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px' 
            }}>
              <Target size={14} color={parseFloat(showRate) >= 50 ? '#166534' : '#854d0e'} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: parseFloat(showRate) >= 50 ? '#166534' : '#854d0e' }}>{showRate}% Show</span>
            </span>
          </div>
        </div>

        {/* Card 3: Confirmed + Stability */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '20px', 
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <CheckCircle size={18} color="#06b6d4" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confirmed</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{confirmed}</div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ 
              padding: '6px 10px', 
              background: '#f0f9ff', 
              borderRadius: '6px', 
              fontSize: '13px', 
              fontWeight: 600, 
              color: '#0369a1' 
            }}>
              {appointments > 0 ? (((confirmed + showed) / appointments) * 100).toFixed(0) : 0}% Stability
            </span>
          </div>
        </div>

        {/* Card 4: Showed (Sales) + Outcomes */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '20px', 
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Users size={18} color="#10b981" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Showed</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{showed}</div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', padding: '6px 10px', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontWeight: 600 }}>
              {noShow} No-Show
            </span>
            <span style={{ fontSize: '13px', padding: '6px 10px', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontWeight: 600 }}>
              {cancelled} Cancel
            </span>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={24} color="var(--primary-accent)" />
                Metric Definitions
              </h2>
              <button className="modal-close" onClick={() => setShowHelpModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="metric-definition">
                <h3>Conversion Rate</h3>
                <p>Percentage of leads that become appointments</p>
                <code>Appointments ÷ Leads × 100</code>
              </div>
              <div className="metric-definition">
                <h3>Show Rate</h3>
                <p>Percentage of appointments where the client showed up</p>
                <code>Showed ÷ Appointments × 100</code>
              </div>
              <div className="metric-definition">
                <h3>vs Team</h3>
                <p>Performance difference vs team average (+/- %)</p>
              </div>
              <div className="metric-definition">
                <h3>Status Categories</h3>
                <ul>
                  <li><strong>Showed:</strong> Client attended appointment</li>
                  <li><strong>Confirmed:</strong> Appointment scheduled, not yet occurred (includes pending)</li>
                  <li><strong>No Show:</strong> Client didn't attend</li>
                  <li><strong>Cancelled:</strong> Appointment cancelled</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
