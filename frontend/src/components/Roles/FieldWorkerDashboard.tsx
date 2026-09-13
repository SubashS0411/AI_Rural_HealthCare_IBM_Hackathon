import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, MapPin, Plus, ShieldAlert, Send, X, Pill, Flame, Camera, Activity, FileText, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Layout from '../Layout';
import api from '../../services/api';
import type { RankingResponse, VillageRisk } from '../RiskAnalysis/RiskDashboard';

export default function FieldWorkerDashboard() {
  const [tasks, setTasks] = useState<VillageRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  
  // Modal state
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Observation log state
  const [observationText, setObservationText] = useState('');
  const [observationSubmitting, setObservationSubmitting] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<number>(0);
  
  const [incidentForm, setIncidentForm] = useState({ type: 'disease_outbreak', severity: 'high', description: '' });
  const [medicineForm, setMedicineForm] = useState({ name: '', quantity: 10, urgency: 'high', notes: '' });

  const districtId = 1; // MVP Hardcode

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<RankingResponse>(`/districts/${districtId}/ranking`),
      api.get(`/incident-reports?status=resolved`).catch(() => ({ data: [] }))
    ])
      .then(([rankingRes, incidentsRes]) => {
        if (rankingRes.data.villages) {
          // Take top 3 highest risk villages as assigned tasks
          setTasks(rankingRes.data.villages.slice(0, 3));
        }
        setCompletedTasks(incidentsRes.data.length || 0);
      })
      .catch((err) => console.error('Failed to load dashboard data', err))
      .finally(() => setLoading(false));
  }, []);

  const handleResolve = (id: number) => {
    setResolvingId(id);
    setTimeout(() => {
      setTasks(prev => prev.filter(t => t.village_id !== id));
      setResolvingId(null);
    }, 800);
  };

  const getChecklist = (driver: string) => {
    if (driver.includes('medicine')) {
      return [
        'Audit current stock levels',
        'Request emergency supply drop',
        'Log affected patients'
      ];
    }
    if (driver.includes('disease')) {
      return [
        'Conduct door-to-door screening',
        'Distribute preventive kits',
        'Identify outbreak epicenter'
      ];
    }
    return [
      'Assess local clinic status',
      'Report infrastructure gaps',
      'Verify staffing schedules'
    ];
  };

  const submitObservation = async (villageId: number, e: React.FormEvent) => {
    e.preventDefault();
    if (!observationText.trim()) return;
    setObservationSubmitting(true);
    try {
      // Post as a low-severity incident report to the field log endpoint
      await api.post('/incident-reports', {
        village_id: villageId,
        incident_type: 'other',
        severity: 'low',
        description: `[Field Observation] ${observationText.trim()}`,
      });
      setObservationText('');
    } catch (err) {
      console.error('Observation log error', err);
    } finally {
      setObservationSubmitting(false);
    }
  };

  const submitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tasks.length) return;
    setSubmitting(true);
    try {
      await api.post('/incident-reports', {
        village_id: tasks[0].village_id, // Default to top priority village
        incident_type: incidentForm.type,
        severity: incidentForm.severity,
        description: incidentForm.description
      });
      setSubmitStatus('Reported — village flagged');
      setTimeout(() => {
        setSubmitStatus(null);
        setShowIncidentModal(false);
        setIncidentForm({ type: 'disease_outbreak', severity: 'high', description: '' });
      }, 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const submitMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tasks.length) return;
    setSubmitting(true);
    try {
      await api.post('/medicine-requests', {
        village_id: tasks[0].village_id,
        medicine_name: medicineForm.name,
        quantity_needed: Number(medicineForm.quantity),
        urgency: medicineForm.urgency,
        notes: medicineForm.notes
      });
      setSubmitStatus('Medicine Requested');
      setTimeout(() => {
        setSubmitStatus(null);
        setShowMedicineModal(false);
        setMedicineForm({ name: '', quantity: 10, urgency: 'high', notes: '' });
      }, 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const progressData = completedTasks > 0 
    ? [
        { name: 'Completed', value: completedTasks, fill: '#10b981' }, // emerald
        { name: 'Pending', value: tasks.length, fill: '#6366f1' } // indigo
      ]
    : [
        { name: 'Pending', value: tasks.length, fill: '#6366f1' } // indigo
      ];

  return (
    <Layout title="Field Tasks">
      {loading && <div className="spinner" style={{ margin: '4rem auto' }} />}
      
      {!loading && (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>Active Queue</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                You have {tasks.length} priority assignments today
              </p>
            </div>
            {tasks.length > 0 && (
              <span className="badge badge-error" style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem' }}>
                <ShieldAlert size={14} style={{ marginRight: '0.25rem' }} />
                Action Required
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: 'var(--emerald)', border: 'none' }}
              onClick={() => setShowMedicineModal(true)}
            >
              <Pill size={18} />
              Request Medicine
            </button>
          </div>

          {/* Weekly Progress Donut Chart */}
          <div className="glass" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: 'var(--text-primary)' }}>Weekly Progress</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {completedTasks > 0 ? `You've completed ${completedTasks} tasks this week!` : `You have ${tasks.length} pending assignments.`}
              </div>
            </div>
            <div style={{ height: '80px', width: '80px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={progressData} cx="50%" cy="50%" innerRadius={25} outerRadius={35} dataKey="value" stroke="none">
                    {progressData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: 'none', borderRadius: '4px', fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AnimatePresence>
              {tasks.map((task) => {
                const isExpanded = expandedId === task.village_id;
                const isResolving = resolvingId === task.village_id;
                const checklist = getChecklist(task.dominant_driver);
                
                return (
                  <motion.div
                    key={task.village_id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 100 }}
                    transition={{ duration: 0.3 }}
                    className="glass"
                    style={{ 
                      overflow: 'hidden',
                      borderLeft: `4px solid ${task.composite_score > 75 ? 'var(--rose)' : 'var(--amber)'}`,
                      opacity: isResolving ? 0.5 : 1
                    }}
                  >
                    {/* Header / Condensed View */}
                    <div 
                      onClick={() => !isResolving && setExpandedId(isExpanded ? null : task.village_id)}
                      style={{ 
                        padding: '1.25rem', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: isResolving ? 'default' : 'pointer'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{task.village_name}</h3>
                          {task.composite_score > 75 && (
                            <AlertTriangle size={14} color="var(--rose)" />
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          <MapPin size={12} />
                          <span>{task.dominant_driver.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: task.composite_score > 75 ? 'var(--rose)' : 'var(--amber)' }}>
                            {Math.round(task.composite_score)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SCORE</div>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded View */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                        >
                          <div style={{ padding: '1.25rem' }}>
                            <div style={{ marginBottom: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '8px', borderLeft: '2px solid var(--emerald)' }}>
                              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--emerald)' }}>Recommended Action</h4>
                              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{task.recommendation}</p>
                            </div>

                            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Intervention Checklist</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                              {checklist.map((item, idx) => (
                                <label key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                                  <input type="checkbox" style={{ marginTop: '0.25rem', accentColor: 'var(--cyan)', width: '1.1rem', height: '1.1rem' }} />
                                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item}</span>
                                </label>
                              ))}
                            </div>

                            {/* New Expanded Fields */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LAST VISITED</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                  Oct 12 (3 days ago) <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'normal' }}>(sample)</span>
                                </div>
                              </div>
                              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PATIENTS SCREENED</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                  45 / 50 Target <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'normal' }}>(sample)</span>
                                </div>
                              </div>
                            </div>

                            {/* ML Feedback Loop Form */}
                            <div style={{ marginBottom: '1.5rem', background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <Activity size={18} color="var(--indigo)" />
                                <label htmlFor={`obs-${task.village_id}`} style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>Log Field Observation</label>
                              </div>
                              <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Record new symptoms, case counts, or observations.</p>
                              
                              <form onSubmit={(e) => submitObservation(task.village_id, e)} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ position: 'relative', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                  {/* Hidden file input for camera/file attachment */}
                                  <input type="file" id={`file-attach-${task.village_id}`} accept="image/*" style={{ display: 'none' }} />
                                  <textarea 
                                    id={`obs-${task.village_id}`}
                                    aria-label="Log field observation"
                                    placeholder="e.g. 5 new malaria cases found today, rapid tests positive..." 
                                    className="form-input" 
                                    rows={2}
                                    value={observationText}
                                    onChange={e => setObservationText(e.target.value)}
                                    style={{ 
                                      width: '100%', 
                                      padding: '0.75rem', 
                                      paddingBottom: '2.5rem',
                                      fontSize: '0.875rem', 
                                      border: 'none',
                                      borderRadius: '8px',
                                      resize: 'none',
                                      background: 'transparent',
                                      // Preserve focus ring — do NOT override boxShadow here
                                    }} 
                                  />
                                  <div style={{ position: 'absolute', bottom: '0.4rem', right: '0.4rem', left: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                      <button 
                                        type="button"
                                        className="btn btn-outline" 
                                        style={{ padding: '0.25rem', border: 'none', color: 'var(--text-muted)' }} 
                                        title="Attach Photo"
                                        aria-label="Attach photo"
                                        onClick={() => document.getElementById(`file-attach-${task.village_id}`)?.click()}
                                      >
                                        <Camera size={18} />
                                      </button>
                                      <button 
                                        type="button"
                                        className="btn btn-outline" 
                                        style={{ padding: '0.25rem', border: 'none', color: 'var(--text-muted)' }} 
                                        title="Attach File"
                                        aria-label="Attach file"
                                        onClick={() => document.getElementById(`file-attach-${task.village_id}`)?.click()}
                                      >
                                        <FileText size={18} />
                                      </button>
                                    </div>
                                    <button 
                                      type="submit"
                                      disabled={observationSubmitting || !observationText.trim()}
                                      className="btn btn-primary" 
                                      style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                      aria-label="Submit field observation"
                                    >
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{observationSubmitting ? '...' : 'Log'}</span>
                                      <Send size={14} />
                                    </button>
                                  </div>
                                </div>
                              </form>
                            </div>

                            <button 
                              onClick={(e) => { e.stopPropagation(); handleResolve(task.village_id); }}
                              disabled={isResolving}
                              className="btn btn-primary"
                              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                            >
                              {isResolving ? (
                                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                              ) : (
                                <>
                                  <CheckCircle2 size={18} style={{ marginRight: '0.5rem' }} />
                                  Mark as Resolved
                                </>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {tasks.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <CheckCircle2 size={48} color="var(--emerald)" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>All Caught Up!</h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>You have no priority tasks in your queue.</p>
              </motion.div>
            )}
          </div>

          {/* Floating Action Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowIncidentModal(true)}
            title="Report Incident"
            style={{
              position: 'fixed',
              bottom: '2rem',
              right: '2rem',
              width: '56px',
              height: '56px',
              borderRadius: '28px',
              background: 'linear-gradient(135deg, var(--cyan), var(--indigo))',
              color: '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              zIndex: 100
            }}
          >
            <Plus size={28} />
          </motion.button>

        </div>
      )}

      {/* Incident Modal */}
      <AnimatePresence>
        {showIncidentModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--rose)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Flame color="var(--rose)" size={20} /> Report Incident
                </h3>
                <button onClick={() => setShowIncidentModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              {submitStatus ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <CheckCircle2 color="var(--emerald)" size={48} style={{ margin: '0 auto 1rem' }} />
                  <h4 style={{ color: 'var(--emerald)' }}>{submitStatus}</h4>
                </div>
              ) : (
                <form onSubmit={submitIncident} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                      <AlertCircle size={16} color="var(--text-muted)" /> Incident Type
                    </label>
                    <select className="form-select" value={incidentForm.type} onChange={(e) => setIncidentForm({...incidentForm, type: e.target.value})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }}>
                      <option value="disease_outbreak">Disease Outbreak</option>
                      <option value="injury">Mass Injury</option>
                      <option value="environmental">Environmental / Weather</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>Severity Level</label>
                    <div role="radiogroup" aria-label="Incident severity" style={{ display: 'flex', gap: '0.5rem' }}>
                      {[
                        { label: 'Critical', val: 'critical', color: 'var(--rose)', darkText: false },
                        { label: 'High', val: 'high', color: '#b45309', darkText: false },     // dark amber for contrast
                        { label: 'Medium', val: 'medium', color: 'var(--indigo)', darkText: false },
                        { label: 'Low', val: 'low', color: '#065f46', darkText: false }           // dark emerald for contrast
                      ].map((sev) => (
                        <button 
                          key={sev.val}
                          type="button"
                          role="radio"
                          aria-checked={incidentForm.severity === sev.val}
                          onClick={() => setIncidentForm({...incidentForm, severity: sev.val})}
                          style={{
                            flex: 1, textAlign: 'center', padding: '0.6rem 0.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                            background: incidentForm.severity === sev.val ? sev.color : 'var(--bg-secondary)',
                            color: incidentForm.severity === sev.val ? '#fff' : 'var(--text-secondary)',
                            border: incidentForm.severity === sev.val ? `2px solid ${sev.color}` : '2px solid transparent',
                            transition: 'all 0.2s',
                          }}
                        >
                          {sev.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>Description</label>
                    <textarea className="form-input" rows={3} value={incidentForm.description} onChange={(e) => setIncidentForm({...incidentForm, description: e.target.value})} required placeholder="Provide details about the incident, affected individuals, and immediate needs..." style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }}></textarea>
                  </div>
                  <button type="submit" disabled={submitting || tasks.length === 0} className="btn btn-primary" style={{ background: 'var(--rose)', border: 'none', marginTop: '0.5rem', padding: '0.875rem', fontSize: '1rem' }}>
                    {submitting ? 'Submitting...' : 'Submit Incident Report'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Medicine Modal */}
      <AnimatePresence>
        {showMedicineModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--emerald)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Pill color="var(--emerald)" size={20} /> Request Medicine
                </h3>
                <button onClick={() => setShowMedicineModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              {submitStatus ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <CheckCircle2 color="var(--emerald)" size={48} style={{ margin: '0 auto 1rem' }} />
                  <h4 style={{ color: 'var(--emerald)' }}>{submitStatus}</h4>
                </div>
              ) : (
                <form onSubmit={submitMedicine} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>Medicine Name</label>
                    <input type="text" className="form-input" value={medicineForm.name} onChange={(e) => setMedicineForm({...medicineForm, name: e.target.value})} required placeholder="e.g. Paracetamol, ORS" style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>Quantity</label>
                        <input type="number" min="1" className="form-input" value={medicineForm.quantity} onChange={(e) => setMedicineForm({...medicineForm, quantity: Number(e.target.value)})} required style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }} />
                      </div>
                      <div style={{ flex: 2 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>Urgency</label>
                        <div role="radiogroup" aria-label="Medicine urgency" style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px' }}>
                          {['low', 'medium', 'high'].map((urg) => (
                            <button 
                              key={urg}
                              type="button"
                              role="radio"
                              aria-checked={medicineForm.urgency === urg}
                              onClick={() => setMedicineForm({...medicineForm, urgency: urg})}
                              style={{
                                flex: 1, textAlign: 'center', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
                                background: medicineForm.urgency === urg ? 'var(--bg-card)' : 'transparent',
                                // Use dark text (#065f46) on selected emerald to meet WCAG-AA contrast
                                color: medicineForm.urgency === urg ? '#065f46' : 'var(--text-secondary)',
                                border: medicineForm.urgency === urg ? '1px solid var(--border)' : '1px solid transparent',
                                boxShadow: medicineForm.urgency === urg ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s'
                              }}
                            >
                              {urg}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>Notes (Optional)</label>
                    <textarea className="form-input" rows={2} value={medicineForm.notes} onChange={(e) => setMedicineForm({...medicineForm, notes: e.target.value})} placeholder="Reason for request, e.g. Out of stock due to recent flu..." style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }}></textarea>
                  </div>
                  <button type="submit" disabled={submitting || tasks.length === 0} className="btn btn-primary" style={{ background: 'var(--emerald)', border: 'none', marginTop: '0.5rem', padding: '0.875rem', fontSize: '1rem' }}>
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </Layout>
  );
}
