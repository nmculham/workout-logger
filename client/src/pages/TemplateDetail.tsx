import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { api } from '../lib/api';
import ExercisePicker from '../components/ExercisePicker';
import SetRow, { type SetRowHandle } from '../components/SetRow';
import Dialog from '../components/Dialog';
import { useDialog } from '../hooks/useDialog';
import { useUnits } from '../contexts/UnitsContext';

interface Props { user: User; }

export default function TemplateDetail({ user }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [addingSet, setAddingSet] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const { dialogConfig, confirm } = useDialog();
  const { weightLabel } = useUnits();
  const setRowRefs = useRef<Map<string, SetRowHandle>>(new Map());

  const load = useCallback(async () => {
    if (!id) return;
    const data = await api.getTemplate(id);
    setTemplate(data);
    if (data) {
      setName(data.name ?? '');
      setNotes(data.notes ?? '');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleBack() {
    await Promise.all([...setRowRefs.current.values()].map(r => r.flush()));
    await saveDetails();
    navigate('/templates');
  }

  async function saveDetails() {
    if (!template) return;
    const finalName = name.trim() || template.name;
    if (finalName === template.name && (notes.trim() || null) === (template.notes ?? null)) return;
    await api.updateTemplate(template.id, { name: finalName, notes: notes.trim() || undefined });
    setTemplate((t: any) => ({ ...t, name: finalName, notes: notes.trim() || null }));
  }

  async function addExercise(exerciseId: string) {
    if (!id) return;
    const order = template?.exercises?.length ?? 0;
    await api.addExerciseToTemplate(id, { exercise_id: exerciseId, order });
    setShowPicker(false);
    await load();
  }

  async function removeExercise(teId: string) {
    if (!await confirm('Remove this exercise and all its sets?')) return;
    await api.removeTemplateExercise(teId);
    await load();
  }

  async function addSet(teId: string) {
    setAddingSet(teId);
    const existingSets = (template.sets as any[]).filter((s: any) => s.template_exercise_id === teId);
    await api.createTemplateSet({
      template_exercise_id: teId,
      set_number: existingSets.length + 1,
      reps: null,
      weight: null,
    });
    await load();
    setAddingSet(null);
  }

  async function deleteSet(setId: string) {
    await api.deleteTemplateSet(setId);
    await load();
  }

  async function updateSet(setId: string, updates: object) {
    await api.updateTemplateSet(setId, updates);
    await load();
  }

  if (loading) return <div className="page">Loading...</div>;
  if (!template) return <div className="page">Template not found.</div>;

  const exerciseList: any[] = template.exercises ?? [];
  const allSets: any[] = template.sets ?? [];

  return (
    <div className="page">
      <button className="btn-ghost" onClick={handleBack} style={{ marginBottom: 16, fontSize: 13 }}>
        &larr; Back to Templates
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
        <div>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Template name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={saveDetails}
            placeholder="Template name"
            style={{ width: '100%', padding: '10px 12px', fontSize: 18, fontWeight: 600, border: '1px solid #333', borderRadius: 8, background: '#1a1a1a', color: 'inherit' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={saveDetails}
            placeholder="Optional notes..."
            rows={2}
            style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #333', borderRadius: 8, background: '#1a1a1a', color: 'inherit', resize: 'vertical' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 16 }}>
        {exerciseList.map((te: any) => {
          const sets = allSets.filter(s => s.template_exercise_id === te.id);
          return (
            <div key={te.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{te.exercise_name}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{te.muscle_group}</div>
                </div>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '4px 10px', color: '#ef4444', borderColor: '#ef4444' }}
                  onClick={() => removeExercise(te.id)}
                >
                  Remove
                </button>
              </div>

              {sets.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 1fr 80px', gap: 8, fontSize: 11, color: '#666', marginBottom: 6 }}>
                    <span>#</span><span>Weight ({weightLabel})</span><span>Reps</span><span>Rest (s)</span><span>RPE</span><span></span>
                  </div>
                  {sets.map(s => (
                    <SetRow
                      key={s.id}
                      ref={el => { if (el) setRowRefs.current.set(s.id, el); else setRowRefs.current.delete(s.id); }}
                      set={s}
                      onUpdate={updateSet}
                      onDelete={deleteSet}
                    />
                  ))}
                </div>
              )}

              <button
                className="btn-ghost"
                style={{ width: '100%', fontSize: 13 }}
                onClick={() => addSet(te.id)}
                disabled={addingSet === te.id}
              >
                {addingSet === te.id ? 'Adding...' : '+ Add Set'}
              </button>
            </div>
          );
        })}
      </div>

      <button
        className="btn-primary"
        style={{ marginTop: 20, width: '100%' }}
        onClick={() => setShowPicker(true)}
      >
        + Add Exercise
      </button>

      {showPicker && (
        <ExercisePicker
          userId={user.id}
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
      {dialogConfig && <Dialog config={dialogConfig} />}
    </div>
  );
}
