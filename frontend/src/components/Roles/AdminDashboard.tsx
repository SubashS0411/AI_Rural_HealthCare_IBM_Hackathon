import { useEffect, useState } from 'react';
import Layout from '../Layout';
import RiskDashboard from '../RiskAnalysis/RiskDashboard';
import InterventionPanel from '../Interventions/InterventionPanel';
import api from '../../services/api';
import { Activity, BrainCircuit, LineChart, Network, ShieldCheck } from 'lucide-react';

interface MLStatus {
  model_a: boolean;
  model_b: boolean;
  model_c: boolean;
  model_d: boolean;
  trained_at: string | null;
  record_count: number;
}

export default function AdminDashboard() {
  const [mlStatus, setMlStatus] = useState<MLStatus | null>(null);

  useEffect(() => {
    api.get<MLStatus>('/ml/status')
      .then(res => setMlStatus(res.data))
      .catch(err => console.error("Failed to fetch ML status", err));
  }, []);

  const StatusCard = ({ title, active, icon, desc }: { title: string, active: boolean, icon: React.ReactNode, desc: string }) => (
    <div className="glass" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '12px' }}>
      <div style={{ 
        background: active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
        color: active ? '#10b981' : '#64748b', 
        padding: '0.75rem', 
        borderRadius: '50%' 
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{title}</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: active ? 'var(--emerald)' : 'var(--text-secondary)' }}>
          {active ? 'Trained & Active' : 'Fallback (Rules)'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</div>
      </div>
    </div>
  );

  return (
    <Layout title="Admin Overview">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', height: '100%' }}>
        
        {/* AI Systems Health Banner */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BrainCircuit size={20} color="var(--indigo)" />
                AI Systems Health
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                Real-time status of the Machine Learning pipeline. Models train offline on health records.
              </p>
            </div>
            {mlStatus?.trained_at && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} color="var(--emerald)" />
                Last Trained: {new Date(mlStatus.trained_at).toLocaleString()} ({mlStatus.record_count} records)
              </div>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <StatusCard 
              title="RISK SCORING (MOD-A)" 
              active={mlStatus?.model_a || false} 
              icon={<Activity size={20} />} 
              desc="XGBoost Regression"
            />
            <StatusCard 
              title="FORECASTING (MOD-B)" 
              active={mlStatus?.model_b || false} 
              icon={<LineChart size={20} />} 
              desc="Holt-Winters Exponent"
            />
            <StatusCard 
              title="ANOMALY DETECT (MOD-C)" 
              active={mlStatus?.model_c || false} 
              icon={<ShieldCheck size={20} />} 
              desc="Statistical Baselines"
            />
            <StatusCard 
              title="CLUSTERING (MOD-D)" 
              active={mlStatus?.model_d || false} 
              icon={<Network size={20} />} 
              desc="K-Means Unsupervised"
            />
          </div>
        </div>

        {/* Core Admin Risk Dashboard */}
        <div style={{ flex: 1 }}>
          <RiskDashboard />
        </div>

        {/* Global Interventions */}
        <div style={{ flex: 1, marginTop: '2rem' }}>
          <InterventionPanel districtId={1} />
        </div>

      </div>
    </Layout>
  );
}
