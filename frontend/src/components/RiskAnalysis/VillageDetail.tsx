import { useEffect, useState } from 'react';
import { ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Area, Line } from 'recharts';
import { ComposedChart } from 'recharts';
import api from '../../services/api';
import type { VillageRisk } from './RiskDashboard';
import PlanInterventionModal from '../Interventions/PlanInterventionModal';

interface VillageDetailProps {
  village: VillageRisk;
  districtId: number;
  onClose: () => void;
}


export default function VillageDetail({ village, districtId, onClose }: VillageDetailProps) {
  const [forecast, setForecast] = useState<any[]>([]);
  const [forecastStatus, setForecastStatus] = useState<string>('loading');
  const [clusterMates, setClusterMates] = useState<any[]>([]);
  const [clusterStatus, setClusterStatus] = useState<string>('loading');
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    // 1. Fetch ML Forecast and actual history for the dominant disease driver
    const disease = village.dominant_driver.replace(/_/g, ' ');
    Promise.all([
      api.get(`/ml/forecast/${village.village_id}/${disease}`),
      api.get(`/health-records?village_id=${village.village_id}&disease_type=${disease}&limit=3`)
    ])
      .then(([forecastRes, historyRes]) => {
        const data = forecastRes.data;
        const historyData = historyRes.data || [];
        if (data.forecast_14d) {
          const trend: Array<{day: string, cases?: number, forecast?: number, isHistorical?: boolean}> = [];
          
          // Use real historical data if available, sort ascending by recorded_at
          const sortedHistory = [...historyData].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
          
          if (sortedHistory.length > 0) {
            sortedHistory.forEach((record, index) => {
               // Assign generic day labels for the history
               const dayLabel = index === sortedHistory.length - 1 ? 'Today' : `-${sortedHistory.length - 1 - index}d`;
               trend.push({ day: dayLabel, cases: record.case_count, isHistorical: true });
            });
          }

          data.forecast_14d.forEach((val: number, i: number) => {
            if (i % 3 === 0) trend.push({ day: `+${i}d`, forecast: val });
          });
          setForecast(trend);
          setForecastStatus(data.model_status);
        }
      })
      .catch(err => {
        console.error("Forecast or history error", err);
        setForecastStatus("error");
      });

    // 2. Fetch ML Clusters to find similar villages
    api.get(`/ml/clusters?village_id=${village.village_id}`)
      .then(res => {
        // In MVP, backend returns a map of all cluster assignments
        const cmap = res.data.cluster_map;
        const myCluster = cmap[village.village_id];
        
        // Let's fetch all villages to match names (inefficient but okay for MVP demo)
        api.get(`/districts/${districtId}/ranking`).then(rankRes => {
           const allV = rankRes.data.villages;
           const mates = allV.filter((v: any) => 
              cmap[v.village_id] === myCluster && v.village_id !== village.village_id
           ).slice(0, 3);
           setClusterMates(mates);
           setClusterStatus(res.data.model_status);
        });
      })
      .catch(err => {
        console.error("Cluster error", err);
        setClusterStatus("error");
      });
  }, [village.village_id, village.dominant_driver]);


  return (
    <div className="glass" style={{ padding: '1.5rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <button 
        onClick={onClose}
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}
      >
        ✕
      </button>
      
      <div>
        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Village Details</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0' }}>{village.village_name}</h2>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-default">Pop: {(village.population ?? 0).toLocaleString()}</span>
          <span className="badge badge-error">
            Score: {Math.round(village.composite_score)}
            <span style={{ fontSize: '0.65rem', marginLeft: '0.4rem', opacity: 0.8, textTransform: 'lowercase' }}>
              (Model A: trained)
            </span>
          </span>
        </div>
      </div>

      <div className="alert alert-info" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.25rem' }}>💡</span>
        <div style={{ flex: 1 }}>
          <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--indigo)' }}>Recommended Intervention</strong>
          <span style={{ fontSize: '0.85rem' }}>{village.recommendation}</span>
        </div>
        <button 
          className="btn btn-primary" 
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}
          onClick={() => setShowPlanModal(true)}
        >
          Plan Intervention
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        
        {/* ML Forecast Chart (Model B) */}
        <div style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              14-Day Case Forecast <br/>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>{village.dominant_driver.replace(/_/g, ' ').toUpperCase()}</span>
            </h4>
            <span className="badge badge-default" style={{ fontSize: '0.65rem' }}>Model B: {forecastStatus}</span>
          </div>
          
          <div style={{ height: '180px' }}>
            {forecast.length > 0 ? (
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                {forecast.filter(d => d.isHistorical).length < 2 && (
                  <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--amber)', zIndex: 10, background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '4px' }}>
                    Insufficient history for trend line
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: 'none', borderRadius: '8px' }} />
                    
                    {forecast.filter(d => d.isHistorical).length >= 2 ? (
                      <>
                        <Area type="monotone" dataKey="forecast" fill="url(#colorForecast)" stroke="none" />
                        <Line type="monotone" dataKey="cases" stroke="var(--indigo)" strokeWidth={3} dot={{ r: 3, fill: 'var(--indigo)' }} />
                      </>
                    ) : (
                      <Area type="monotone" dataKey="forecast" fill="url(#colorForecast)" stroke="none" />
                    )}
                    
                    <defs>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--rose)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--rose)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" />
              </div>
            )}
          </div>
        </div>

        {/* Similar Villages (Model D) */}
        <div style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Similar Risk Profiles
            </h4>
            <span className="badge badge-default" style={{ fontSize: '0.65rem' }}>Model D: {clusterStatus}</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {clusterMates.length > 0 ? (
              clusterMates.map(mate => (
                <div key={mate.village_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `3px solid ${mate.composite_score > 75 ? 'var(--rose)' : 'var(--amber)'}` }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{mate.village_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mate.dominant_driver.replace(/_/g, ' ')}</div>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: mate.composite_score > 75 ? 'var(--rose)' : 'var(--amber)' }}>
                    {Math.round(mate.composite_score)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No similar villages found in cluster.
              </div>
            )}
          </div>
        </div>

      </div>
      
      {showPlanModal && (
        <PlanInterventionModal 
          villageId={village.village_id} 
          villageName={village.village_name} 
          riskScoreBefore={village.composite_score} 
          onClose={() => setShowPlanModal(false)}
          onSuccess={() => {
             // Let the InterventionPanel handle refetch via polling or user refresh. 
             // Ideally we'd pass a callback up to refresh the panel. For now, it will refresh on remount.
          }}
        />
      )}
    </div>
  );
}
