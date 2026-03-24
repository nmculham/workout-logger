import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { api } from '../lib/api';
import ExercisePicker from '../components/ExercisePicker';
import SetRow from '../components/SetRow';

interface Props { user: User; }

export default function WorkoutDetail({ user }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [addingSet, setAddingSet] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await api.getWorkout(id);
    setWorkout(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function addExercise(exerciseId: string) {
    if (!id) return;
    const order = (workout?.exercises?.length ?? 0);
    await api.addExerciseToWorkout(id, { exercise_id: exerciseId, order });
    setShowPicker(false);
    await load();
  }

  async function removeExercise(weId: string) {
    if (!confirm('Remove this exercise and all its sets?')) return;
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

  if (loading) return <div className="page">Loading...</div>;
  if (!workout) return <div className="page">Workout not found.</div>;

  const exerciseList: any[] = workout.exercises ?? [];
  const allSets: any[] = workout.sets ?? [];

  return (
    <div className="page">
      <button className="btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16, fontSize: 13 }}>
        &larr; Back
      </button>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>{workout.name}</h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>{workout.date}</p>
          {workout.notes && <p style={{ color: '#a0a0a0', fontSize: 13, marginTop: 8 }}>{workout.notes}</p>}
        </div>
        <span className={`badge ${workout.synced_at ? 'badge-green' : 'badge-yellow'}`}>
          {workout.synced_at ? 'Synced' : 'Local'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}>
        {exerciseList.map((we: any) => {
          const sets = allSets.filter(s => s.workout_exercise_id === we.id);
          return (
            <div key={we.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{we.exercise_name}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{we.muscle_group}</div>
                </div>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '4px 10px', color: '#ef4444', borderColor: '#ef4444' }}
                  onClick={() => removeExercise(we.id)}
                >
                  Remove
                </button>
              </div>

              {sets.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 1fr 80px', gap: 8, fontSize: 11, color: '#666', marginBottom: 6 }}>
                    <span>#</span><span>Weight</span><span>Reps</span><span>Rest (s)</span><span>RPE</span><span></span>
                  </div>
                  {sets.map(s => (
                    <SetRow key={s.id} set={s} onUpdate={updateSet} onDelete={deleteSet} />
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

      {showPicker && (
        <ExercisePicker
          userId={user.id}
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
