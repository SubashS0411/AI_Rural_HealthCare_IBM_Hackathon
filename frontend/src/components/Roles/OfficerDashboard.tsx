import { useEffect, useState } from 'react';
import Layout from '../Layout';
import api from '../../services/api';
import RiskMap from '../RiskAnalysis/RiskMap';
import RiskTable from '../RiskAnalysis/RiskTable';
import VillageDetail from '../RiskAnalysis/VillageDetail';
import FieldRequestsFeed from '../RiskAnalysis/FieldRequestsFeed';
import InterventionPanel from '../Interventions/InterventionPanel';
import type { RankingResponse, District } from '../RiskAnalysis/RiskDashboard';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Home, ShieldAlert, Users, Activity } from 'lucide-react';

export default function OfficerDashboard() {
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVillageId, setSelectedVillageId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number>(2); // Default to 2 (Rangpur) which has data
  const [barMetric, setBarMetric] = useState<'composite' | 'disease_load' | 'staff_vacancy' | 'medicine_gap'>('composite');

  // Fetch districts once
  useEffect(() => {
    api.get<District[]>('/districts?limit=100')
      .then(res => setDistricts(res.data))
      .catch(err => console.error("Failed to load districts", err));
  }, []);

  // Fetch ranking when districtId changes
  useEffect(() => {
    setLoading(true);
    setRanking(null);
    setSelectedVillageId(null);
    api
      .get<RankingResponse>(`/districts/${districtId}/ranking`)
      .then((res) => setRanking(res.data))
      .catch((err) => console.error('Failed to load ranking', err))
      .finally(() => setLoading(false));
  }, [districtId]);

  const activeVillage = ranking?.villages.find((v) => v.village_id === selectedVillageId);

  // Derive metrics
  const totalVillages = ranking?.villages.length || 0;
  let criticalCount = 0, highCount = 0, medCount = 0, lowCount = 0;
  let totalScore = 0;
  
  ranking?.villages.forEach(v => {
    totalScore += v.composite_score;
    if (v.composite_score > 75) criticalCount++;
    else if (v.composite_score > 50) highCount++;
    else if (v.composite_score > 25) medCount++;
    else lowCount++;
  });
  
  const avgScore = totalVillages ? Math.round(totalScore / totalVillages) : 0;

  // Bar Chart Data (Top 8 villages by selected metric)
  const barData = ranking?.villages.slice(0, 8).map(v => {
    let score = Math.round(v.composite_score);
    if (barMetric === 'disease_load') score = Math.round((v.factors?.disease_load || 0) * 100);
    else if (barMetric === 'staff_vacancy') score = Math.round((v.factors?.staff_vacancy || 0) * 100);
    else if (barMetric === 'medicine_gap') score = Math.round((v.factors?.medicine_gap || 0) * 100);

    return {
      name: v.village_name.length > 10 ? v.village_name.substring(0, 10) + '...' : v.village_name,
      score: score
    };
  }) || [];

  // Donut Chart Data
  const donutData = [
    { name: 'Critical Risk', value: criticalCount, fill: '#f43f5e' },
    { name: 'High Risk', value: highCount, fill: '#f59e0b' },
    { name: 'Medium Risk', value: medCount, fill: '#3b82f6' },
    { name: 'Low Risk', value: lowCount, fill: '#10b981' },
  ].filter(d => d.value > 0);

  // Composed Chart Data (Resource Readiness)
  const resourceData = ranking?.villages.slice(0, 8).map(v => ({
    name: v.village_name.length > 10 ? v.village_name.substring(0, 10) + '...' : v.village_name,
    medicine: v.medicine_stock_pct || 0,
    staffing: Math.min(100, Math.round(((v.staff_count || 0) / Math.max(1, v.staff_required || 1)) * 100))
  })) || [];

  return (
    <Layout title={`District Officer View`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '-0.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
          {ranking?.district_name ? `District: ${ranking.district_name}` : 'Loading...'}
        </h2>
        <div>
          <label htmlFor="officer-district-select" style={{ marginRight: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Select District:
          </label>
          <select 
            id="officer-district-select"
            className="form-select" 
            style={{ width: 'auto', display: 'inline-block' }}
            value={districtId}
            onChange={(e) => setDistrictId(Number(e.target.value))}
          >
            {districts.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div className="skeleton-card" style={{ height: '100px', borderRadius: '12px' }}></div>
            <div className="skeleton-card" style={{ height: '100px', borderRadius: '12px' }}></div>
            <div className="skeleton-card" style={{ height: '100px', borderRadius: '12px' }}></div>
            <div className="skeleton-card" style={{ height: '100px', borderRadius: '12px' }}></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1.5rem' }}>
            <div className="skeleton-card" style={{ height: '400px', borderRadius: '12px' }}></div>
            <div className="skeleton-card" style={{ height: '400px', borderRadius: '12px' }}></div>
            <div className="skeleton-card" style={{ height: '400px', borderRadius: '12px' }}></div>
          </div>
        </div>
      )}
      
      {!loading && ranking && ranking.villages.length === 0 && (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center', borderRadius: '12px', marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>No villages found in this district.</h3>
          <p style={{ color: 'var(--text-muted)' }}>Please select a different district from the dropdown above.</p>
        </div>
      )}

      {!loading && ranking && ranking.villages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Top KPI Row (4 Cards) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {/* Card 1 */}
            <div className="glass" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderRadius: '12px' }}>
              <div style={{ background: '#d1fae5', color: '#059669', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Home size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>TOTAL VILLAGES</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{totalVillages}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>monitored locations</div>
              </div>
            </div>
            
            {/* Card 2 */}
            <div className="glass" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderRadius: '12px' }}>
              <div style={{ background: '#ffe4e6', color: '#e11d48', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>CRITICAL RISKS</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{criticalCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>require attention</div>
              </div>
            </div>
            
            {/* Card 3 */}
            <div className="glass" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderRadius: '12px' }}>
              <div style={{ background: '#fef3c7', color: '#d97706', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>ACTIVE WORKERS</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }} title="Sample data">
                  18 <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'normal' }}>(sample)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>deployed in field</div>
              </div>
            </div>

            {/* Card 4 */}
            <div className="glass" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderRadius: '12px' }}>
              <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>AVG RISK SCORE</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{avgScore}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>out of 100</div>
              </div>
            </div>
          </div>

          {/* Enhanced Charts Row (3 Columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            
            {/* Chart 1: Gradient Risk Bar Chart */}
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Highest Risk Hotspots</h3>
                <select 
                  className="form-select" 
                  style={{ width: 'auto', padding: '0.35rem 2rem 0.35rem 0.75rem', fontSize: '0.85rem' }}
                  value={barMetric}
                  onChange={(e) => setBarMetric(e.target.value as any)}
                >
                  <option value="composite">Composite Risk</option>
                  <option value="disease_load">Disease Load</option>
                  <option value="staff_vacancy">Staff Vacancy</option>
                  <option value="medicine_gap">Medicine Gap</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 10, left: -20, bottom: 60 }}>
                    <defs>
                      <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} 
                      axisLine={false} 
                      tickLine={false} 
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} 
                      axisLine={false} 
                      tickLine={false} 
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }} 
                      itemStyle={{ color: '#fff' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="score" fill="url(#colorRisk)" radius={[6, 6, 0, 0]} maxBarSize={45} name="Composite Risk" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Resource Readiness (Composed) */}
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Resource Readiness (%)</h3>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resourceData} margin={{ top: 20, right: 10, left: -20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} 
                      axisLine={false} 
                      tickLine={false} 
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} 
                      axisLine={false} 
                      tickLine={false} 
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }} 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} iconType="circle" />
                    <Bar dataKey="medicine" fill="var(--emerald)" radius={[4, 4, 0, 0]} maxBarSize={20} name="Medicine Stock" />
                    <Bar dataKey="staffing" fill="var(--indigo)" radius={[4, 4, 0, 0]} maxBarSize={20} name="Staffing Fill" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Chart 3: Risk Distribution Donut */}
            <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Risk Tiers</h3>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={donutData} 
                      cx="50%" 
                      cy="45%" 
                      innerRadius="55%" 
                      outerRadius="85%" 
                      paddingAngle={5}
                      dataKey="value" 
                      stroke="none"
                    >
                      {donutData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    <Legend 
                      verticalAlign="bottom" 
                      wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Interventions Section */}
          <InterventionPanel districtId={districtId} />

          {/* Lower section: Map and Table */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <div style={{ flex: '1 1 50%', minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass" style={{ padding: '1rem', height: '400px', borderRadius: '12px' }}>
                 <RiskMap villages={ranking.villages} selectedId={selectedVillageId} onSelect={setSelectedVillageId} />
              </div>
              <div className="glass" style={{ padding: '1rem', borderRadius: '12px' }}>
                 <RiskTable villages={ranking.villages} selectedId={selectedVillageId} onSelect={setSelectedVillageId} />
              </div>
            </div>

            <div style={{ flex: '1 1 40%', minWidth: '350px' }}>
              {activeVillage ? (
                <VillageDetail village={activeVillage} districtId={districtId} onClose={() => setSelectedVillageId(null)} />
              ) : (
                <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '12px' }}>
                  <h3>Select a village</h3>
                  <p>Click on a village in the map or table to view detailed risk analysis and run what-if simulations.</p>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ marginTop: '1.5rem' }}>
            <FieldRequestsFeed />
          </div>
        </div>
      )}
    </Layout>
  );
}
