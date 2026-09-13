import { useEffect, useState } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  PieChart, Pie, Cell, 
  ScatterChart, Scatter, ZAxis, 
  AreaChart, Area, 
  BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import Layout from '../Layout';
import api from '../../services/api';
import { BrainCircuit, Activity, LineChart as LineChartIcon, Network, ShieldCheck, Zap } from 'lucide-react';

interface Pattern {
  id: number;
  disease_type: string;
  pattern_description: string | null;
  confidence_score: number | null;
  data_points_used: number | null;
  active: boolean;
  last_updated: string;
}

// Custom Tooltip Styles for Recharts
const tooltipStyle = {
  background: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '0.85rem'
};

export default function PatternList() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Pattern[]>('/patterns?limit=200')
      .then(({ data }) => setPatterns(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // --- Graph 1: AI Confidence Radar ---
  const radarData = [
    { subject: 'Dengue', A: 85, fullMark: 100 },
    { subject: 'Malaria', A: 92, fullMark: 100 },
    { subject: 'Typhoid', A: 78, fullMark: 100 },
    { subject: 'Cholera', A: 65, fullMark: 100 },
    { subject: 'Tuberculosis', A: 88, fullMark: 100 },
  ];

  // --- Graph 2: Pattern Distribution (Donut) ---
  const pieData = [
    { name: 'Dengue', value: 45 },
    { name: 'Malaria', value: 30 },
    { name: 'Typhoid', value: 15 },
    { name: 'Other', value: 10 },
  ];
  const COLORS = ['var(--indigo)', 'var(--emerald)', 'var(--amber)', 'var(--rose)'];

  // --- Graph 3: Data Depth vs Confidence (Scatter) ---
  const scatterData = patterns.filter(p => p.data_points_used && p.confidence_score).map(p => ({
    name: p.disease_type,
    x: p.data_points_used,
    y: (p.confidence_score! * 100).toFixed(1),
    z: 100 // Bubble size
  }));
  // Fallback scatter data if empty
  const finalScatter = scatterData.length > 0 ? scatterData : [
    { name: 'Dengue', x: 1200, y: 88, z: 200 },
    { name: 'Malaria', x: 800, y: 92, z: 150 },
    { name: 'Typhoid', x: 450, y: 75, z: 100 },
    { name: 'Cholera', x: 200, y: 60, z: 80 },
  ];

  // --- Graph 4: 14-Day Forecast (Area) ---
  const forecastData = Array.from({ length: 14 }).map((_, i) => ({
    day: `Day ${i + 1}`,
    cases: Math.round(10 + Math.sin(i / 2) * 5 + (i * 1.5)),
    baseline: 15
  }));

  // --- Graph 5: Village Risk Clusters (Bar) ---
  const clusterData = [
    { name: 'Cluster 1 (High Pop)', risk: 85, villages: 12 },
    { name: 'Cluster 2 (Low Meds)', risk: 72, villages: 8 },
    { name: 'Cluster 3 (Remote)', risk: 60, villages: 15 },
    { name: 'Cluster 4 (Stable)', risk: 25, villages: 32 },
  ];

  return (
    <Layout title="Predictive Patterns">
      
      {/* Header Banner */}
      <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BrainCircuit color="var(--indigo)" size={28} />
            AI Intelligence Hub
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Deep learning insights, clustering, and anomaly detection derived from district health records.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="badge badge-low" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
            <Zap size={14} style={{ marginRight: '0.25rem' }} /> Engine Active
          </div>
        </div>
      </div>

      {/* Top 3 Graphs Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* 1. Radar Chart */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Network size={18} color="var(--cyan)" /> AI Confidence Profile
            </h3>
            <span className="badge badge-default" style={{ fontSize: '0.65rem' }}>Sample Data</span>
          </div>
          <div style={{ flex: 1, minHeight: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)' }} />
                <Radar name="Confidence %" dataKey="A" stroke="var(--indigo)" fill="var(--indigo)" fillOpacity={0.5} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Donut Chart */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--emerald)" /> Pattern Distribution
            </h3>
            <span className="badge badge-default" style={{ fontSize: '0.65rem' }}>Sample Data</span>
          </div>
          <div style={{ flex: 1, minHeight: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Scatter Chart */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="var(--amber)" /> Data Depth vs Accuracy
            </h3>
            <span className="badge badge-default" style={{ fontSize: '0.65rem' }}>Sample Data</span>
          </div>
          <div style={{ flex: 1, minHeight: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="x" name="Data Points" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis type="number" dataKey="y" name="Confidence %" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} domain={[0, 100]} />
                <ZAxis type="number" dataKey="z" range={[50, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
                <Scatter name="Patterns" data={finalScatter} fill="var(--amber)" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom 2 Graphs Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* 4. Area Chart */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LineChartIcon size={18} color="var(--rose)" /> 14-Day Outbreak Forecast (Dengue)
            </h3>
            <span className="badge badge-default" style={{ fontSize: '0.65rem' }}>Sample Data</span>
          </div>
          <div style={{ flex: 1, minHeight: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--rose)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--rose)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="cases" stroke="var(--rose)" fillOpacity={1} fill="url(#colorCases)" name="Projected Cases" />
                <Area type="monotone" dataKey="baseline" stroke="var(--text-muted)" fill="none" strokeDasharray="3 3" name="Historical Baseline" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Composed/Bar Chart */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Network size={18} color="var(--indigo)" /> Village Risk Clusters
            </h3>
            <span className="badge badge-default" style={{ fontSize: '0.65rem' }}>Sample Data</span>
          </div>
          <div style={{ flex: 1, minHeight: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clusterData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="risk" name="Avg Risk Score" fill="var(--indigo)" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Raw Data Table */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0' }}>Discovered Predictive Patterns</h3>
        {loading ? (
          <div className="spinner" />
        ) : patterns.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No predictive patterns yet.</p>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Disease</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Confidence</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Data Points</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {patterns.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--cyan)' }}>{p.disease_type}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {p.confidence_score ? `${(p.confidence_score * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{p.data_points_used?.toLocaleString() ?? '—'}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.pattern_description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </Layout>
  );
}
