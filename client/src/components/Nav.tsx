import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { signOut } from '../lib/auth';

interface Props { user: User; }

export default function Nav({ user }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
  const navRef = useRef<HTMLElement>(null);

  // Close the mobile menu when tapping/clicking anywhere outside the nav.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <nav ref={navRef}>
      <span className="logo">WL</span>

      <button
        className="nav-toggle"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {open ? '✕' : '☰'}
      </button>

      <div className={`nav-links ${open ? 'open' : ''}`}>
        <NavLink to="/" className={linkClass} onClick={close}>Dashboard</NavLink>
        <NavLink to="/history" className={linkClass} onClick={close}>History</NavLink>
        <NavLink to="/exercises" className={linkClass} onClick={close}>Exercises</NavLink>
        <NavLink to="/templates" className={linkClass} onClick={close}>Templates</NavLink>
        <NavLink to="/charts" className={linkClass} onClick={close}>Charts</NavLink>
        <NavLink to="/settings" className={linkClass} onClick={close}>Settings</NavLink>
        <div className="nav-user">
          <span className="nav-email">{user.email}</span>
          <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => { close(); signOut(); }}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
