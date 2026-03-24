import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { api } from '../lib/api';

interface Props { user: User; }

export default function Dashboard({ user }: Props) {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    api.getWorkouts(user.id).then(setWorkouts).catch(console.error);
  }, [user.id]);

  async function handleSync() {
    setSyncing(true); setSyncMsg('');
    try {
      const push = await api.syncPush();
      const pull = await api.syncPull(user.id);
      setSyncMsg(`Pushed ${push.pushed} changes. Pulled ${pull.workouts} workouts.`);
      const updated = await api.getWorkouts(user.id);
      setWorkouts(updated);
    } catch (err: any) {
      setSyncMsg('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  }

  const recent = workouts.slice(0, 5);

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ margin: 0, flex: 1 }}>Dashboard</h1>
        <button className="btn-ghost" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync'}
        </button>
        <Link to="/workout/new">
          <button className="btn-primary">+ New Workout</button>
        </Link>
      </div>

      {syncMsg && <p style={{ color: '#a0a0a0', fontSize: 13, marginBottom: 16 }}>{syncMsg}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{workouts.length}</div>
          <div style={{ color: '#666', fontSize: 13 }}>Total Workouts</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {workouts.filter(w => w.synced_at).length}
          </div>
          <div style={{ color: '#666', fontSize: 13 }}>Synced</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {workouts.filter(w => !w.synced_at).length}
          </div>
          <div style={{ color: '#666', fontSize: 13 }}>Unsynced</div>
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
                    <div style={{ fontSize: 13, color: '#666' }}>{w.date}</div>
                  </div>
                  <span className={`badge ${w.synced_at ? 'badge-green' : 'badge-yellow'}`}>
                    {w.synced_at ? 'Synced' : 'Local'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
      }
    </div>
  );
}
