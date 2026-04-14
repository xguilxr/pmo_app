import { setToken } from './api';

interface OrgBrief {
  id: number;
  name: string;
  slug: string | null;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  full_name: string;
  roles: string[];
  organizations: OrgBrief[];
  is_superadmin: boolean;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_KEY = 'pmo_last_activity';

export async function login(usernameOrEmail: string, password: string): Promise<LoginResponse> {
  // Import api dynamically to avoid circular dependency
  const { api } = await import('./api');
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
  touchActivity();
  return data;
}

export function logout() {
  setToken(null);
  localStorage.removeItem('pmo_user');
  localStorage.removeItem(ACTIVITY_KEY);
  window.location.href = '/login';
}

export interface CurrentUser {
  id: number;
  fullName: string;
  roles: string[];
  is_superadmin: boolean;
  organizations: OrgBrief[];
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
