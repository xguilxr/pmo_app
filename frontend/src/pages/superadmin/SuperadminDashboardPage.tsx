import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Users, FolderKanban, Crown, Activity, AlertTriangle,
  LogIn, LogOut, KeyRound, ShieldAlert, Layers, Sparkles, ChevronRight,
  TrendingUp,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { superadminApi, type AccessLogEntry, type ActivityLogEntry } from '../../services/superadmin';

/**
 * Super admin general dashboard.
 *
 * Cross-tenant, platform-wide insights. This is the "zoomed-out" view —
 * the overview page focuses on tenants, this one focuses on platform
 * health and usage trends.
 */

const ACTION_ICONS: Record<string, typeof LogIn> = {
  login_success: LogIn,
  login_failed: ShieldAlert,
  login_blocked: ShieldAlert,
  logout: LogOut,
  password_change: KeyRound,
  password_reset: KeyRound,
  password_reset_platform: KeyRound,
  password_reset_request: KeyRound,
};

function formatRelative(ts: string): string {
  const d = new Date(ts).getTime();
  if (Number.isNaN(d)) return ts;
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'hace unos segundos';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)} d`;
  return new Date(ts).toLocaleDateString('es-MX');
}

export default function SuperadminDashboardPage() {
  const overviewApi = useApi(() => superadminApi.overview(), []);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      superadminApi.accessLogs({ days: 7, limit: 50 }),
      superadminApi.activityLogs({ days: 7, limit: 50 }),
    ])
      .then(([a, b]) => { setAccessLogs(a); setActivityLogs(b); })
      .catch(() => { /* dashboard is best-effort; user can open dedicated pages */ })
      .finally(() => setLogsLoading(false));
  }, []);

  const overview = overviewApi.data;

  // Aggregate activity by module for the last 7 days
  const activityByModule = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of activityLogs) map.set(l.module, (map.get(l.module) || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [activityLogs]);

  // Top contributors by activity count
  const topUsers = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const l of activityLogs) {
      if (!l.user_id) continue;
      const key = String(l.user_id);
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { name: l.full_name || l.username || `Usuario ${l.user_id}`, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [activityLogs]);

  // Last 7 days histogram for logins (success only, platform-level)
  const loginTrend = useMemo(() => {
    const buckets: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.push({ day: key, count: 0 });
    }
    for (const l of accessLogs) {
      if (l.action !== 'login_success') continue;
      const key = l.timestamp.slice(0, 10);
      const b = buckets.find(x => x.day === key);
      if (b) b.count += 1;
    }
    const max = Math.max(1, ...buckets.map(b => b.count));
    return buckets.map(b => ({
      ...b,
      label: new Date(b.day).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit' }),
      ratio: b.count / max,
    }));
  }, [accessLogs]);

  if (overviewApi.loading) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumb={[{ label: 'Super Admin', href: '/superadmin' }, { label: 'Dashboard' }]}
          title="Dashboard general" />
        <LoadingSpinner />
      </div>
    );
  }

  if (overviewApi.error || !overview) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumb={[{ label: 'Super Admin', href: '/superadmin' }, { label: 'Dashboard' }]}
          title="Dashboard general" />
        <div className="p-4 rounded-xl bg-red-500/10 text-red-400 text-[13px]">
          {overviewApi.error || 'No se pudieron cargar las métricas.'}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Tenants', value: overview.tenant_count, sub: `${overview.tenant_active_count} activos · ${overview.tenant_inactive_count} inactivos`, icon: Building2, color: 'text-indigo-400 bg-indigo-500/10' },
    { label: 'Usuarios', value: overview.user_count, sub: `${overview.superadmin_count} super admin`, icon: Users, color: 'text-violet-400 bg-violet-500/10' },
    { label: 'Programas', value: overview.program_count, icon: Layers, color: 'text-amber-400 bg-amber-500/10' },
    { label: 'Proyectos', value: overview.project_count, icon: FolderKanban, color: 'text-sky-400 bg-sky-500/10' },
    { label: 'Logins 24 h', value: overview.logins_last_24h, icon: LogIn, color: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Fallos 24 h', value: overview.failed_logins_last_24h, icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Super Admin', href: '/superadmin' }, { label: 'Dashboard' }]}
        title="Dashboard general"
        subtitle="Estado y uso de toda la plataforma PMOAAS"
      >
        <Link to="/superadmin/logs/access"
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-[12px] text-text-secondary hover:bg-surface-hover">
          <Activity className="w-3.5 h-3.5" /> Ver logs
        </Link>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="liquid-glass-border rounded-2xl p-4 card-glow">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-[11px] text-text-tertiary uppercase tracking-widest">{k.label}</p>
              </div>
              <p className="text-2xl font-semibold text-text-primary">{k.value}</p>
              {k.sub && <p className="text-[11px] text-text-tertiary mt-1">{k.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Two-column: login trend + activity by module */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="liquid-glass-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-medium text-text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Logins exitosos (7 días)
              </h3>
              <p className="text-[11px] text-text-tertiary mt-0.5">Sesiones iniciadas correctamente</p>
            </div>
          </div>
          <div className="flex items-end gap-2 h-40 pt-2">
            {loginTrend.map(b => (
              <div key={b.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500/60 to-emerald-400/30 border-t border-emerald-400/40"
                    style={{ height: `${Math.max(4, b.ratio * 100)}%` }}
                    title={`${b.count} logins`}
                  />
                </div>
                <span className="text-[10px] text-text-tertiary">{b.count}</span>
                <span className="text-[10px] text-text-tertiary uppercase">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="liquid-glass-border rounded-2xl p-5">
          <h3 className="text-[14px] font-medium text-text-primary mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" /> Actividad por módulo (7 días)
          </h3>
          {activityByModule.length === 0 ? (
            <p className="text-[12px] text-text-tertiary py-8 text-center">Sin actividad en los últimos 7 días.</p>
          ) : (
            <div className="space-y-2">
              {activityByModule.slice(0, 8).map(([module, count]) => {
                const max = activityByModule[0][1];
                return (
                  <div key={module}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="text-text-secondary capitalize">{module}</span>
                      <span className="text-text-tertiary">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Two-column: top users + tenants by industry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="liquid-glass-border rounded-2xl p-5">
          <h3 className="text-[14px] font-medium text-text-primary mb-4 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" /> Usuarios más activos (7 días)
          </h3>
          {topUsers.length === 0 ? (
            <p className="text-[12px] text-text-tertiary py-8 text-center">Aún no hay actividad.</p>
          ) : (
            <ul className="space-y-2">
              {topUsers.map((u, idx) => (
                <li key={u.name + idx} className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-accent/20 text-accent text-[12px] font-semibold flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <span className="text-[13px] text-text-primary">{u.name}</span>
                  </div>
                  <span className="text-[12px] text-text-tertiary">{u.count} acciones</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="liquid-glass-border rounded-2xl p-5">
          <h3 className="text-[14px] font-medium text-text-primary mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" /> Tenants por industria
          </h3>
          {overview.tenants_by_industry.length === 0 ? (
            <p className="text-[12px] text-text-tertiary py-8 text-center">No hay industrias registradas.</p>
          ) : (
            <div className="space-y-2">
              {overview.tenants_by_industry.map(row => {
                const max = Math.max(...overview.tenants_by_industry.map(r => r.count));
                return (
                  <div key={row.industry}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="text-text-secondary capitalize">{row.industry || 'Sin industria'}</span>
                      <span className="text-text-tertiary">{row.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
                        style={{ width: `${(row.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity feed */}
      <div className="liquid-glass-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-medium text-text-primary flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" /> Actividad reciente
          </h3>
          <Link to="/superadmin/logs/activity"
            className="text-[12px] text-accent hover:underline flex items-center gap-1">
            Ver todo <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {logsLoading ? (
          <LoadingSpinner />
        ) : activityLogs.length === 0 ? (
          <p className="text-[12px] text-text-tertiary py-8 text-center">Sin actividad reciente.</p>
        ) : (
          <ul className="divide-y divide-border-light">
            {activityLogs.slice(0, 10).map(l => {
              const Icon = ACTION_ICONS[l.action] || Activity;
              return (
                <li key={l.id} className="flex items-center gap-3 py-2.5 text-[12px]">
                  <Icon className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                  <span className="text-text-primary truncate">
                    <span className="font-medium">{l.full_name || l.username || 'Sistema'}</span>
                    <span className="text-text-tertiary"> · </span>
                    <span className="capitalize text-text-secondary">{l.action}</span>
                    <span className="text-text-tertiary"> en </span>
                    <span className="capitalize">{l.module}</span>
                    {l.organization_name && (
                      <span className="text-text-tertiary"> · {l.organization_name}</span>
                    )}
                  </span>
                  <span className="ml-auto text-text-tertiary whitespace-nowrap">{formatRelative(l.timestamp)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
