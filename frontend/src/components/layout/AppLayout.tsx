import { useEffect, useState, useCallback } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { isAuthenticated, logout, touchActivity, isSessionExpired } from '../../services/auth';

export default function AppLayout() {
  const [, setTick] = useState(0);

  // Track user activity for session timeout
  const handleActivity = useCallback(() => {
    touchActivity();
  }, []);

  useEffect(() => {
    // Listen to user activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, handleActivity));

    // Check session expiry every 60 seconds
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
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-64">
        <TopBar />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
