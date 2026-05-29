import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { api } from '../lib/api';
import TemplatePicker from '../components/TemplatePicker';

interface Props { user: User; }

export default function NewWorkout({ user }: Props) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  function handleTemplateSelect(templateId: string, templateName: string) {
    setSelectedTemplateId(templateId);
    if (!name.trim()) setName(templateName);
    setShowTemplatePicker(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError('');
    try {
      let id: string;
      if (selectedTemplateId) {
        ({ id } = await api.applyTemplate(selectedTemplateId, { user_id: user.id, name, date }));
      } else {
        ({ id } = await api.createWorkout({ user_id: user.id, name, date, notes }));
      }
      navigate(`/workout/${id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <h1 style={{ marginBottom: 24 }}>New Workout</h1>
      <button
        type="button"
        className="btn-ghost"
        style={{ marginBottom: 12, width: '100%' }}
        onClick={() => setShowTemplatePicker(true)}
      >
        Load from Template
      </button>

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label>Workout Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Push Day, Leg Day..."
            autoFocus
            required
          />
        </div>
        <div>
          <label>Date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div>
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="How are you feeling? Any goals for this session?"
          />
        </div>
        {selectedTemplateId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#a0a0a0' }}>
            <span>Template loaded</span>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={() => setSelectedTemplateId(null)}
            >
              Clear
            </button>
          </div>
        )}
        {error && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Creating...' : 'Start Workout'}
          </button>
        </div>
      </form>
    </div>
  );
}
