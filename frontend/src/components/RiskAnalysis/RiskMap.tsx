import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { VillageRisk } from './RiskDashboard';

interface RiskMapProps {
  villages: VillageRisk[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function MapUpdater({ villages, selectedId }: { villages: VillageRisk[], selectedId: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (villages.length === 0) return;
    
    if (selectedId) {
      const v = villages.find(x => x.village_id === selectedId);
      if (v?.latitude != null && v?.longitude != null) {
        map.flyTo([v.latitude, v.longitude], 12);
        return;
      }
    }
    
    // Auto-center based on all villages with valid coordinates
    const valid = villages.filter(v => v.latitude != null && v.longitude != null);
    if (valid.length > 0) {
      const latSum = valid.reduce((sum, v) => sum + v.latitude!, 0);
      const lngSum = valid.reduce((sum, v) => sum + v.longitude!, 0);
      map.flyTo([latSum / valid.length, lngSum / valid.length], 10);
    }
  }, [villages, selectedId, map]);
  return null;
}

export default function RiskMap({ villages, selectedId, onSelect }: RiskMapProps) {
  // Default center (e.g. Bangladesh approximate center)
  const defaultCenter: [number, number] = [23.685, 90.356];

  const getColor = (score: number) => {
    if (score >= 75) return '#f43f5e'; // rose / critical
    if (score >= 50) return '#f97316'; // high
    if (score >= 25) return '#f59e0b'; // amber / medium
    return '#10b981'; // emerald / low
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <h3 style={{ position: 'absolute', top: 10, left: 50, zIndex: 1000, background: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
        Risk Map
      </h3>
      <MapContainer 
        center={defaultCenter} 
        zoom={7} 
        style={{ height: '100%', width: '100%', borderRadius: 'var(--radius)', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater villages={villages} selectedId={selectedId} />
        
        {villages.map(v => {
          if (v.latitude == null || v.longitude == null) return null;
          const isSelected = v.village_id === selectedId;
          const color = getColor(v.composite_score);
          
          return (
            <CircleMarker
              key={v.village_id}
              center={[v.latitude, v.longitude]}
              radius={isSelected ? 12 : 8}
              fillColor={color}
              color={isSelected ? '#0f172a' : 'white'}
              weight={isSelected ? 3 : 1}
              fillOpacity={0.8}
              eventHandlers={{
                click: () => onSelect(v.village_id),
              }}
            >
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <strong>{v.village_name}</strong><br/>
                  Risk Score: {v.composite_score}<br/>
                  <button 
                    onClick={() => onSelect(v.village_id)}
                    style={{ marginTop: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', background: 'var(--indigo)', color: 'white', border: 'none', borderRadius: '4px' }}
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
