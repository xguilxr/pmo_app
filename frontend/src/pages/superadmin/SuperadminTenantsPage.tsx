import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2, Plus, Search, Power, PowerOff, Copy, Check, KeyRound,
  Edit2, Trash2, Eye, Shield,
} from 'lucide-react';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import PageHeader from '../../components/common/PageHeader';
import { useToast } from '../../context/ToastContext';
import { superadminApi, enterTenantAsAdmin, type Tenant } from '../../services/superadmin';

interface TenantFormState {
  name: string;
  legal_name: string;
  slug: string;
  domain: string;
  industry: string;
  country: string;
  contact_email: string;
  contact_name: string;
  contact_phone: string;
  primary_color: string;
  secondary_color: string;
  admin_username: string;
  admin_email: string;
  admin_full_name: string;
  admin_password: string;
}

const emptyForm: TenantFormState = {
  name: '', legal_name: '', slug: '', domain: '', industry: '', country: 'México',
  contact_email: '', contact_name: '', contact_phone: '',
  primary_color: '#3B82F6', secondary_color: '#6366F1',
  admin_username: '', admin_email: '', admin_full_name: '', admin_password: '',
};

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface ProvisionResult {
  tenant: { id: number; name: string };
  admin_username: string;
  admin_email: string;
  admin_password: string;
}

