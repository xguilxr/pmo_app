import { useState } from 'react';
import {
  Users, Plus, Search, Shield, KeyRound, Edit2, Trash2, Check, Copy,
  Crown, Power, PowerOff,
} from 'lucide-react';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import PageHeader from '../../components/common/PageHeader';
import { useToast } from '../../context/ToastContext';
import { superadminApi, type SuperUser } from '../../services/superadmin';

interface UserFormState {
  username: string;
  email: string;
  full_name: string;
  password: string;
  is_superadmin: boolean;
  role_ids: number[];
  organization_ids: number[];
}

const emptyUserForm: UserFormState = {
  username: '', email: '', full_name: '', password: '',
  is_superadmin: false, role_ids: [], organization_ids: [],
};

export default function SuperadminUsersPage() {
  const { toastSuccess, toastError } = useToast();
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState<number | ''>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [formMode, setFormMode] = useState<false | 'create' | SuperUser>(false);
  const [form, setForm] = useState<UserFormState>({ ...emptyUserForm });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetResult, setResetResult] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const usersApi = useApi(() => superadminApi.listUsers({
    search, tenant_id: tenantFilter || undefined, role: roleFilter || undefined,
    only_active: onlyActive,
  }), [search, tenantFilter, roleFilter, onlyActive]);
  const tenantsApi = useApi(() => superadminApi.listTenants(true), []);
  const rolesApi = useApi(() => superadminApi.listRoles(), []);

  const users = usersApi.data || [];
  const tenants = tenantsApi.data || [];
  const roles = rolesApi.data || [];

  function openCreate() {
    setForm({ ...emptyUserForm });
    setFormError('');
    setFormMode('create');
  }

  function openEdit(u: SuperUser) {
    setForm({
      username: u.username,
      email: u.email,
      full_name: u.full_name,
      password: '',
      is_superadmin: u.is_superadmin,
      role_ids: roles.filter(r => u.roles.includes(r.name)).map(r => r.id),
      organization_ids: u.organizations.map(o => o.id),
    });
    setFormError('');
    setFormMode(u);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (formMode === 'create') {
        await superadminApi.createUser({
          username: form.username,
          email: form.email,
          full_name: form.full_name,
          password: form.password,
          is_superadmin: form.is_superadmin,
          role_ids: form.role_ids,
          organization_ids: form.organization_ids,
        });
        toastSuccess('Usuario creado');
      } else if (typeof formMode === 'object') {
        const payload: Record<string, unknown> = {
          full_name: form.full_name,
          email: form.email,
          is_superadmin: form.is_superadmin,
          role_ids: form.role_ids,
          organization_ids: form.organization_ids,
        };
        await superadminApi.updateUser(formMode.id, payload);
        toastSuccess('Usuario actualizado');
      }
      setFormMode(false);
      usersApi.refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: SuperUser) {
    try {
      await superadminApi.updateUser(u.id, { is_active: !u.is_active });
      toastSuccess(`Usuario ${!u.is_active ? 'activado' : 'desactivado'}`);
      usersApi.refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }

  async function resetPassword(u: SuperUser) {
    if (!window.confirm(`¿Resetear password de "${u.username}"? El usuario deberá usar la nueva contraseña generada.`)) return;
    try {
      const result = await superadminApi.resetUserPassword(u.id);
      setResetResult({ username: result.username, password: result.new_password });
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al resetear password');
    }
  }

  async function deleteUser(u: SuperUser) {
    if (!window.confirm(`¿Eliminar el usuario "${u.username}"? Soft-delete, se puede restaurar desde la BD.`)) return;
    try {
      await superadminApi.deleteUser(u.id);
      toastSuccess('Usuario eliminado');
      usersApi.refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  async function copyPassword() {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may fail silently */
    }
  }

  if (usersApi.loading || tenantsApi.loading || rolesApi.loading) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumb={[{ label: 'Super Admin', href: '/superadmin' }, { label: 'Usuarios' }]} title="Usuarios" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Super Admin', href: '/superadmin' }, { label: 'Usuarios' }]}
        title="Usuarios"
        subtitle="Todos los usuarios de la plataforma, filtrables por tenant y rol"
      >
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gradient text-white text-[13px] font-medium shadow-lg shadow-accent/20"
        >
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o username…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select
          value={tenantFilter}
          onChange={e => setTenantFilter(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-[13px] text-text-primary focus:outline-none"
        >
          <option value="">Todos los tenants</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-[13px] text-text-primary focus:outline-none"
        >
          <option value="">Todos los roles</option>
          {roles.map(r => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-[12px] text-text-secondary">
          <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} />
          Solo activos
        </label>
        <p className="text-[12px] text-text-tertiary ml-auto">{users.length} usuario(s)</p>
      </div>

      {/* Users table */}
      <div className="liquid-glass-border rounded-2xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-elevated/50 border-b border-border">
            <tr className="text-left">
              <Th>Usuario</Th>
              <Th>Email</Th>
              <Th>Roles</Th>
              <Th>Tenants</Th>
              <Th center>Estado</Th>
              <Th>Último login</Th>
              <Th right>Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.is_superadmin && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                    <div>
                      <p className="text-text-primary font-medium">{u.full_name}</p>
                      <p className="text-[11px] text-text-tertiary font-mono">{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-secondary">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 && <span className="text-[11px] text-text-tertiary">—</span>}
                    {u.roles.map(r => (
                      <span key={r} className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400">{r}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.organizations.length === 0 && <span className="text-[11px] text-text-tertiary">—</span>}
                    {u.organizations.slice(0, 3).map(o => (
                      <span key={o.id} className="text-[10px] px-2 py-0.5 rounded-lg bg-surface-hover text-text-secondary">{o.name}</span>
                    ))}
                    {u.organizations.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-surface-hover text-text-tertiary">
                        +{u.organizations.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleActive(u)}
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg ${
                      u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {u.is_active ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3 text-text-tertiary text-[11px] font-mono">
                  {u.last_login ? new Date(u.last_login).toLocaleString('es-MX') : 'Nunca'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(u)} title="Editar"
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-indigo-400 hover:bg-indigo-500/10">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => resetPassword(u)} title="Resetear password"
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-amber-400 hover:bg-amber-500/10">
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteUser(u)} title="Eliminar"
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-text-tertiary text-[13px]">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  No se encontraron usuarios con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit form */}
      {formMode !== false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <h2 className="text-[16px] font-medium text-text-primary mb-5">
              {formMode === 'create' ? 'Nuevo usuario' : `Editar ${formMode.username}`}
            </h2>
            {formError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-400 text-[12px]">{formError}</div>}
            <form onSubmit={submitForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Username *" value={form.username} required
                  disabled={formMode !== 'create'}
                  onChange={v => setForm(f => ({ ...f, username: v }))} />
                <FormInput label="Email *" type="email" value={form.email} required
                  onChange={v => setForm(f => ({ ...f, email: v }))} />
                <FormInput label="Nombre completo *" value={form.full_name} required
                  onChange={v => setForm(f => ({ ...f, full_name: v }))} />
                {formMode === 'create' && (
                  <FormInput label="Password * (≥12c, mayús + dígito)" type="password" value={form.password} required
                    onChange={v => setForm(f => ({ ...f, password: v }))} />
                )}
              </div>

              <label className="flex items-center gap-2 text-[13px] text-text-secondary">
                <input type="checkbox" checked={form.is_superadmin}
                  onChange={e => setForm(f => ({ ...f, is_superadmin: e.target.checked }))} />
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                Super administrador (acceso total a la plataforma)
              </label>

              <div>
                <label className="block text-[11px] text-text-tertiary mb-1 uppercase tracking-widest">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map(r => {
                    const selected = form.role_ids.includes(r.id);
                    return (
                      <button type="button" key={r.id}
                        onClick={() => setForm(f => ({
                          ...f,
                          role_ids: selected ? f.role_ids.filter(x => x !== r.id) : [...f.role_ids, r.id],
                        }))}
                        className={`text-[12px] px-3 py-1 rounded-lg border transition-colors ${
                          selected ? 'bg-accent/20 text-accent border-accent/30' : 'border-border text-text-secondary hover:bg-surface-hover'
                        }`}>
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-text-tertiary mb-1 uppercase tracking-widest">Tenants</label>
                <div className="flex flex-wrap gap-2">
                  {tenants.map(t => {
                    const selected = form.organization_ids.includes(t.id);
                    return (
                      <button type="button" key={t.id}
                        onClick={() => setForm(f => ({
                          ...f,
                          organization_ids: selected ? f.organization_ids.filter(x => x !== t.id) : [...f.organization_ids, t.id],
                        }))}
                        className={`text-[12px] px-3 py-1 rounded-lg border transition-colors ${
                          selected ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'border-border text-text-secondary hover:bg-surface-hover'
                        }`}>
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setFormMode(false)}
                  className="px-4 py-2 rounded-xl border border-border text-[13px] text-text-secondary hover:bg-surface-hover">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 rounded-xl btn-gradient text-white text-[13px] font-medium disabled:opacity-50">
                  {saving ? 'Guardando…' : (formMode === 'create' ? 'Crear' : 'Guardar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password reset result */}
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated border border-accent/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-[15px] font-medium text-text-primary mb-2">Password reseteado</h3>
            <p className="text-[11px] text-text-tertiary mb-3">
              Nueva contraseña para <code>{resetResult.username}</code>. <strong>Cópiala ahora</strong>, no se volverá a mostrar.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 px-3 py-2 rounded-xl bg-surface-secondary border border-border font-mono text-[13px]">
                {resetResult.password}
              </div>
              <button onClick={copyPassword}
                className="p-2 rounded-xl border border-border hover:bg-surface-hover transition-colors">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-text-secondary" />}
              </button>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setResetResult(null)}
                className="px-4 py-2 rounded-xl btn-gradient text-white text-[13px] font-medium">
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, center, right }: { children: React.ReactNode; center?: boolean; right?: boolean }) {
  const align = center ? 'text-center' : right ? 'text-right' : 'text-left';
  return <th className={`px-4 py-3 font-medium text-text-tertiary text-[11px] uppercase tracking-widest ${align}`}>{children}</th>;
}

function FormInput({
  label, value, onChange, type = 'text', required = false, disabled = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] text-text-tertiary mb-1">{label}</label>
      <input
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </div>
  );
}
