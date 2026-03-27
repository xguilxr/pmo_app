import { api, setToken } from './api';

interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  full_name: string;
  roles: string[];
}

export async function login(usernameOrEmail: string, password: string): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>('/auth/login', {
    username_or_email: usernameOrEmail,
    password,
  });
  setToken(data.access_token);
  localStorage.setItem(
    'pmo_user',
    JSON.stringify({ id: data.user_id, fullName: data.full_name, roles: data.roles }),
  );
  return data;
}

export function logout() {
  setToken(null);
  localStorage.removeItem('pmo_user');
  window.location.href = '/login';
}

export function getCurrentUser() {
  const raw = localStorage.getItem('pmo_user');
  if (!raw) return null;
  return JSON.parse(raw);
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('pmo_token');
}
