import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import './AppShell.css';

const NAV = {
  student: [
    { to: '/', end: true, label: 'Hôm nay', icon: 'today' },
    { to: '/vocab', label: 'Kho từ', icon: 'vocab' },
    { to: '/plan', label: 'Lộ trình', icon: 'plan' },
    { to: '/settings', label: 'Cài đặt', icon: 'bell' },
  ],
  teacher: [
    { to: '/teacher', end: true, label: 'Tổng quan', icon: 'plan' },
    { to: '/teacher/settings', label: 'Cài đặt', icon: 'bell' },
  ],
};

function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const close = e => { if (!ref.current.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="account" ref={ref}>
      <button type="button" className="avatar" aria-haspopup="menu" aria-expanded={open} aria-label="Tài khoản" onClick={() => setOpen(o => !o)}>
        {user.name.charAt(0)}
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="who"><b>{user.name}</b><span>{user.email}</span></div>
          <button type="button" role="menuitem" onClick={onLogout}><Icon name="logout" size={18} />Đăng xuất</button>
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV[user.role];
  const doLogout = async () => { await logout(); navigate('/login', { replace: true }); };
  return (
    <div className="shell">
      <header className="topbar">
        <div className="wrap">
          <Link className="brand" to={items[0].to}><span className="logo">T</span>Kho Từ TOEIC</Link>
          <nav className="topnav" aria-label="Điều hướng chính">
            {items.map(it => (
              <NavLink key={it.to} to={it.to} end={it.end}><Icon name={it.icon} size={18} />{it.label}</NavLink>
            ))}
          </nav>
          <span className="top-spacer" />
          <AccountMenu user={user} onLogout={doLogout} />
        </div>
      </header>
      <main className="shell-main"><Outlet /></main>
      <nav className="tabbar" aria-label="Điều hướng chính">
        {items.map(it => (
          <NavLink key={it.to} to={it.to} end={it.end}><Icon name={it.icon} size={22} />{it.label}</NavLink>
        ))}
      </nav>
    </div>
  );
}
