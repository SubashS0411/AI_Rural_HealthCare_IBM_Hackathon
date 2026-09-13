import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import OutcomeChart from './OutcomeChart';

export interface Intervention {
  id: number;
  village_id: number;
  village_name: string;
  resource_type: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed';
  assigned_by: string;
  created_at: string;
  completed_at: string | null;
  risk_score_before: number | null;
  risk_score_after: number | null;
}

interface Props {
  districtId: number;
}

const SkeletonColumn = () => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <div className="skeleton" style={{ height: '30px', width: '120px', borderRadius: '4px' }}></div>
    <div className="skeleton-card" style={{ height: '150px', borderRadius: '12px' }}></div>
    <div className="skeleton-card" style={{ height: '150px', borderRadius: '12px' }}></div>
  </div>
);

export default function InterventionPanel({ districtId }: Props) {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInterventions = () => {
    setLoading(true);
    api.get(`/interventions?district_id=${districtId}`)
      .then(res => setInterventions(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInterventions();
  }, [districtId]);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      let payload: any = { status: newStatus };
      if (newStatus === 'completed') {
        // Find the intervention to get its village_id
        const inv = interventions.find(i => i.id === id);
        if (inv) {
          // Fetch the current composite risk score from ranking
          const rankRes = await api.get(`/districts/${districtId}/ranking`);
          const villageData = rankRes.data.villages.find((v: any) => v.village_id === inv.village_id);
          if (villageData) {
            payload.risk_score_after = villageData.composite_score;
          }
        }
      }
      
      await api.put(`/interventions/${id}`, payload);
      fetchInterventions(); // refresh list
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2rem' }}>
        <SkeletonColumn />
        <SkeletonColumn />
        <SkeletonColumn />
      </div>
    );
  }

  const cols = [
    { id: 'planned', label: 'Planned' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' }
  ];

  if (interventions.length === 0) {
    return (
      <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
        No interventions planned yet for this district.
      </div>
    );
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Intervention Management</h2>
      
      <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {cols.map(col => {
          const colItems = interventions.filter(inv => inv.status === col.id);
          return (
            <div key={col.id} style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-secondary)' }}>{col.label} ({colItems.length})</h3>
              
              {colItems.length === 0 ? (
                <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No interventions in this stage.
                </div>
              ) : (
                colItems.map(inv => (
                  <div key={inv.id} className="glass" style={{ padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{inv.village_name}</strong>
                      <span className="badge badge-default">{inv.resource_type.replace('_', ' ')}</span>
                    </div>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {inv.description}
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Score Before: {inv.risk_score_before?.toFixed(1) || 'N/A'}</span>
                      {col.id === 'planned' && (
                        <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => updateStatus(inv.id, 'in_progress')}>→ In Progress</button>
                      )}
                      {col.id === 'in_progress' && (
                        <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: 'var(--emerald)' }} onClick={() => updateStatus(inv.id, 'completed')}>→ Mark Complete</button>
                      )}
                      {col.id === 'completed' && (
                        <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>Score After: {inv.risk_score_after?.toFixed(1) || 'N/A'}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      <OutcomeChart interventions={interventions} />
    </div>
  );
}
