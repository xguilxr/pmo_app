import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated, isSessionExpired, isSuperAdmin } from '../../services/auth';

/**
 * Route guard for /superadmin/*. Authenticated non-superadmins get bounced to
 * the regular dashboard so the URL is not a "hint" they could abuse; anonymous
 * users go to /login.
 */
export default function SuperAdminGuard() {
  if (!isAuthenticated() || isSessionExpired()) {
    return <Navigate to="/login" replace />;
  }
  if (!isSuperAdmin()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
