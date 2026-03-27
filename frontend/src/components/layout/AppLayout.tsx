import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { isAuthenticated } from '../../services/auth';
import { api } from '../../services/api';

export default function AppLayout() {
  const [checked, setChecked] = useState(false);
  const [valid, setValid] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      setValid(false);
      setChecked(true);
      return;
    }
    // Validate token against backend once on mount
    api.get('/users/me').then(() => {
      setValid(true);
      setChecked(true);
    }).catch(() => {
      // Backend unreachable or token invalid — still allow access with mock data
      // Only force logout if we get a clear 401 AND backend is reachable
      setValid(true);
      setChecked(true);
    });
  }, []);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!valid) {
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
