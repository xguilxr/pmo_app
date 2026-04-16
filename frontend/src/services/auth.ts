import { setToken, api } from './api';
import type { OrgBrief, LoginResponse, CurrentUser } from '../types';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_KEY = 'pmo_last_activity';
const TENANT_KEY = 'pmo_tenant_id';

export async function login(usernameOrEmail: string, password: string): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>('/auth/login', {
    username_or_email: usernameOrEmail,
    password,
  });
  setToken(data.access_token);
  localStorage.setItem(
    'pmo_user',
    JSON.stringify({
      id: data.user_id,
      fullName: data.full_name,
      roles: data.roles,
      is_superadmin: data.is_superadmin,
      organizations: data.organizations,
    }),
  );
  // Auto-select a default tenant so tenant-scoped endpoints don't 400:
  // - regular users with one org: that org
  // - superadmin with many orgs: the first one (they can switch later)
  if (data.organizations && data.organizations.length > 0) {
    localStorage.setItem(TENANT_KEY, String(data.organizations[0].id));
  }
  touchActivity();
  return data;
}

export function logout() {
  setToken(null);
  localStorage.removeItem('pmo_user');
  localStorage.removeItem(TENANT_KEY);
  localStorage.removeItem(ACTIVITY_KEY);
  window.location.href = '/login';
}

export function getActiveTenantId(): number | null {
  const raw = localStorage.getItem(TENANT_KEY);
  return raw ? parseInt(raw, 10) : null;
}

export function setActiveTenantId(id: number | null): void {
  if (id === null) localStorage.removeItem(TENANT_KEY);
  else localStorage.setItem(TENANT_KEY, String(id));
}

export function getCurrentUser(): CurrentUser | null {
  const raw = localStorage.getItem('pmo_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isSuperAdmin(): boolean {
  const user = getCurrentUser();
  return user?.is_superadmin === true;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('pmo_token');
}

export function touchActivity() {
  localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
}

export function isSessionExpired(): boolean {
  const last = localStorage.getItem(ACTIVITY_KEY);
  if (!last) return false;
  return Date.now() - parseInt(last, 10) > SESSION_TIMEOUT_MS;
}
