import React, { useState } from 'react';
import api from '../../services/api';
import { X } from 'lucide-react';

interface Props {
  villageId: number;
  villageName: string;
  riskScoreBefore: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PlanInterventionModal({ villageId, villageName, riskScoreBefore, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    resource_type: 'medicine',
    description: '',
    assigned_by: 'System Administrator'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/interventions', {
        village_id: villageId,
        resource_type: form.resource_type,
        description: form.description,
        assigned_by: form.assigned_by,
        risk_score_before: riskScoreBefore
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to plan intervention.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="glass" style={{ width: '450px', padding: '2rem', borderRadius: '12px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        
        <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Plan Intervention</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>VILLAGE</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{villageName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CURRENT RISK SCORE</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--rose)' }}>{riskScoreBefore.toFixed(1)}</div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Resource Type</label>
            <select 
              className="form-select" 
              value={form.resource_type} 
              onChange={e => setForm({...form, resource_type: e.target.value})}
              required
            >
              <option value="medicine">Medicine Supply</option>
              <option value="specialist">Medical Specialist</option>
              <option value="mmu">Mobile Medical Unit</option>
              <option value="testing_kits">Testing Kits</option>
              <option value="awareness">Awareness Campaign</option>
              <option value="vector_control">Vector Control</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Description</label>
            <textarea 
              className="form-input" 
              rows={3}
              placeholder="Detailed plan for the intervention..."
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              required
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn" onClick={onClose} disabled={loading} style={{ background: 'transparent', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Plan Intervention'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
