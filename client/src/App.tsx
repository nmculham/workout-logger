import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import Nav from './components/Nav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewWorkout from './pages/NewWorkout';
import WorkoutHistory from './pages/WorkoutHistory';
import WorkoutDetail from './pages/WorkoutDetail';
import ExerciseLibrary from './pages/ExerciseLibrary';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <BrowserRouter>
      {user && <Nav user={user} />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />} />
        <Route path="/workout/new" element={user ? <NewWorkout user={user} /> : <Navigate to="/login" replace />} />
        <Route path="/workout/:id" element={user ? <WorkoutDetail user={user} /> : <Navigate to="/login" replace />} />
        <Route path="/history" element={user ? <WorkoutHistory user={user} /> : <Navigate to="/login" replace />} />
        <Route path="/exercises" element={user ? <ExerciseLibrary user={user} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
