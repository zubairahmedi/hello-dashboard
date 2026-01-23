import React, { useMemo } from 'react';
import { Card } from '../UI/Card';
import { Trophy } from 'lucide-react';

const ConsultantLeaderboard = ({ data, suffix, windowKey }) => {
  if (!data || !data.consultants) return null;

  // Calculate and sort consultants by a composite score
  const rankedConsultants = useMemo(() => {
    return data.consultants.map((c) => {
      const leads = Number(c[`leads${suffix}`] || 0);
      const appts = Number(c[`appointments${suffix}`] || 0);
      const conversion = leads > 0 ? ((appts / leads) * 100) : 0;
      
      const w = c.status_windows?.[windowKey] || {};
      const showed = Number(w.showed || 0);
      const noShow = Number(w.no_show || 0);
      const meaningfulAppts = showed + noShow;
      const showRate = meaningfulAppts > 0 ? ((showed / meaningfulAppts) * 100) : 0;

      return {
        id: c.id,
        name: c.name,
        leads,
        appts,
        conversion,
        showRate
      };
    })
    .sort((a, b) => b.appts - a.appts); // Sort by appointments (primary metric)
  }, [data, suffix, windowKey]);

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={20} color="#d97706" />
          <span>Consultant Leaderboard</span>
        </div>
      } 
      className="chart-card wide"
    >
      <div className="leaderboard-container">
        {rankedConsultants.map((c, idx) => (
          <div key={c.id} className={`leaderboard-row ${idx < 3 ? 'top-3' : ''}`}>
            <div className="leaderboard-rank">
              {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
            </div>
            <div className="leaderboard-name">{c.name}</div>
            <div className="leaderboard-stat highlight">
              <div className="leaderboard-stat-value">{c.leads}</div>
              <div className="leaderboard-stat-label">Leads</div>
            </div>
            <div className="leaderboard-stat">
              <div className="leaderboard-stat-value">{c.appts}</div>
              <div className="leaderboard-stat-label">Appts</div>
            </div>
            <div className="leaderboard-stat warning">
              <div className="leaderboard-stat-value">{c.conversion.toFixed(1)}%</div>
              <div className="leaderboard-stat-label">Conv</div>
            </div>
            <div className="leaderboard-stat success">
              <div className="leaderboard-stat-value">{c.showRate.toFixed(1)}%</div>
              <div className="leaderboard-stat-label">Show</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ConsultantLeaderboard;
