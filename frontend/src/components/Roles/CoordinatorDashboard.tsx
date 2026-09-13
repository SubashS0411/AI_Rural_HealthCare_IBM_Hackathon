import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Truck, Activity, PackageSearch, MapPin } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import Layout from '../Layout';
import api from '../../services/api';

interface Village {
  id: number;
  name: string;
  code: string;
  population: number;
}

const INVENTORY_DATA = [
  { name: 'Rangpur', medicine: 65, equipment: 80 },
  { name: 'Dinajpur', medicine: 28, equipment: 45 },
  { name: 'Kurigram', medicine: 90, equipment: 75 },
  { name: 'Gaibandha', medicine: 15, equipment: 30 },
];

export default function CoordinatorDashboard() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeUnits, setActiveUnits] = useState([
    { id: 'MU-01', location: 'Dinajpur Cluster', status: 'en-route' },
    { id: 'MU-02', location: 'Kurigram Base', status: 'idle' },
  ]);
  const [selectedVillage, setSelectedVillage] = useState('');
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    api.get<Village[]>('/villages?limit=5')
      .then(({ data }) => setVillages(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleDispatch = () => {
    if (!selectedVillage) return;
    setDispatching(true);
    setTimeout(() => {
      const v = villages.find((v) => v.code === selectedVillage);
      if (v) {
        setActiveUnits(prev => [{ id: `MU-0${prev.length + 1}`, location: v.name, status: 'en-route' }, ...prev]);
      }
      setSelectedVillage('');
      setDispatching(false);
    }, 1200);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <Layout title="Operations Dashboard">
      <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Top Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          
          <motion.div variants={itemVariants} className="glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--indigo)' }}>
            <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: 'var(--indigo)' }}>
              <Truck size={28} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Active Mobile Units</p>
              <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.75rem', color: 'var(--text-primary)' }}>{activeUnits.length}</h3>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--emerald)' }}>
            <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: 'var(--emerald)' }}>
              <PackageSearch size={28} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Inventory Health</p>
              <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.75rem', color: 'var(--text-primary)' }}>
                68% <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'normal' }}>(sample)</span>
              </h3>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--rose)' }}>
            <div style={{ padding: '1rem', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '12px', color: 'var(--rose)' }}>
              <Activity size={28} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Critical Priority Clusters</p>
              <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.75rem', color: 'var(--text-primary)' }}>
                2 <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'normal' }}>(sample)</span>
              </h3>
            </div>
          </motion.div>
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          
          {/* Dispatch Center */}
          <motion.div variants={itemVariants} className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
              <MapPin size={20} color="var(--cyan)" /> Unit Dispatch
            </h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
              <select 
                className="form-input" 
                style={{ flex: 1 }}
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                disabled={dispatching || loading}
              >
                <option value="">Select Priority Cluster...</option>
                {villages.map(v => <option key={v.code} value={v.code}>{v.name} ({v.code})</option>)}
              </select>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDispatch}
                disabled={!selectedVillage || dispatching}
                className="btn btn-primary"
                style={{ width: '120px', justifyContent: 'center' }}
              >
                {dispatching ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}/> : 'Deploy'}
              </motion.button>
            </div>

            <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Deployments
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <AnimatePresence>
                {activeUnits.map(unit => (
                  <motion.div 
                    key={unit.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{ 
                      padding: '1rem', 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Truck size={18} color={unit.status === 'en-route' ? 'var(--cyan)' : 'var(--text-muted)'} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{unit.id}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{unit.location}</div>
                      </div>
                    </div>
                    {unit.status === 'en-route' ? (
                      <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--cyan)' }}>En Route</span>
                    ) : (
                      <span className="badge badge-default">Idle</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Inventory Graph */}
          <motion.div variants={itemVariants} className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--text-primary)' }}>
                <PackageSearch size={20} color="var(--emerald)" /> Regional Inventory Levels
              </h3>
              <span className="badge badge-default">Sample Data</span>
            </div>
            
            <div style={{ flex: 1, minHeight: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={INVENTORY_DATA} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="medicine" name="Medicine Stock %" radius={[4, 4, 0, 0]}>
                    {INVENTORY_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.medicine < 30 ? 'var(--rose)' : 'var(--emerald)'} />
                    ))}
                  </Bar>
                  <Bar dataKey="equipment" name="Equipment Stock %" fill="var(--indigo)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </Layout>
  );
}
