import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Building2, Users, FolderKanban, Plus, Activity,
  Server, ChevronRight, Search, Power, PowerOff,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import PageHeader from '../../components/common/PageHeader';

interface Tenant {
  id: number;
  name: string;
  slug: string | null;
  domain: string | null;
  industry: string | null;
  country: string | null;
  contact_email: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  is_active: boolean;
  created_at: string;
  user_count: number;
  project_count: number;
}

interface ServerHealth {
  status: string;
  platform: string;
  db_connected: boolean;
  db_tenant_count: number;
  db_user_count: number;
  db_project_count: number;
  disk_free_gb: number | null;
  disk_total_gb: number | null;
  uptime_info: string | null;
}

interface ProvisionForm {
  name: string;
  slug: string;
  industry: string;
  country: string;
  contact_email: string;
  primary_color: string;
  secondary_color: string;
  admin_username: string;
  admin_email: string;
  admin_full_name: string;
  admin_password: string;
}

const emptyProvision: ProvisionForm = {
  name: '', slug: '', industry: '', country: 'Mexico',
  contact_email: '', primary_color: '#3B82F6', secondary_color: '#6366F1',
  admin_username: '', admin_email: '', admin_full_name: '', admin_password: '',
};

export default function SuperadminDashboardPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [showProvision, setShowProvision] = useState(false);
  const [form, setForm] = useState<ProvisionForm>({ ...emptyProvision });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: tenants, loading, refetch } = useApi(
    () => api.get<Tenant[]>('/superadmin/tenants?include_inactive=true'), []
  );
  const { data: health } = useApi(() => api.get<ServerHealth>('/superadmin/health'), []);

  const filtered = (tenants || []).filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.slug || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.industry || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/superadmin/provision', form);
      setShowProvision(false);
      setForm({ ...emptyProvision });
      refetch();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al provisionar');
    } finally {
      setSaving(false);
    }
  };

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumb={[{ label: 'Super Admin' }]} title="Panel de Administracion" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Super Admin' }]}
        title="PMOAAS - Panel Super Admin"
        actions={
          <button
            onClick={() => setShowProvision(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gradient text-white text-[13px] font-medium shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all"
          >
            <Plus className="w-4 h-4" /> Provisionar Tenant
          </button>
        }
      />

      {/* Health Overview */}
      {health && (
        <div className="grid grid-cols-5 gap-4">
          <div className="liquid-glass-border rounded-2xl p-4 card-glow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] text-text-tertiary uppercase tracking-widest">Estado</p>
                <p className="text-lg font-semibold text-emerald-400">{health.db_connected ? 'Online' : 'Offline'}</p>
              </div>
            </div>
          </div>
          <div className="liquid-glass-border rounded-2xl p-4 card-glow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-[11px] text-text-tertiary uppercase tracking-widest">Tenants</p>
                <p className="text-lg font-semibold text-text-primary">{health.db_tenant_count}</p>
              </div>
            </div>
          </div>
          <div className="liquid-glass-border rounded-2xl p-4 card-glow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-[11px] text-text-tertiary uppercase tracking-widest">Usuarios</p>
                <p className="text-lg font-semibold text-text-primary">{health.db_user_count}</p>
              </div>
            </div>
          </div>
          <div className="liquid-glass-border rounded-2xl p-4 card-glow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] text-text-tertiary uppercase tracking-widest">Proyectos</p>
                <p className="text-lg font-semibold text-text-primary">{health.db_project_count}</p>
              </div>
            </div>
          </div>
          <div className="liquid-glass-border rounded-2xl p-4 card-glow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Server className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-[11px] text-text-tertiary uppercase tracking-widest">Disco libre</p>
                <p className="text-lg font-semibold text-text-primary">{health.disk_free_gb ? `${health.disk_free_gb} GB` : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar tenant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <p className="text-[12px] text-text-tertiary">{filtered.length} tenant(s)</p>
      </div>

      {/* Tenant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(tenant => (
          <Link
            key={tenant.id}
            to={`/superadmin/tenants/${tenant.id}`}
            className="liquid-glass-border rounded-2xl p-5 card-glow hover:scale-[1.01] transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-[15px]"
                  style={{ backgroundColor: tenant.primary_color || '#3B82F6' }}
                >
                  {tenant.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-[14px] font-medium text-text-primary group-hover:text-accent transition-colors">
                    {tenant.name}
                  </h3>
                  <p className="text-[11px] text-text-tertiary">
                    {tenant.slug ? `pmoaas.${tenant.slug}.com` : 'Sin slug'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {tenant.is_active ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <Power className="w-3 h-3" /> Activo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">
                    <PowerOff className="w-3 h-3" /> Inactivo
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-[18px] font-semibold text-text-primary">{tenant.user_count}</p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Usuarios</p>
              </div>
              <div className="text-center">
                <p className="text-[18px] font-semibold text-text-primary">{tenant.project_count}</p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Proyectos</p>
              </div>
              <div className="text-center">
                <p className="text-[18px] font-semibold text-text-primary">{tenant.industry || '-'}</p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Industria</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border-light">
              <p className="text-[11px] text-text-tertiary">
                {tenant.country} {tenant.contact_email ? `| ${tenant.contact_email}` : ''}
              </p>
              <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-accent transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-40" />
          <p className="text-text-tertiary text-[13px]">No hay tenants registrados</p>
          <button
            onClick={() => setShowProvision(true)}
            className="mt-4 px-4 py-2 rounded-xl btn-gradient text-white text-[13px] font-medium"
          >
            Provisionar primer tenant
          </button>
        </div>
      )}

      {/* Provision Modal */}
      {showProvision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <h2 className="text-[16px] font-medium text-text-primary mb-5">Provisionar Nuevo Tenant</h2>
            {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-400 text-[12px]">{error}</div>}
            <form onSubmit={handleProvision} className="space-y-4">
              <p className="text-[11px] text-text-tertiary uppercase tracking-widest font-medium">Datos del Tenant</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-text-tertiary mb-1">Nombre *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => { setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) }); }}
                    className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-tertiary mb-1">Slug *</label>
                  <input
                    required
                    value={form.slug}
                    onChange={e => setForm({ ...form, slug: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <p className="text-[10px] text-text-tertiary mt-1">URL: pmoaas.{form.slug || '...'}.com</p>
                </div>
                <div>
                  <label className="block text-[11px] text-text-tertiary mb-1">Industria</label>
                  <input
                    value={form.industry}
                    onChange={e => setForm({ ...form, industry: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-tertiary mb-1">Pais</label>
                  <input
                    value={form.country}
                    onChange={e => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-tertiary mb-1">Email contacto</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={e => setForm({ ...form, contact_email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] text-text-tertiary mb-1">Color primario</label>
                    <input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} className="w-full h-9 rounded-xl cursor-pointer" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] text-text-tertiary mb-1">Color secundario</label>
                    <input type="color" value={form.secondary_color} onChange={e => setForm({ ...form, secondary_color: e.target.value })} className="w-full h-9 rounded-xl cursor-pointer" />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-text-tertiary uppercase tracking-widest font-medium pt-3">Admin del Tenant</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-text-tertiary mb-1">Username *</label>
                  <input
                    required
                    value={form.admin_username}
                    onChange={e => setForm({ ...form, admin_username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-tertiary mb-1">Email *</label>
                  <input
                    required type="email"
                    value={form.admin_email}
                    onChange={e => setForm({ ...form, admin_email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-tertiary mb-1">Nombre completo *</label>
                  <input
                    required
                    value={form.admin_full_name}
                    onChange={e => setForm({ ...form, admin_full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-tertiary mb-1">Password *</label>
                  <input
                    required type="password"
                    value={form.admin_password}
                    onChange={e => setForm({ ...form, admin_password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowProvision(false); setError(''); }}
                  className="px-4 py-2 rounded-xl border border-border text-[13px] text-text-secondary hover:bg-surface-hover transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl btn-gradient text-white text-[13px] font-medium shadow-lg shadow-accent/20 disabled:opacity-50"
                >
                  {saving ? 'Provisionando...' : 'Provisionar Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