export default function SuperadminTenantsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toastSuccess, toastError } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState<false | 'create' | Tenant>(false);
  const [form, setForm] = useState<TenantFormState>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [credentials, setCredentials] = useState<ProvisionResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tenant | null>(null);
  const [hardDeleteSlug, setHardDeleteSlug] = useState('');

  const { data: tenants, loading, refetch } = useApi(
    () => superadminApi.listTenants(true), []);

  // Open the create modal when navigated here with ?new=1 (e.g. from the
  // Overview page "Nuevo tenant" shortcut). Strip the flag after opening so
  // refreshes don't reopen the modal.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setForm({ ...emptyForm });
      setFormError('');
      setShowForm('create');
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    const list = tenants || [];
    return list.filter(t => {
      if (statusFilter === 'active' && !t.is_active) return false;
      if (statusFilter === 'inactive' && t.is_active) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(s) ||
        (t.slug || '').toLowerCase().includes(s) ||
        (t.industry || '').toLowerCase().includes(s) ||
        (t.contact_email || '').toLowerCase().includes(s)
      );
    });
  }, [tenants, search, statusFilter]);

  function openCreate() {
    setForm({ ...emptyForm });
    setFormError('');
    setShowForm('create');
  }

  function openEdit(t: Tenant) {
    setForm({
      ...emptyForm,
      name: t.name,
      legal_name: t.legal_name || '',
      slug: t.slug || '',
      domain: t.domain || '',
      industry: t.industry || '',
      country: t.country || 'México',
      contact_email: t.contact_email || '',
      contact_name: t.contact_name || '',
      contact_phone: t.contact_phone || '',
      primary_color: t.primary_color || '#3B82F6',
      secondary_color: t.secondary_color || '#6366F1',
    });
    setFormError('');
    setShowForm(t);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (showForm === 'create') {
        const payload: Record<string, unknown> = {
          name: form.name,
          legal_name: form.legal_name || null,
          slug: form.slug || slugify(form.name),
          domain: form.domain || null,
          industry: form.industry || null,
          country: form.country || null,
          contact_email: form.contact_email || null,
          contact_name: form.contact_name || null,
          contact_phone: form.contact_phone || null,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
        };
        (['admin_username', 'admin_email', 'admin_full_name', 'admin_password'] as const)
          .forEach(k => { if (form[k]) payload[k] = form[k]; });
        const result = await superadminApi.createTenant(payload);
        setCredentials({
          tenant: { id: result.id, name: result.name },
          admin_username: result.admin_username,
          admin_email: result.admin_email,
          admin_password: result.admin_password,
        });
        toastSuccess(`Tenant "${result.name}" creado`);
      } else if (typeof showForm === 'object') {
        const payload: Record<string, unknown> = {
          name: form.name,
          legal_name: form.legal_name || null,
          slug: form.slug || null,
          domain: form.domain || null,
          industry: form.industry || null,
          country: form.country || null,
          contact_email: form.contact_email || null,
          contact_name: form.contact_name || null,
          contact_phone: form.contact_phone || null,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
        };
        await superadminApi.updateTenant(showForm.id, payload);
        toastSuccess('Tenant actualizado');
      }
      setShowForm(false);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: Tenant) {
    try {
      await superadminApi.toggleTenantActive(t.id, !t.is_active);
      toastSuccess(`${t.name} ${!t.is_active ? 'activado' : 'desactivado'}`);
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  }

  async function softDelete(t: Tenant) {
    if (!window.confirm(`¿Desactivar y marcar como eliminado el tenant "${t.name}"?\nEsto oculta al tenant pero conserva su información.`)) return;
    try {
      await superadminApi.deactivateTenant(t.id);
      toastSuccess(`Tenant "${t.name}" eliminado (soft delete)`);
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  async function hardDelete() {
    if (!confirmDelete) return;
    try {
      await superadminApi.hardDeleteTenant(confirmDelete.id, hardDeleteSlug);
      toastSuccess(`Tenant "${confirmDelete.name}" eliminado permanentemente`);
      setConfirmDelete(null);
      setHardDeleteSlug('');
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al eliminar permanentemente');
    }
  }

  async function openAsAdmin(t: Tenant) {
    try {
      await enterTenantAsAdmin(t.id);
      toastSuccess(`Acceso otorgado a "${t.name}"`);
      navigate('/admin/users');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo acceder al tenant');
    }
  }

  async function copyToClipboard(value: string, field: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      /* silent — clipboard may be disabled */
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumb={[{ label: 'Super Admin', href: '/superadmin' }, { label: 'Tenants' }]} title="Gestión de Tenants" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Super Admin', href: '/superadmin' }, { label: 'Tenants' }]}
        title="Gestión de Tenants"
        subtitle="Alta, baja, modificación y activación de tenants de la plataforma"
      >
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gradient text-white text-[13px] font-medium shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all"
        >
          <Plus className="w-4 h-4" /> Nuevo tenant
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar tenant por nombre, slug, industria o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="flex items-center gap-1 bg-surface-elevated border border-border rounded-xl p-1">
          {(['all', 'active', 'inactive'] as const).map(key => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                statusFilter === key ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {key === 'all' ? 'Todos' : key === 'active' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-text-tertiary">{filtered.length} tenant(s)</p>
      </div>

      {/* Tenant table */}
      <div className="liquid-glass-border rounded-2xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-elevated/50 border-b border-border">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium text-text-tertiary text-[11px] uppercase tracking-widest">Tenant</th>
              <th className="px-4 py-3 font-medium text-text-tertiary text-[11px] uppercase tracking-widest">Slug / Dominio</th>
              <th className="px-4 py-3 font-medium text-text-tertiary text-[11px] uppercase tracking-widest">Industria</th>
              <th className="px-4 py-3 font-medium text-text-tertiary text-[11px] uppercase tracking-widest text-center">Usuarios</th>
              <th className="px-4 py-3 font-medium text-text-tertiary text-[11px] uppercase tracking-widest text-center">Proyectos</th>
              <th className="px-4 py-3 font-medium text-text-tertiary text-[11px] uppercase tracking-widest text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-text-tertiary text-[11px] uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/5 p-0.5" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-[12px]"
                        style={{ backgroundColor: t.primary_color || '#3B82F6' }}
                      >
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <Link to={`/superadmin/tenants/${t.id}`} className="text-text-primary hover:text-accent font-medium">
                        {t.name}
                      </Link>
                      <p className="text-[11px] text-text-tertiary">{t.country || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[12px]">{t.slug || '—'}</span>
                    {t.domain && <span className="text-[11px] text-text-tertiary">{t.domain}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-secondary">{t.industry || '—'}</td>
                <td className="px-4 py-3 text-center text-text-secondary">{t.user_count}</td>
                <td className="px-4 py-3 text-center text-text-secondary">{t.project_count}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleActive(t)}
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${
                      t.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400'
                        : 'bg-red-500/10 text-red-400 hover:bg-emerald-500/10 hover:text-emerald-400'
                    }`}
                    title={t.is_active ? 'Click para desactivar' : 'Click para activar'}
                  >
                    {t.is_active ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                    {t.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/superadmin/tenants/${t.id}`}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-accent/10 transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => openAsAdmin(t)}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      title="Actuar como admin del tenant"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {t.is_active ? (
                      <button
                        onClick={() => softDelete(t)}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Desactivar + soft delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => { setConfirmDelete(t); setHardDeleteSlug(''); }}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Borrado permanente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-text-tertiary text-[13px]">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  No hay tenants que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit modal */}
      {showForm !== false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <h2 className="text-[16px] font-medium text-text-primary mb-5">
              {showForm === 'create' ? 'Nuevo tenant' : `Editar "${showForm.name}"`}
            </h2>
            {formError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-400 text-[12px]">{formError}</div>}
            <form onSubmit={submitForm} className="space-y-4">
              <p className="text-[11px] text-text-tertiary uppercase tracking-widest font-medium">Datos del tenant</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nombre *" value={form.name} onChange={v => setForm(f => ({
                  ...f,
                  name: v,
                  slug: showForm === 'create' && !f.slug ? slugify(v) : f.slug,
                }))} required />
                <Input label="Razón social" value={form.legal_name} onChange={v => setForm(f => ({ ...f, legal_name: v }))} />
                <Input label="Slug *" value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} required
                  hint={`URL: pmoaas.${form.slug || '…'}.com`} />
                <Input label="Dominio propio" value={form.domain} onChange={v => setForm(f => ({ ...f, domain: v }))}
                  hint="app.midominio.com (opcional)" />
                <Input label="Industria" value={form.industry} onChange={v => setForm(f => ({ ...f, industry: v }))} />
                <Input label="País" value={form.country} onChange={v => setForm(f => ({ ...f, country: v }))} />
                <Input label="Contacto" value={form.contact_name} onChange={v => setForm(f => ({ ...f, contact_name: v }))} />
                <Input label="Email contacto" type="email" value={form.contact_email}
                  onChange={v => setForm(f => ({ ...f, contact_email: v }))} />
                <Input label="Teléfono contacto" value={form.contact_phone} onChange={v => setForm(f => ({ ...f, contact_phone: v }))} />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] text-text-tertiary mb-1">Color primario</label>
                    <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="w-full h-9 rounded-xl cursor-pointer" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] text-text-tertiary mb-1">Color secundario</label>
                    <input type="color" value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} className="w-full h-9 rounded-xl cursor-pointer" />
                  </div>
                </div>
              </div>

              {showForm === 'create' && (
                <>
                  <p className="text-[11px] text-text-tertiary uppercase tracking-widest font-medium pt-3">Administrador inicial</p>
                  <p className="text-[11px] text-text-tertiary -mt-2">
                    Campos opcionales — si los dejas vacíos se genera un admin <code>{`{slug}_admin`}</code> con contraseña aleatoria.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Username" value={form.admin_username} placeholder={form.slug ? `${form.slug}_admin` : 'auto'}
                      onChange={v => setForm(f => ({ ...f, admin_username: v }))} />
                    <Input label="Email" type="email" value={form.admin_email}
                      placeholder={form.contact_email || `admin@${form.slug || 'tenant'}.local`}
                      onChange={v => setForm(f => ({ ...f, admin_email: v }))} />
                    <Input label="Nombre completo" value={form.admin_full_name}
                      placeholder={`Admin ${form.name || ''}`.trim()}
                      onChange={v => setForm(f => ({ ...f, admin_full_name: v }))} />
                    <Input label="Password (≥12c, mayús + dígito)" type="password" value={form.admin_password}
                      placeholder="Auto-generado si vacío"
                      onChange={v => setForm(f => ({ ...f, admin_password: v }))} />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl border border-border text-[13px] text-text-secondary hover:bg-surface-hover transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 rounded-xl btn-gradient text-white text-[13px] font-medium shadow-lg shadow-accent/20 disabled:opacity-50">
                  {saving ? 'Guardando…' : (showForm === 'create' ? 'Crear tenant' : 'Guardar cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials modal */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated border border-accent/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-text-primary">Tenant creado: {credentials.tenant.name}</h3>
                <p className="text-[11px] text-text-tertiary">Credenciales del Administrador del tenant</p>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
              <p className="text-[11px] text-amber-300">
                Guarda la contraseña ahora. Esta es la <strong>única vez</strong> que se muestra.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Username', value: credentials.admin_username, field: 'username' },
                { label: 'Email', value: credentials.admin_email, field: 'email' },
                { label: 'Password', value: credentials.admin_password, field: 'password', mono: true },
              ].map(({ label, value, field, mono }) => (
                <div key={field} className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-text-tertiary uppercase tracking-widest mb-1">{label}</label>
                    <div className={`px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] text-text-primary ${mono ? 'font-mono' : ''}`}>
                      {value}
                    </div>
                  </div>
                  <button onClick={() => copyToClipboard(value, field)}
                    className="mt-5 p-2 rounded-xl border border-border hover:bg-surface-hover transition-colors"
                    title={`Copiar ${label.toLowerCase()}`}>
                    {copiedField === field ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-text-secondary" />}
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-5">
              <Link to={`/superadmin/tenants/${credentials.tenant.id}`}
                className="px-4 py-2 rounded-xl border border-border text-[13px] text-text-secondary hover:bg-surface-hover transition-colors"
                onClick={() => setCredentials(null)}>
                Abrir tenant
              </Link>
              <button onClick={() => setCredentials(null)}
                className="px-5 py-2 rounded-xl btn-gradient text-white text-[13px] font-medium shadow-lg shadow-accent/20">
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hard delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-[15px] font-medium text-red-400 mb-3">Borrado permanente</h3>
            <p className="text-[13px] text-text-secondary mb-4">
              Esta acción <strong>no es reversible</strong>. Se eliminarán todos los datos del tenant
              "<strong>{confirmDelete.name}</strong>" incluyendo proyectos, riesgos, minutas, usuarios huérfanos, etc.
            </p>
            <label className="block text-[11px] text-text-tertiary mb-1">
              Escribe el slug del tenant para confirmar: <code className="text-text-primary">{confirmDelete.slug}</code>
            </label>
            <input
              value={hardDeleteSlug}
              onChange={e => setHardDeleteSlug(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] text-text-primary font-mono"
              placeholder={confirmDelete.slug || ''}
            />
            <div className="flex justify-end gap-3 pt-5">
              <button onClick={() => { setConfirmDelete(null); setHardDeleteSlug(''); }}
                className="px-4 py-2 rounded-xl border border-border text-[13px] text-text-secondary hover:bg-surface-hover transition-colors">
                Cancelar
              </button>
              <button
                disabled={hardDeleteSlug !== confirmDelete.slug}
                onClick={hardDelete}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-[13px] font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Eliminar permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({
  label, value, onChange, type = 'text', required = false, placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] text-text-tertiary mb-1">{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      {hint && <p className="text-[10px] text-text-tertiary mt-1">{hint}</p>}
    </div>
  );
}
