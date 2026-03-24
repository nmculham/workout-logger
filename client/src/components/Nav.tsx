import { NavLink } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { signOut } from '../lib/auth';

interface Props { user: User; }

export default function Nav({ user }: Props) {
  return (
    <nav>
      <span className="logo">WL</span>
      <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
      <NavLink to="/history" className={({ isActive }) => isActive ? 'active' : ''}>History</NavLink>
      <NavLink to="/exercises" className={({ isActive }) => isActive ? 'active' : ''}>Exercises</NavLink>
      <div className="spacer" />
      <span style={{ fontSize: 13, color: '#666' }}>{user.email}</span>
      <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={signOut}>Sign out</button>
    </nav>
  );
}
