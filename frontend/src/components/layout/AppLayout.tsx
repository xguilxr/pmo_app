import { useEffect, useState, useCallback } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { isAuthenticated, logout, touchActivity, isSessionExpired } from '../../services/auth';

export default function AppLayout() {
  const [, setTick] = useState(0);

  const handleActivity = useCallback(() => {
    touchActivity();
  }, []);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, handleActivity));

    const interval = setInterval(() => {
      if (isSessionExpired()) {
        logout();
      }
      setTick(t => t + 1);
    }, 60_000);

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearInterval(interval);
    };
  }, [handleActivity]);

  if (!isAuthenticated() || isSessionExpired()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-surface-secondary bg-mesh">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <TopBar />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
