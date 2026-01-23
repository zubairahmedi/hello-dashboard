import React, { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Card } from '../UI/Card';
import '../UI/Cards.css';
import '../../NewAnalytics.css';

export default function ConsultantRankingTable({ data, period, consultants }) {
  const [sortConfig, setSortConfig] = useState({ key: 'leads', direction: 'desc' });

  // Calculate stats per consultant for the selected period
  const tableData = useMemo(() => {
    return consultants.map(c => {
      const p = period; 
      // Metrics
      const leads = Number(c[`leads${p.suffix}`] || 0);
      const appts = Number(c[`appointments${p.suffix}`] || 0);
      
      // Status Logic (Consistent with Dashboard)
      const windowData = c.status_windows?.[p.windowKey] || {};
      const rawConfirmed = Number(windowData.confirmed || 0);
      const rawShowed = Number(windowData.showed || 0);
      const rawCancelled = Number(windowData.cancelled || 0);
      const rawNoShow = Number(windowData.no_show || 0);
      
      const recorded = rawConfirmed + rawShowed + rawCancelled + rawNoShow;
      const unrecorded = Math.max(0, appts - recorded);
      
      const refinedConfirmed = rawConfirmed + unrecorded;
      const totalShowed = rawShowed;
      const totalOpp = refinedConfirmed + totalShowed + rawNoShow; // "Show Opportunity" denominator if needed
      
      // Rates
      // Show Rate = Showed / (Showed + NoShow)  (Excluding cancelled/confirmed for now? Or based on total?)
      // Standard definition in this project seems to be Showed / Appointments or specific logic.
      // Let's use the simplest: Show Rate = Showed / (Showed + NoShow) for completed appts, or Showed / Appts.
      // Reverting to safe calc: Showed / (Showed + No Show)
      const meaningfulAppts = totalShowed + rawNoShow;
      const showRate = meaningfulAppts > 0 ? (totalShowed / meaningfulAppts) * 100 : 0;
      
      // Conversion (Leads -> Appts)
      const conversion = leads > 0 ? (appts / leads) * 100 : 0;

      return {
        id: c.id,
        name: c.name,
        leads,
        appts,
        showRate,
        conversion
      };
    });
  }, [consultants, period]);

  // Sorting
  const sortedData = useMemo(() => {
    let sortableItems = [...tableData];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [tableData, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
        // toggle back to desc if already desc? standard is usually asc->desc->asc
        direction = 'ascending';
    } else {
        // default for new column (numbers usually desc)
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Mini progress bar component
  const MiniProgressBar = ({ value, maxValue, gradient, color, bgColor }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
      <div style={{ 
        width: '60px', 
        height: '6px', 
        background: '#e2e8f0', 
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{ 
          width: `${Math.min((value / maxValue) * 100, 100)}%`, 
          height: '100%', 
          background: gradient || color,
          borderRadius: '3px',
          transition: 'width 0.3s ease'
        }} />
      </div>
      <span style={{ 
        padding: '5px 12px', 
        borderRadius: '6px', 
        background: bgColor,
        color: color,
        fontSize: '0.85rem',
        fontWeight: 600,
        minWidth: '55px',
        textAlign: 'center'
      }}>
        {value.toFixed(1)}%
      </span>
    </div>
  );

  return (
    <Card 
      title={`Consultant Performance Details (${period.label})`} 
      className="wide" 
      style={{ marginTop: '20px' }}
    >
      <div className="table-container" style={{ border: 'none', borderRadius: 0, overflowX: 'auto' }}>
        <table className="analytics-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th className="th-sortable" onClick={() => requestSort('name')} style={{ textAlign: 'left', padding: '16px 24px', color: '#2c5282', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', cursor: 'pointer' }}>
                Consultant <ArrowUpDown size={14} style={{ marginLeft: '4px', color: '#2563eb', opacity: 1 }} />
              </th>
              <th className="th-sortable" onClick={() => requestSort('leads')} style={{ textAlign: 'right', padding: '16px 24px', color: '#2c5282', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', cursor: 'pointer' }}>
                Leads <ArrowUpDown size={14} style={{ marginLeft: '4px', color: '#2563eb', opacity: 1 }} />
              </th>
              <th className="th-sortable" onClick={() => requestSort('appts')} style={{ textAlign: 'right', padding: '16px 24px', color: '#2c5282', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', cursor: 'pointer' }}>
                Appointments <ArrowUpDown size={14} style={{ marginLeft: '4px', color: '#2563eb', opacity: 1 }} />
              </th>
              <th className="th-sortable" onClick={() => requestSort('conversion')} style={{ textAlign: 'right', padding: '16px 24px', color: '#2c5282', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', cursor: 'pointer' }}>
                Lead Conv. <ArrowUpDown size={14} style={{ marginLeft: '4px', color: '#2563eb', opacity: 1 }} />
              </th>
              <th className="th-sortable" onClick={() => requestSort('showRate')} style={{ textAlign: 'right', padding: '16px 24px', color: '#2c5282', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px', cursor: 'pointer' }}>
                Show Rate <ArrowUpDown size={14} style={{ marginLeft: '4px', color: '#2563eb', opacity: 1 }} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => {
              // Meaningful color thresholds (user-requested)
              const getConversionStyle = (rate) => {
                if (rate >= 20) return { 
                  gradient: 'linear-gradient(90deg, #4ade80 0%, #16a34a 100%)',
                  color: '#166534', 
                  bg: '#f0fdf4' 
                }; // Good - green (20%+)
                if (rate >= 12) return { 
                  gradient: 'linear-gradient(90deg, #facc15 0%, #ca8a04 100%)',
                  color: '#854d0e', 
                  bg: '#fefce8' 
                }; // Okay - yellow (12-20%)
                return { 
                  gradient: 'linear-gradient(90deg, #f87171 0%, #dc2626 100%)',
                  color: '#991b1b', 
                  bg: '#fef2f2' 
                }; // Bad - red (<12%)
              };
              const getShowRateStyle = (rate) => {
                if (rate >= 35) return { 
                  gradient: 'linear-gradient(90deg, #4ade80 0%, #16a34a 100%)',
                  color: '#166534', 
                  bg: '#f0fdf4' 
                }; // Good - green (35%+)
                if (rate >= 25) return { 
                  gradient: 'linear-gradient(90deg, #facc15 0%, #ca8a04 100%)',
                  color: '#854d0e', 
                  bg: '#fefce8' 
                }; // Okay - yellow (25-35%)
                return { 
                  gradient: 'linear-gradient(90deg, #f87171 0%, #dc2626 100%)',
                  color: '#991b1b', 
                  bg: '#fef2f2' 
                }; // Bad - red (<25%)
              };
              const convStyle = getConversionStyle(row.conversion);
              const showStyle = getShowRateStyle(row.showRate);
              
              return (
              <tr 
                key={row.id} 
                style={{ 
                  borderBottom: '1px solid #f1f5f9',
                  background: idx % 2 === 0 ? 'white' : '#fafcfd',
                  transition: 'background 0.2s'
                }}
              >
                <td style={{ padding: '18px 24px', fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>{row.name}</td>
                <td style={{ padding: '18px 24px', textAlign: 'right', color: '#475569', fontWeight: 600, fontSize: '0.95rem' }}>{row.leads}</td>
                <td style={{ padding: '18px 24px', textAlign: 'right', color: '#475569', fontWeight: 600, fontSize: '0.95rem' }}>{row.appts}</td>
                <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                  <MiniProgressBar 
                    value={row.conversion} 
                    maxValue={50} 
                    gradient={convStyle.gradient}
                    color={convStyle.color} 
                    bgColor={convStyle.bg} 
                  />
                </td>
                <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                  <MiniProgressBar 
                    value={row.showRate} 
                    maxValue={100} 
                    gradient={showStyle.gradient}
                    color={showStyle.color} 
                    bgColor={showStyle.bg} 
                  />
                </td>
              </tr>
            )})}
            {sortedData.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No consultant data found for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
