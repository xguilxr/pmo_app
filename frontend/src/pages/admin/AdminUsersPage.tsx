import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner, ErrorMessage } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { getActiveTenantId, isSuperAdmin } from '../../services/auth';

interface UserItem {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  organizations: string[];
  isActive: boolean;
  lastLogin: string;
}

interface RoleOption {
  id: number;
  name: string;
}

interface OrgOption {
  id: number;
  name: string;
}

interface ApiUserResponse {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  last_login: string | null;
  roles: string[];
  organizations: string[];
  created_at: string;
}

function mapApiUser(raw: ApiUserResponse): UserItem {
  return {
    id: raw.id,
    username: raw.username || '',
    email: raw.email || '',
    fullName: raw.full_name || '',
    roles: Array.isArray(raw.roles) ? raw.roles : [],
    organizations: Array.isArray(raw.organizations) ? raw.organizations : [],
    isActive: raw.is_active ?? true,
    lastLogin: raw.last_login || '-',
  };
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { toastError } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [form, setForm] = useState({ username: '', email: '', fullName: '', password: '', roleIds: [] as number[], orgIds: [] as number[], isActive: true });
  const [search, setSearch] = useState('');
  const [availableOrgs, setAvailableOrgs] = useState<OrgOption[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

  // Fetch available orgs and roles
  useEffect(() => {
    api.get<OrgOption[]>('/organizations').then(orgs => setAvailableOrgs(orgs.map((o: OrgOption) => ({ id: o.id, name: o.name })))).catch(() => {});
    api.get<Array<{id: number; name: string}>>('/users/roles').then(r => setAvailableRoles(r.map(role => ({ id: role.id, name: role.name })))).catch(() => {});
  }, []);

  // Fetch users from API
  const { data: apiUsers, loading, error, refetch } = useApi<UserItem[]>(async () => {
    const raw = await api.get<ApiUserResponse[]>('/users');
    return raw.map(mapApiUser);
  }, []);

  useEffect(() => {
    if (apiUsers) setUsers(apiUsers);
  }, [apiUsers]);

  // This page is tenant-scoped (calls /users which requires a tenant). A super
  // admin without an active tenant would hit "Super admin debe especificar
  // X-Tenant-ID" on every endpoint, so route them to the platform-wide view.
  // Placed after all hooks to respect rules-of-hooks.
  if (isSuperAdmin() && !getActiveTenantId()) {
    return <Navigate to="/superadmin/users" replace />;
  }

  const openCreate = () => {
    setEditing(null);
    setForm({ username: '', email: '', fullName: '', password: '', roleIds: [], orgIds: [], isActive: true });
    setShowModal(true);
  };

  const openEdit = (u: UserItem) => {
    setEditing(u);
    // Resolve names back to IDs using the available lists
    const roleIds = availableRoles.filter(r => u.roles.includes(r.name)).map(r => r.id);
    const orgIds = availableOrgs.filter(o => u.organizations.includes(o.name)).map(o => o.id);
    setForm({ username: u.username, email: u.email, fullName: u.fullName, password: '', roleIds, orgIds, isActive: u.isActive });
    setShowModal(true);
  };

  const toggleRole = (roleId: number) => {
    setForm({ ...form, roleIds: form.roleIds.includes(roleId) ? form.roleIds.filter(r => r !== roleId) : [...form.roleIds, roleId] });
  };

  const toggleOrganization = (orgId: number) => {
    setForm({ ...form, orgIds: form.orgIds.includes(orgId) ? form.orgIds.filter(o => o !== orgId) : [...form.orgIds, orgId] });
  };

  const handleSave = async () => {
    if (!form.username.trim() || !form.email.trim()) return;
    try {
      if (editing) {
        await api.patch(`/users/${editing.id}`, {
          username: form.username,
          email: form.email,
          full_name: form.fullName,
          is_active: form.isActive,
          role_ids: form.roleIds,
          organization_ids: form.orgIds,
        });
      } else {
        await api.post('/users', {
          username: form.username,
          email: form.email,
          full_name: form.fullName,
          password: form.password,
          role_ids: form.roleIds,
          organization_ids: form.orgIds,
        });
      }
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al guardar usuario');
    }
    setShowModal(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al eliminar usuario');
    }
    setDeleteTarget(null);
  };

  const filtered = search ? users.filter(u => u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) : users;

  if (loading) return <LoadingSpinner />;
  if (error && users.length === 0) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('admin.usersTitle')}</h2>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          {t('admin.newUser')}
        </button>
      </div>

      <div className="liquid-glass-border rounded-xl p-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search') + '...'} className="w-full md:w-80 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="liquid-glass-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.user')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.email')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.roles')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.organizations')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.lastLogin')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                      {u.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.fullName}</p>
                      <p className="text-xs text-gray-500">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {u.roles.map(r => (
                      <span key={r} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{r}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {u.organizations.map(org => (
                      <span key={org} className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{org}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.isActive ? t('admin.active') : t('admin.inactive')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.lastLogin}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(u)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                    <button onClick={() => setDeleteTarget(u)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="liquid-modal rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('admin.editUser') : t('admin.newUser')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.username')}</label>
                  <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.fullName')}</label>
                  <input value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.email')}</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')}</label>
                  <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.roles')}</label>
                <div className="space-y-2">
                  {availableRoles.map(role => (
                    <button key={role.id} type="button" onClick={() => toggleRole(role.id)} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm border transition-colors ${form.roleIds.includes(role.id) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${form.roleIds.includes(role.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {form.roleIds.includes(role.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {role.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.organizations')}</label>
                <div className="space-y-2">
                  {availableOrgs.map(org => (
                    <button key={org.id} type="button" onClick={() => toggleOrganization(org.id)} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm border transition-colors ${form.orgIds.includes(org.id) ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${form.orgIds.includes(org.id) ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                        {form.orgIds.includes(org.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {org.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setForm({...form, isActive: !form.isActive})} className={`w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${form.isActive ? 'translate-x-4' : ''}`} />
                </button>
                <span className="text-sm text-gray-700">{t('admin.activeUser')}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">{t('common.cancel')}</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="liquid-modal rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar eliminación</h3>
            <p className="text-sm text-gray-600 mb-6">¿Estás seguro de que deseas eliminar al usuario <strong>{deleteTarget.fullName}</strong>? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">{t('common.cancel')}</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
