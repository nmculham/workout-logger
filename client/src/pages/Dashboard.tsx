import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { api } from '../lib/api';

interface Props { user: User; }

export default function Dashboard({ user }: Props) {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [shown, setShown] = useState(5);

  useEffect(() => {
    api.getWorkouts(user.id).then(setWorkouts).catch(console.error);
  }, [user.id]);

  const recent = workouts.slice(0, shown);
  const thisWeek = workouts.filter(w => {
    const d = new Date(w.date);
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  }).length;

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ margin: 0, flex: 1 }}>Dashboard</h1>
        <Link to="/workout/new">
          <button className="btn-primary">+ New Workout</button>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{workouts.length}</div>
          <div style={{ color: '#666', fontSize: 13 }}>Total Workouts</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{thisWeek}</div>
          <div style={{ color: '#666', fontSize: 13 }}>This Week</div>
        </div>
      </div>

      <h2 style={{ fontSize: 16, color: '#a0a0a0', marginBottom: 12 }}>Recent Workouts</h2>
      {recent.length === 0
        ? <p style={{ color: '#555' }}>No workouts yet. <Link to="/workout/new" style={{ color: '#6366f1' }}>Start one!</Link></p>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recent.map(w => (
              <Link to={`/workout/${w.id}`} key={w.id}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{w.name}</div>
                    <div style={{ fontSize: 13, color: '#666' }}>
                      {new Date(w.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
      }
      {workouts.length > shown && (
        <button
          className="btn-ghost"
          style={{ marginTop: 10, width: '100%' }}
          onClick={() => setShown(s => s + 5)}
        >
          Show more
        </button>
      )}
    </div>
  );
}
