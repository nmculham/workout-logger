import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { api } from '../lib/api';

interface Props { user: User; }

const MUSCLE_GROUPS = ['Legs', 'Back', 'Chest', 'Shoulders', 'Arms', 'Core', 'Other'];

export default function ExerciseLibrary({ user }: Props) {
  const [exercises, setExercises] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await api.getExercises(user.id);
    setExercises(data);
  }

  useEffect(() => { load(); }, [user.id]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !muscleGroup) return;
    setSaving(true);
    await api.createExercise({ name, muscle_group: muscleGroup, user_id: user.id });
    setName(''); setMuscleGroup(''); setShowForm(false);
    await load();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this exercise?')) return;
    await api.deleteExercise(id);
    await load();
  }

  const filtered = exercises.filter(e => {
    const matchName = e.name.toLowerCase().includes(filter.toLowerCase());
    const matchMuscle = !muscleFilter || e.muscle_group === muscleFilter;
    return matchName && matchMuscle;
  });

  const grouped = MUSCLE_GROUPS.reduce((acc, mg) => {
    const group = filtered.filter(e => e.muscle_group === mg);
    if (group.length) acc[mg] = group;
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 12 }}>
        <h1 style={{ margin: 0, flex: 1 }}>Exercise Library</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Custom'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label>Exercise Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bulgarian Split Squat" required />
          </div>
          <div style={{ flex: 1 }}>
            <label>Muscle Group</label>
            <select value={muscleGroup} onChange={e => setMuscleGroup(e.target.value)} required>
              <option value="">Select...</option>
              {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Add'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search exercises..."
          style={{ flex: 1 }}
        />
        <select value={muscleFilter} onChange={e => setMuscleFilter(e.target.value)} style={{ width: 140 }}>
          <option value="">All muscles</option>
          {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
        </select>
      </div>

      {Object.entries(grouped).map(([mg, exs]) => (
        <div key={mg} style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, color: '#666', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>{mg}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {exs.map(e => (
              <div key={e.id} className="card" style={{ display: 'flex', alignItems: 'center', padding: '10px 14px' }}>
                <span style={{ flex: 1 }}>{e.name}</span>
                {e.is_global
                  ? <span className="badge" style={{ background: '#1e3a5f', color: '#93c5fd', fontSize: 11 }}>Global</span>
                  : <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '2px 8px', color: '#ef4444', borderColor: '#333' }}
                      onClick={() => handleDelete(e.id)}
                    >Delete</button>
                }
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
