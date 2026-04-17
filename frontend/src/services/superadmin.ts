/**
 * Typed client for /api/superadmin/*. Centralised so every page speaks the
 * same shape; extend here when the backend grows.
 */
import { api } from './api';
import { setActiveTenantId } from './auth';

export interface Tenant {
  id: number;
  name: string;
  legal_name: string | null;
  slug: string | null;
  domain: string | null;
  industry: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  is_active: boolean;
  created_at: string;
  user_count: number;
  project_count: number;
}

export interface Overview {
  tenant_count: number;
  tenant_active_count: number;
  tenant_inactive_count: number;
  user_count: number;
  superadmin_count: number;
  project_count: number;
  program_count: number;
  logins_last_24h: number;
  failed_logins_last_24h: number;
  recent_tenants: {
    id: number;
    name: string;
    slug: string | null;
    created_at: string | null;
    is_active: boolean;
  }[];
  tenants_by_industry: { industry: string; count: number }[];
}

export interface SuperUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superadmin: boolean;
  last_login: string | null;
  created_at: string;
  roles: string[];
  organizations: { id: number; name: string; slug: string | null }[];
}

export interface PlatformRole {
  id: number;
  name: string;
  description: string | null;
  is_system: boolean;
  user_count: number;
  permission_ids: number[];
}

export interface PlatformPermission {
  id: number;
  module: string;
  action: string;
  description: string | null;
}

export interface AccessLogEntry {
  id: number;
  timestamp: string;
  action: string;
  user_id: number | null;
  username: string | null;
  full_name: string | null;
  organization_id: number | null;
  organization_name: string | null;
  ip_address: string | null;
  details: string | null;
}

export interface ActivityLogEntry extends AccessLogEntry {
  module: string;
  record_id: number | null;
}

export const superadminApi = {
  overview: () => api.get<Overview>('/superadmin/overview'),

  // Tenants
  listTenants: (includeInactive = true) =>
    api.get<Tenant[]>(`/superadmin/tenants?include_inactive=${includeInactive}`),
  getTenant: (id: number) => api.get<Tenant>(`/superadmin/tenants/${id}`),
  createTenant: (body: Record<string, unknown>) =>
    api.post<Tenant & { admin_username: string; admin_password: string; admin_email: string; admin_user_id: number }>(
      '/superadmin/tenants', body),
  updateTenant: (id: number, body: Record<string, unknown>) =>
    api.patch<Tenant>(`/superadmin/tenants/${id}`, body),
  deactivateTenant: (id: number) => api.delete<void>(`/superadmin/tenants/${id}`),
  hardDeleteTenant: (id: number, confirmSlug: string) =>
    api.delete<void>(`/superadmin/tenants/${id}/permanent?confirm_slug=${encodeURIComponent(confirmSlug)}`),
  toggleTenantActive: (id: number, isActive: boolean) =>
    api.patch<Tenant>(`/superadmin/tenants/${id}/active`, { is_active: isActive }),
  joinAsAdmin: (id: number) =>
    api.post<{ tenant_id: number; tenant_name: string; role_assigned: string | null; already_member: boolean }>(
      `/superadmin/tenants/${id}/join-as-admin`, {}),

  // Users
  listUsers: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== false) qs.set(k, String(v));
    });
    const s = qs.toString();
    return api.get<SuperUser[]>(`/superadmin/users${s ? `?${s}` : ''}`);
  },
  createUser: (body: Record<string, unknown>) => api.post<SuperUser>('/superadmin/users', body),
  updateUser: (id: number, body: Record<string, unknown>) =>
    api.patch<SuperUser>(`/superadmin/users/${id}`, body),
  deleteUser: (id: number) => api.delete<void>(`/superadmin/users/${id}`),
  resetUserPassword: (id: number) =>
    api.post<{ user_id: number; username: string; new_password: string }>(
      `/superadmin/users/${id}/reset-password`, {}),

  // Roles
  listRoles: () => api.get<PlatformRole[]>('/superadmin/roles'),
  createRole: (body: Record<string, unknown>) => api.post<PlatformRole>('/superadmin/roles', body),
  updateRole: (id: number, body: Record<string, unknown>) =>
    api.patch<PlatformRole>(`/superadmin/roles/${id}`, body),
  deleteRole: (id: number) => api.delete<void>(`/superadmin/roles/${id}`),
  listPermissions: () => api.get<PlatformPermission[]>('/superadmin/permissions'),

  // Logs
  accessLogs: (params: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    const s = qs.toString();
    return api.get<AccessLogEntry[]>(`/superadmin/access-logs${s ? `?${s}` : ''}`);
  },
  activityLogs: (params: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    const s = qs.toString();
    return api.get<ActivityLogEntry[]>(`/superadmin/activity-logs${s ? `?${s}` : ''}`);
  },
};

/**
 * Make the current super admin act as admin of ``tenantId`` in one call:
 * - ensures they are member + Administrador of the tenant
 * - switches the active tenant so tenant-scoped endpoints hit the right org
 * Returns the resolved tenant so the caller can show a toast.
 */
export async function enterTenantAsAdmin(tenantId: number) {
  const result = await superadminApi.joinAsAdmin(tenantId);
  setActiveTenantId(tenantId);
  // Mirror the org into localStorage's user blob so Sidebar/TopBar pick it up
  // without a full reload-bounce loop.
  try {
    const raw = localStorage.getItem('pmo_user');
    if (raw) {
      const user = JSON.parse(raw);
      const orgs = Array.isArray(user.organizations) ? user.organizations : [];
      if (!orgs.some((o: { id: number }) => o.id === tenantId)) {
        orgs.push({ id: tenantId, name: result.tenant_name, slug: null });
        user.organizations = orgs;
        localStorage.setItem('pmo_user', JSON.stringify(user));
      }
    }
  } catch {
    /* localStorage corruption — next login fixes it */
  }
  return result;
}
