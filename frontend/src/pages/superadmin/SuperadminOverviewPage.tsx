import { Link, useNavigate } from 'react-router-dom';
import {
  Activity, Building2, Users, FolderKanban, Layers, Shield,
  LogIn, AlertTriangle, ChevronRight, PowerOff, Power, Plus,
} from 'lucide-react';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import PageHeader from '../../components/common/PageHeader';
import { superadminApi, enterTenantAsAdmin, type Tenant } from '../../services/superadmin';
import { useToast } from '../../context/ToastContext';

function Stat({
  icon: Icon, label, value, tone = 'accent',
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; tone?: string }) {
  const bgMap: Record<string, string> = {
    accent: 'bg-indigo-500/10 text-indigo-400',
    green: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    red: 'bg-red-500/10 text-red-400',
    violet: 'bg-violet-500/10 text-violet-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
  };
  const tint = bgMap[tone] || bgMap.accent;
  return (
    <div className="liquid-glass-border rounded-2xl p-4 card-glow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tint}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[11px] text-text-tertiary uppercase tracking-widest">{label}</p>
          <p className="text-lg font-semibold text-text-primary">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function SuperadminOverviewPage() {
  const navigate = useNavigate();
  const { toastSuccess, toastError } = useToast();
  const { data: overview, loading: loadingOverview } = useApi(
    () => superadminApi.overview(), []);
  const { data: tenants, loading: loadingTenants, refetch } = useApi(
    () => superadminApi.listTenants(true), []);

  const loading = loadingOverview || loadingTenants;

  async function openTenantAsAdmin(t: Tenant, destination: string) {
    try {
      await enterTenantAsAdmin(t.id);
      toastSuccess(`Acceso de administrador concedido a "${t.name}"`);
      navigate(destination);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo acceder al tenant');
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

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumb={[{ label: 'Super Admin' }]} title="Panel Super Admin" />
        <LoadingSpinner />
      </div>
    );
  }

  const tenantList = tenants || [];
  const activeTenants = tenantList.filter(t => t.is_active);
  const inactiveTenants = tenantList.filter(t => !t.is_active);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Super Admin' }]}
        title="Panel Super Admin"
        subtitle="Resumen de tenants y salud de la plataforma"
      >
        <div className="flex items-center gap-2">
          <Link
            to="/superadmin/tenants"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-[13px] text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <Building2 className="w-4 h-4" /> Gestionar tenants
          </Link>
          <Link
            to="/superadmin/tenants?new=1"
            className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gradient text-white text-[13px] font-medium shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all"
          >
            <Plus className="w-4 h-4" /> Nuevo tenant
          </Link>
        </div>
      </PageHeader>

      {/* Platform stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <Stat icon={Building2} tone="accent" label="Tenants" value={overview.tenant_count} />
          <Stat icon={Power} tone="green" label="Activos" value={overview.tenant_active_count} />
          <Stat icon={PowerOff} tone="red" label="Inactivos" value={overview.tenant_inactive_count} />
          <Stat icon={Users} tone="violet" label="Usuarios" value={overview.user_count} />
          <Stat icon={Shield} tone="amber" label="Super admins" value={overview.superadmin_count} />
          <Stat icon={FolderKanban} tone="cyan" label="Proyectos" value={overview.project_count} />
          <Stat icon={Layers} tone="accent" label="Programas" value={overview.program_count} />
        </div>
      )}

      {overview && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="liquid-glass-border rounded-2xl p-5 card-glow">
            <div className="flex items-center gap-2 mb-3">
              <LogIn className="w-4 h-4 text-emerald-400" />
              <h3 className="text-[13px] font-medium text-text-primary">Actividad últimas 24h</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-tertiary">Logins exitosos</span>
                <span className="text-[15px] font-semibold text-emerald-400">{overview.logins_last_24h}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-text-tertiary">Fallidos / bloqueados</span>
                <span className="text-[15px] font-semibold text-red-400">{overview.failed_logins_last_24h}</span>
              </div>
            </div>
            <Link
              to="/superadmin/logs/access"
              className="inline-flex items-center gap-1 text-[11px] text-accent mt-3 hover:underline"
            >
              Ver logs de acceso <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="liquid-glass-border rounded-2xl p-5 card-glow lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-[13px] font-medium text-text-primary">Tenants recientes</h3>
            </div>
            <ul className="divide-y divide-border-light">
              {overview.recent_tenants.length === 0 && (
                <li className="text-[12px] text-text-tertiary py-4">Aún no hay tenants registrados.</li>
              )}
              {overview.recent_tenants.map(t => (
                <li key={t.id} className="flex items-center justify-between py-2">
                  <Link
                    to={`/superadmin/tenants/${t.id}`}
                    className="flex items-center gap-3 hover:text-accent"
                  >
                    <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-[12px] font-semibold text-accent">
                      {t.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-[13px] text-text-primary">{t.name}</p>
                      <p className="text-[11px] text-text-tertiary">{t.slug || 'sin slug'}</p>
                    </div>
                  </Link>
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-lg ${
                    t.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {t.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tenant status grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-medium text-text-primary">Tenants ({tenantList.length})</h3>
          <Link to="/superadmin/tenants" className="text-[12px] text-accent hover:underline">
            Abrir gestión completa →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...activeTenants, ...inactiveTenants].map(tenant => (
            <div
              key={tenant.id}
              className="liquid-glass-border rounded-2xl p-5 card-glow group"
            >
              <div className="flex items-start justify-between mb-3">
                <Link
                  to={`/superadmin/tenants/${tenant.id}`}
                  className="flex items-center gap-3"
                >
                  {tenant.logo_url ? (
                    <img
                      src={tenant.logo_url}
                      alt={tenant.name}
                      className="w-11 h-11 rounded-xl object-contain bg-white/5 p-1"
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-[15px]"
                      style={{ backgroundColor: tenant.primary_color || '#3B82F6' }}
                    >
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-[14px] font-medium text-text-primary group-hover:text-accent transition-colors">
                      {tenant.name}
                    </p>
                    <p className="text-[11px] text-text-tertiary">
                      {tenant.slug ? `${tenant.slug}.pmoaas` : 'Sin slug'}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => toggleActive(tenant)}
                  className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${
                    tenant.is_active
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400'
                      : 'bg-red-500/10 text-red-400 hover:bg-emerald-500/10 hover:text-emerald-400'
                  }`}
                  title={tenant.is_active ? 'Desactivar' : 'Activar'}
                >
                  {tenant.is_active ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                  {tenant.is_active ? 'Activo' : 'Inactivo'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div>
                  <p className="text-[16px] font-semibold text-text-primary">{tenant.user_count}</p>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Usuarios</p>
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-text-primary">{tenant.project_count}</p>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Proyectos</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-text-primary truncate">{tenant.industry || '—'}</p>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Industria</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border-light">
                <Link
                  to={`/superadmin/tenants/${tenant.id}`}
                  className="flex-1 text-center px-3 py-1.5 rounded-lg border border-border text-[11px] text-text-secondary hover:bg-surface-hover transition-colors"
                >
                  Ver detalle
                </Link>
                <button
                  onClick={() => openTenantAsAdmin(tenant, '/admin/users')}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-[11px] font-medium hover:bg-accent/20 transition-colors"
                  title="Ingresar como admin del tenant"
                >
                  Actuar como admin
                </button>
              </div>
            </div>
          ))}
        </div>
        {tenantList.length === 0 && (
          <div className="text-center py-16 liquid-glass-border rounded-2xl">
            <Building2 className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-40" />
            <p className="text-text-tertiary text-[13px] mb-4">No hay tenants registrados.</p>
            <Link
              to="/superadmin/tenants"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-gradient text-white text-[13px] font-medium"
            >
              <Building2 className="w-4 h-4" /> Provisionar primer tenant
            </Link>
          </div>
        )}
      </div>

      {overview && overview.failed_logins_last_24h > 5 && (
        <div className="liquid-glass-border rounded-2xl p-4 border-amber-500/30 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <div>
            <p className="text-[13px] text-text-primary">
              {overview.failed_logins_last_24h} intentos de login fallidos en las últimas 24h.
            </p>
            <Link to="/superadmin/logs/access?action=login_failed" className="text-[12px] text-accent hover:underline">
              Revisar logs de acceso →
            </Link>
          </div>
        </div>
      )}

      {overview && (
        <div className="liquid-glass-border rounded-2xl p-4 flex items-center gap-3 text-[11px] text-text-tertiary">
          <Activity className="w-4 h-4 text-emerald-400" />
          Plataforma operativa · {overview.tenant_active_count} de {overview.tenant_count} tenants activos
        </div>
      )}
    </div>
  );
}
