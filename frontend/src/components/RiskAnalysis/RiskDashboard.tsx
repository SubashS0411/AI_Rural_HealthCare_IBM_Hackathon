import { useEffect, useState } from 'react';
import api from '../../services/api';
import RiskMap from './RiskMap';
import RiskTable from './RiskTable';
import VillageDetail from './VillageDetail';
import FieldRequestsFeed from './FieldRequestsFeed';
import DistrictAnalytics from './DistrictAnalytics';
import AllocationPlanner from './AllocationPlanner';
import { AlertCircle, X } from 'lucide-react';

export interface District {
  id: number;
  name: string;
}

export interface VillageRisk {
  village_id: number;
  village_name: string;
  latitude: number | null;
  longitude: number | null;
  population: number;
  composite_score: number;
  active_incident?: boolean;
  dominant_driver: string;
  recommendation: string;
  rank: number;
  factors: {
    disease_load: number;
    staff_vacancy: number;
    medicine_gap: number;
    trend: number;
  };
  staff_count: number | null;
  staff_required: number | null;
  medicine_stock_pct: number | null;
  infrastructure_score: number | null;
}

export interface RankingResponse {
  district_id: number;
  district_name: string;
  villages: VillageRisk[];
  note: string;
}

export default function RiskDashboard() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVillageId, setSelectedVillageId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'planner'>('analytics');

  // ML Anomaly Banner State
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    api.get<District[]>('/districts?limit=100').then((res) => {
      setDistricts(res.data);
      if (res.data.length > 0) {
        setSelectedDistrictId(res.data[0].id);
      }
    });

    // Fetch ML anomalies
    api.get('/ml/anomalies').then(res => {
      if (res.data.anomalies) {
        setAnomalies(res.data.anomalies);
      }
    }).catch(err => console.error(err));
  }, []);

  const [rankingError, setRankingError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDistrictId) {
      setRanking(null);
      return;
    }
    setLoading(true);
    setRankingError(null);
    setSelectedVillageId(null);
    api
      .get<RankingResponse>(`/districts/${selectedDistrictId}/ranking`)
      .then((res) => {
        setRanking(res.data);
        setRankingError(null);
      })
      .catch((err) => {
        console.error('Failed to load ranking', err);
        setRanking(null);  // clear stale rankings from previous district
        setRankingError('Failed to load village rankings. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [selectedDistrictId]);

  const activeVillage = ranking?.villages.find((v) => v.village_id === selectedVillageId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ML Anomaly Banner (Model C) */}
      {showBanner && anomalies.length > 0 && (
        <div style={{ background: 'var(--rose)', color: 'white', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(244, 63, 94, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.9rem' }}>Outbreak Anomaly Detected (Model C)</strong>
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                {anomalies.map(a => `Village #${a.village_id} (${a.disease_type}): ${a.message}`).join(' | ')}
              </span>
            </div>
          </div>
          <button onClick={() => setShowBanner(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Ranking Error State */}
      {rankingError && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
          {rankingError}
        </div>
      )}

      <div className="flex-between">
        <div>
          <label htmlFor="district-select" style={{ marginRight: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Select District:
          </label>
          <select
            id="district-select"
            className="form-select"
            style={{ width: 'auto', display: 'inline-block' }}
            value={selectedDistrictId || ''}
            onChange={(e) => setSelectedDistrictId(Number(e.target.value))}
          >
            {districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Tab Toggle for Right Panel */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '8px' }}>
          <button
            className={`btn ${activeTab === 'analytics' ? 'btn-primary' : ''}`}
            style={{ padding: '0.5rem 1rem', background: activeTab === 'analytics' ? 'var(--indigo)' : 'transparent' }}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button
            className={`btn ${activeTab === 'planner' ? 'btn-primary' : ''}`}
            style={{ padding: '0.5rem 1rem', background: activeTab === 'planner' ? 'var(--indigo)' : 'transparent' }}
            onClick={() => setActiveTab('planner')}
          >
            Allocation Planner
          </button>
        </div>
      </div>

      {loading && <div className="spinner" style={{ marginTop: '2rem' }} />}

      {!loading && ranking && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Left Column: Map & Table */}
            <div style={{ flex: '1 1 50%', minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass" style={{ padding: '1rem', height: '400px' }}>
                <RiskMap villages={ranking.villages} selectedId={selectedVillageId} onSelect={setSelectedVillageId} />
              </div>
              <div className="glass" style={{ padding: '1rem' }}>
                <RiskTable villages={ranking.villages} selectedId={selectedVillageId} onSelect={setSelectedVillageId} />
              </div>
            </div>

            {/* Right Column: Detail Panel, Analytics, or Planner */}
            <div style={{ flex: '1 1 40%', minWidth: '350px' }}>
              {activeVillage ? (
                <VillageDetail village={activeVillage} districtId={selectedDistrictId!} onClose={() => setSelectedVillageId(null)} />
              ) : (
                activeTab === 'analytics'
                  ? <DistrictAnalytics ranking={ranking} />
                  : <AllocationPlanner districtId={selectedDistrictId!} />
              )}
            </div>
          </div>

          <div>
            <FieldRequestsFeed />
          </div>
        </div>
      )}
    </div>
  );
}
