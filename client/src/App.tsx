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
import Templates from './pages/Templates';
import Charts from './pages/Charts';
import Settings from './pages/Settings';
import { UnitsProvider } from './contexts/UnitsContext';

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

  // Handle OAuth deep link callback on native
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handles: (() => void)[] = [];

    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        if (!url.startsWith('com.workoutlogger.app://')) return;
        const { Browser } = await import('@capacitor/browser');
        await Browser.close();

        try {
          const parsed = new URL(url);
          const code = parsed.searchParams.get('code');

          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          } else {
            const hash = new URLSearchParams(parsed.hash.replace('#', ''));
            const access_token = hash.get('access_token');
            const refresh_token = hash.get('refresh_token');
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          }
        } catch (err) {
          console.error('[appUrlOpen] error handling deep link:', err);
        }
      }).then(h => handles.push(() => h.remove()));
    });

    return () => handles.forEach(fn => fn());
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

  // Initial sync on login (native): push queued changes, then pull latest,
  // so workouts and templates created on other devices show up here.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;
    api.syncPush().then(() => api.syncPull(user.id)).catch(console.error);
  }, [user?.id]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && !prevOnline.current && user) {
      api.syncPush().then(() => api.syncPull(user.id)).catch(console.error);
    }
    prevOnline.current = isOnline;
  }, [isOnline, user]);

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <UnitsProvider>
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
          <Route path="/templates" element={user ? <Templates user={user} /> : <Navigate to="/login" replace />} />
          <Route path="/charts" element={user ? <Charts user={user} /> : <Navigate to="/login" replace />} />
          <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
    </UnitsProvider>
  );
}
