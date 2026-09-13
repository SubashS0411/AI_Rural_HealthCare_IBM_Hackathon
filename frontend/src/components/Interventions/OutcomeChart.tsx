import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Intervention } from './InterventionPanel';

interface OutcomeChartProps {
  interventions: Intervention[];
}

export default function OutcomeChart({ interventions }: OutcomeChartProps) {
  const completed = interventions.filter(inv => inv.status === 'completed' && inv.risk_score_before !== null && inv.risk_score_after !== null);

  const { chartData, avgChange } = useMemo(() => {
    if (completed.length === 0) return { chartData: [], avgChange: 0 };
    
    let totalChange = 0;
    const data = completed.map(inv => {
      const change = (inv.risk_score_after || 0) - (inv.risk_score_before || 0);
      totalChange += change;
      return {
        name: `${inv.village_name} (${inv.resource_type})`,
        Before: inv.risk_score_before,
        After: inv.risk_score_after,
      };
    });
    
    return {
      chartData: data,
      avgChange: (totalChange / completed.length).toFixed(1),
    };
  }, [completed]);

  if (completed.length === 0) {
    return (
      <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No completed interventions yet — outcomes will appear here.
      </div>
    );
  }

  return (
    <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            Before/After Outcome Analytics
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Avg risk change: <strong style={{ color: avgChange <= 0 ? 'var(--emerald)' : 'var(--rose)' }}>{avgChange > 0 ? '+' : ''}{avgChange} pts</strong> across {completed.length} completed interventions
          </p>
        </div>
        <span className="badge badge-default">Source: real completed records</span>
      </div>

      <div style={{ height: '300px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: 'none', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ fontSize: '0.85rem' }} />
            <Bar dataKey="Before" fill="var(--rose)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="After" fill="var(--emerald)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
