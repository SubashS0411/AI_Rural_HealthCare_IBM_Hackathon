import type { VillageRisk } from './RiskDashboard';

interface RiskTableProps {
  villages: VillageRisk[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function RiskTable({ villages, selectedId, onSelect }: RiskTableProps) {
  const getSeverityBadge = (score: number) => {
    if (score >= 75) return <span className="badge badge-critical">Critical</span>;
    if (score >= 50) return <span className="badge badge-high">High</span>;
    if (score >= 25) return <span className="badge badge-medium">Medium</span>;
    return <span className="badge badge-low">Low</span>;
  };

  const getDriverLabel = (driver: string) => {
    const labels: Record<string, string> = {
      disease_load: 'Disease Load',
      staff_vacancy: 'Staffing Gap',
      medicine_gap: 'Medicine Gap',
      trend: 'Rising Trend',
    };
    return labels[driver] || driver;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
        Village Risk Ranking
      </h3>
      <div className="table-wrapper" style={{ flex: 1, maxHeight: '400px', overflowY: 'auto' }}>
        <table>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th>Rank</th>
              <th>Village</th>
              <th>Risk Score</th>
              <th>Severity</th>
              <th>Top Driver</th>
            </tr>
          </thead>
          <tbody>
            {villages.map((v) => (
              <tr 
                key={v.village_id} 
                onClick={() => onSelect(v.village_id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(v.village_id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Select village ${v.village_name}, risk score ${v.composite_score}`}
                aria-pressed={v.village_id === selectedId}
                style={{ 
                  cursor: 'pointer',
                  background: v.village_id === selectedId ? 'rgba(13, 148, 136, 0.08)' : undefined,
                  borderLeft: v.village_id === selectedId ? '3px solid var(--indigo)' : '3px solid transparent'
                }}
              >
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>#{v.rank}</td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.village_name}</td>
                <td style={{ fontWeight: 700 }}>{v.composite_score}</td>
                <td>{getSeverityBadge(v.composite_score)}</td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {getDriverLabel(v.dominant_driver)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
