import { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useNetwork } from './hooks/useNetwork';
import { api } from './lib/api';
import Nav from './components/Nav';
import OfflineBanner from './components/OfflineBanner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewWorkout from './pages/NewWorkout';
import WorkoutHistory from './pages/WorkoutHistory';
import WorkoutDetail from './pages/WorkoutDetail';
import ExerciseLibrary from './pages/ExerciseLibrary';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isOnline = useNetwork();
  const prevOnline = useRef(isOnline);

  // Initialize SQLite on native
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    import('./lib/sqlite').then(({ initSQLiteDb }) => initSQLiteDb()).catch(console.error);
  }, []);

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && !prevOnline.current && user) {
      api.syncPush().catch(console.error);
    }
    prevOnline.current = isOnline;
  }, [isOnline, user]);

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <BrowserRouter>
      <OfflineBanner isOnline={isOnline} />
      {user && <Nav user={user} />}
      <div style={{ paddingTop: isOnline ? 0 : 32 }}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />} />
          <Route path="/workout/new" element={user ? <NewWorkout user={user} /> : <Navigate to="/login" replace />} />
          <Route path="/workout/:id" element={user ? <WorkoutDetail user={user} /> : <Navigate to="/login" replace />} />
          <Route path="/history" element={user ? <WorkoutHistory user={user} /> : <Navigate to="/login" replace />} />
          <Route path="/exercises" element={user ? <ExerciseLibrary user={user} /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
