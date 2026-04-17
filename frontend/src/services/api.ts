// Base API configuration. Exported so components that hit non-wrapped URLs
// (e.g. file downloads via <a href>) share the same origin.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Token management — always read from localStorage to avoid stale module vars
export function setToken(token: string | null) {
  if (token) localStorage.setItem('pmo_token', token);
  else localStorage.removeItem('pmo_token');
}

export function getToken(): string | null {
  return localStorage.getItem('pmo_token');
}

// Called on any 401 so an expired or revoked token drops the user at /login
// instead of leaving the UI stuck showing errors.
function handleUnauthorized() {
  localStorage.removeItem('pmo_token');
  localStorage.removeItem('pmo_tenant_id');
  localStorage.removeItem('pmo_user');
  localStorage.removeItem('pmo_last_activity');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login?expired=1';
  }
}

// Generic fetch wrapper with auth header and tenant header
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('pmo_token');
  const tenantId = localStorage.getItem('pmo_tenant_id');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API Error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Multipart / FormData POST — do NOT set Content-Type so the browser adds the
// correct multipart boundary.
async function apiFetchForm<T>(path: string, form: FormData): Promise<T> {
  const token = localStorage.getItem('pmo_token');
  const tenantId = localStorage.getItem('pmo_tenant_id');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: form,
    headers,
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Sesión expirada');
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Convenience methods
export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  postForm: <T>(path: string, form: FormData) => apiFetchForm<T>(path, form),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
