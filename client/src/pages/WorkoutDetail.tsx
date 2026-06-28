import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { api } from '../lib/api';
import ExercisePicker from '../components/ExercisePicker';
import SetRow, { type SetRowHandle } from '../components/SetRow';
import Dialog from '../components/Dialog';
import { useDialog } from '../hooks/useDialog';
import { useTempoTimer, PHASE_LABELS } from '../hooks/useTempoTimer';
import type { Tempo } from '../hooks/useTempoTimer';

interface Props { user: User; }

interface ExerciseTempo {
  enabled: boolean;
  eccentric: number;
  pauseBottom: number;
  concentric: number;
  pauseTop: number;
}

const DEFAULT_TEMPO: ExerciseTempo = { enabled: false, eccentric: 3, pauseBottom: 1, concentric: 2, pauseTop: 1 };

export default function WorkoutDetail({ user }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [addingSet, setAddingSet] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const { dialogConfig, confirm, prompt } = useDialog();
  const setRowRefs = useRef<Map<string, SetRowHandle>>(new Map());
  const [tempoState, setTempoState] = useState<Record<string, ExerciseTempo>>({});
  const [activeTimerWeId, setActiveTimerWeId] = useState<string | null>(null);
  const timer = useTempoTimer();
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function handleBack() {
    await Promise.all([...setRowRefs.current.values()].map(r => r.flush()));
    navigate(-1);
  }

  const load = useCallback(async () => {
    if (!id) return;
    const data = await api.getWorkout(id);
    setWorkout(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!workout?.exercises) return;
    setTempoState(prev => {
      const next = { ...prev };
      for (const we of workout.exercises) {
        if (next[we.id]) continue;
        let meta: any = {};
        try { meta = JSON.parse(we.metadata || '{}'); } catch {}
        next[we.id] = meta.tempo ? { enabled: true, ...meta.tempo } : { ...DEFAULT_TEMPO };
      }
      return next;
    });
  }, [workout]);

  function toggleTempo(weId: string) {
    const current = tempoState[weId] ?? { ...DEFAULT_TEMPO };
    const next = { ...current, enabled: !current.enabled };
    if (!next.enabled && activeTimerWeId === weId) {
      timer.stop();
      setActiveTimerWeId(null);
    }
    setTempoState(prev => ({ ...prev, [weId]: next }));
    api.updateWorkoutExerciseMeta(weId, next.enabled
      ? { tempo: { eccentric: next.eccentric, pauseBottom: next.pauseBottom, concentric: next.concentric, pauseTop: next.pauseTop } }
      : {}
    );
  }

  function updateTempoValue(weId: string, field: keyof Tempo, value: number) {
    const current = tempoState[weId] ?? { ...DEFAULT_TEMPO, enabled: true };
    const next = { ...current, [field]: value };
    setTempoState(prev => ({ ...prev, [weId]: next }));
    if (debounceRefs.current[weId]) clearTimeout(debounceRefs.current[weId]);
    debounceRefs.current[weId] = setTimeout(() => {
      api.updateWorkoutExerciseMeta(weId, { tempo: { eccentric: next.eccentric, pauseBottom: next.pauseBottom, concentric: next.concentric, pauseTop: next.pauseTop } });
    }, 500);
  }

  function startTimer(weId: string) {
    const t = tempoState[weId];
    if (!t) return;
    setActiveTimerWeId(weId);
    timer.start({ eccentric: t.eccentric, pauseBottom: t.pauseBottom, concentric: t.concentric, pauseTop: t.pauseTop });
  }

  function stopTimer() {
    timer.stop();
    setActiveTimerWeId(null);
  }

  async function addExercise(exerciseId: string) {
    if (!id) return;
    const order = (workout?.exercises?.length ?? 0);
    await api.addExerciseToWorkout(id, { exercise_id: exerciseId, order });
    setShowPicker(false);
    await load();
  }

  async function removeExercise(weId: string) {
    if (!await confirm('Remove this exercise and all its sets?')) return;
    await api.removeExerciseFromWorkout(weId);
    await load();
  }

  async function addSet(weId: string) {
    setAddingSet(weId);
    const existingSets = (workout.sets as any[]).filter((s: any) => s.workout_exercise_id === weId);
    await api.createSet({
      workout_exercise_id: weId,
      set_number: existingSets.length + 1,
      reps: null,
      weight: null,
    });
    await load();
    setAddingSet(null);
  }

  async function deleteSet(setId: string) {
    await api.deleteSet(setId);
    await load();
  }

  async function updateSet(setId: string, updates: object) {
    await api.updateSet(setId, updates);
    await load();
  }

  async function saveAsTemplate() {
    if (!workout) return;
    const name = await prompt('Template name:', workout.name);
    if (name === null) return;
    setSavingTemplate(true);
    try {
      await api.saveAsTemplate(workout.id, name.trim() || workout.name);
    } catch (err: any) {
      setTemplateError(err.message);
    } finally {
      setSavingTemplate(false);
    }
  }

  if (loading) return <div className="page">Loading...</div>;
  if (!workout) return <div className="page">Workout not found.</div>;

  const exerciseList: any[] = workout.exercises ?? [];
  const allSets: any[] = workout.sets ?? [];

  return (
    <div className="page">
      <button className="btn-ghost" onClick={handleBack} style={{ marginBottom: 16, fontSize: 13 }}>
        &larr; Back
      </button>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>{workout.name}</h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>
            {new Date(workout.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
          </p>
          {workout.notes && <p style={{ color: '#a0a0a0', fontSize: 13, marginTop: 8 }}>{workout.notes}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}>
        {exerciseList.map((we: any) => {
          const sets = allSets.filter(s => s.workout_exercise_id === we.id);
          const tempo = tempoState[we.id];
          const isTimerRunning = activeTimerWeId === we.id && timer.state !== null;
          const canPlay = tempo?.enabled && tempo.eccentric >= 1 && tempo.pauseBottom >= 1 && tempo.concentric >= 1 && tempo.pauseTop >= 1;
          return (
            <div key={we.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: tempo?.enabled ? 8 : 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{we.exercise_name}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{we.muscle_group}</div>
                </div>
                {canPlay && !isTimerRunning && (
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 14, padding: '4px 10px', marginRight: 6 }}
                    onClick={() => startTimer(we.id)}
                  >
                    ▶
                  </button>
                )}
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '4px 10px', marginRight: 6, ...(tempo?.enabled ? { color: '#3b82f6', borderColor: '#3b82f6' } : {}) }}
                  onClick={() => toggleTempo(we.id)}
                >
                  Tempo
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '4px 10px', color: '#ef4444', borderColor: '#ef4444' }}
                  onClick={() => removeExercise(we.id)}
                >
                  Remove
                </button>
              </div>

              {tempo?.enabled && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                  {(['eccentric', 'pauseBottom', 'concentric', 'pauseTop'] as const).map((field, i) => (
                    <div key={field} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 10, color: '#666' }}>{['E', 'P', 'C', 'P'][i]}</span>
                      <input
                        type="number"
                        min={1}
                        max={9}
                        value={tempo[field]}
                        onChange={e => updateTempoValue(we.id, field, Math.max(1, parseInt(e.target.value) || 1))}
                        style={{ width: 40, textAlign: 'center', padding: '4px 2px', border: '1px solid #333', borderRadius: 6, background: '#1a1a1a', color: 'inherit', fontSize: 14 }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {isTimerRunning && timer.state && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: '#0f172a', border: '1px solid #3b82f6', marginBottom: 12 }}>
                  <span style={{ flex: 1, fontWeight: 600, color: '#93c5fd' }}>{PHASE_LABELS[timer.state.phase]}</span>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#fff', minWidth: 32, textAlign: 'right' }}>{timer.state.secondsLeft}</span>
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 8px', marginLeft: 4 }} onClick={stopTimer}>⏹</button>
                </div>
              )}

              {sets.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 1fr 80px', gap: 8, fontSize: 11, color: '#666', marginBottom: 6 }}>
                    <span>#</span><span>Weight</span><span>Reps</span><span>Rest (s)</span><span>RPE</span><span></span>
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
                onClick={() => addSet(we.id)}
                disabled={addingSet === we.id}
              >
                {addingSet === we.id ? 'Adding...' : '+ Add Set'}
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

      <button
        className="btn-ghost"
        style={{ marginTop: 10, width: '100%' }}
        onClick={() => { setTemplateError(null); saveAsTemplate(); }}
        disabled={savingTemplate}
      >
        {savingTemplate ? 'Saving...' : 'Save as Template'}
      </button>
      {templateError && (
        <p style={{ color: '#ef4444', fontSize: 13, margin: '6px 0 0', textAlign: 'center' }}>
          Failed to save template: {templateError}
        </p>
      )}

      <button
        className="btn-primary"
        style={{ marginTop: 10, width: '100%', background: '#22c55e', borderColor: '#22c55e' }}
        onClick={async () => { await Promise.all([...setRowRefs.current.values()].map(r => r.flush())); navigate('/history'); }}
      >
        Finish Workout
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
