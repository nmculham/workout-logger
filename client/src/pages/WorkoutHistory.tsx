import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { api } from '../lib/api';

interface Props { user: User; }

export default function WorkoutHistory({ user }: Props) {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWorkouts(user.id)
      .then(setWorkouts)
      .finally(() => setLoading(false));
  }, [user.id]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm('Delete this workout?')) return;
    await api.deleteWorkout(id);
    setWorkouts(prev => prev.filter(w => w.id !== id));
  }

  if (loading) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, flex: 1 }}>Workout History</h1>
        <Link to="/workout/new"><button className="btn-primary">+ New Workout</button></Link>
      </div>

      {workouts.length === 0
        ? <p style={{ color: '#555' }}>No workouts logged yet.</p>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {workouts.map(w => (
              <Link to={`/workout/${w.id}`} key={w.id}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{w.name}</div>
                    <div style={{ fontSize: 13, color: '#666' }}>{w.date}</div>
                    {w.notes && <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{w.notes}</div>}
                  </div>
                  <span className={`badge ${w.synced_at ? 'badge-green' : 'badge-yellow'}`}>
                    {w.synced_at ? 'Synced' : 'Local'}
                  </span>
                  <button
                    className="btn-danger"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={e => handleDelete(w.id, e)}
                  >
                    Delete
                  </button>
                </div>
              </Link>
            ))}
          </div>
      }
    </div>
  );
}
