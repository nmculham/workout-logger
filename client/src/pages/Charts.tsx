import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

interface Props { user: User; }

type View = 'progress' | 'volume';

function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

const CHART_STYLE = { fontSize: 12 };
const TOOLTIP_STYLE = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 6 };
const TICK_STYLE = { fill: '#666', fontSize: 11 };
const GRID_COLOR = '#2a2a2a';

export default function Charts({ user }: Props) {
  const [view, setView] = useState<View>('progress');
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [progressData, setProgressData] = useState<any[]>([]);
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [loadingVolume, setLoadingVolume] = useState(false);

  useEffect(() => {
    api.getExercises(user.id).then(list => {
      setExercises(list);
      if (list.length) setSelectedExercise(list[0].id);
    });
  }, [user.id]);

  useEffect(() => {
    if (!selectedExercise) return;
    setLoadingProgress(true);
    supabase
      .from('workout_exercises')
      .select('id, workouts!inner(date), sets(weight, reps)')
      .eq('exercise_id', selectedExercise)
      .then(({ data }) => {
        const byDate: Record<string, { maxWeight: number; best1RM: number }> = {};
        for (const we of data ?? []) {
          const date = (we.workouts as any)?.date as string | undefined;
          if (!date) continue;
          if (!byDate[date]) byDate[date] = { maxWeight: 0, best1RM: 0 };
          for (const s of (we.sets as any[]) ?? []) {
            if (s.weight && s.reps) {
              byDate[date].maxWeight = Math.max(byDate[date].maxWeight, s.weight);
              byDate[date].best1RM = Math.max(byDate[date].best1RM, epley1RM(s.weight, s.reps));
            }
          }
        }
        const sorted = Object.entries(byDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, vals]) => ({
            date: new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
            'Max Weight': vals.maxWeight || null,
            'Est. 1RM': vals.best1RM || null,
          }));
        setProgressData(sorted);
        setLoadingProgress(false);
      });
  }, [selectedExercise]);

  useEffect(() => {
    if (view !== 'volume' || volumeData.length) return;
    setLoadingVolume(true);
    supabase
      .from('workouts')
      .select('date, workout_exercises(sets(weight, reps))')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const byWeek: Record<string, number> = {};
        for (const w of data ?? []) {
          const d = new Date(w.date + 'T00:00:00Z');
          const day = d.getUTCDay();
          const diff = (day === 0 ? -6 : 1) - day;
          const monday = new Date(d);
          monday.setUTCDate(d.getUTCDate() + diff);
          const weekKey = monday.toISOString().slice(0, 10);
          let vol = 0;
          for (const we of (w.workout_exercises as any[]) ?? []) {
            for (const s of (we.sets as any[]) ?? []) {
              if (s.weight && s.reps) vol += s.weight * s.reps;
            }
          }
          byWeek[weekKey] = (byWeek[weekKey] ?? 0) + vol;
        }
        const sorted = Object.entries(byWeek)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([week, volume]) => ({
            week: new Date(week + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
            Volume: Math.round(volume),
          }));
        setVolumeData(sorted);
        setLoadingVolume(false);
      });
  }, [view, user.id]);

  return (
    <div className="page">
      <h1 style={{ marginBottom: 24 }}>Charts</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        <button className={view === 'progress' ? 'btn-primary' : 'btn-ghost'} onClick={() => setView('progress')}>
          Exercise Progress
        </button>
        <button className={view === 'volume' ? 'btn-primary' : 'btn-ghost'} onClick={() => setView('volume')}>
          Weekly Volume
        </button>
      </div>

      {view === 'progress' && (
        <>
          <div style={{ marginBottom: 24 }}>
            <select
              value={selectedExercise}
              onChange={e => setSelectedExercise(e.target.value)}
              style={{ padding: '8px 12px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: 6, fontSize: 14 }}
            >
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>

          {loadingProgress && <p style={{ color: '#666' }}>Loading...</p>}

          {!loadingProgress && progressData.length === 0 && (
            <p style={{ color: '#555' }}>No sets logged for this exercise yet.</p>
          )}

          {!loadingProgress && progressData.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, color: '#a0a0a0', marginBottom: 12 }}>Max Weight</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={progressData} style={CHART_STYLE}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis dataKey="date" tick={TICK_STYLE} />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="Max Weight" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>

              <h2 style={{ fontSize: 15, color: '#a0a0a0', marginBottom: 12, marginTop: 32 }}>Estimated 1RM</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={progressData} style={CHART_STYLE}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis dataKey="date" tick={TICK_STYLE} />
                  <YAxis tick={TICK_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="Est. 1RM" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </>
      )}

      {view === 'volume' && (
        <>
          <h2 style={{ fontSize: 15, color: '#a0a0a0', marginBottom: 12 }}>Total Volume per Week</h2>
          {loadingVolume && <p style={{ color: '#666' }}>Loading...</p>}
          {!loadingVolume && volumeData.length === 0 && (
            <p style={{ color: '#555' }}>No workout data yet.</p>
          )}
          {!loadingVolume && volumeData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={volumeData} style={CHART_STYLE}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="week" tick={TICK_STYLE} />
                <YAxis tick={TICK_STYLE} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="Volume" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </>
      )}
    </div>
  );
}
