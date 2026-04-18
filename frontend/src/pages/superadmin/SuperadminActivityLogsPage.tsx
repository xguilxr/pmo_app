import { useMemo, useState } from 'react';
import { ClipboardList, Filter, RefreshCw, Search } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { superadminApi } from '../../services/superadmin';

/**
 * Super admin activity log page.
 *
 * Surfaces every non-auth audit entry on the platform: organizations,
 * programs, projects, RAID items, minutes, documents, users, roles, etc.
 * Filterable by module, action, tenant and user so a super admin can audit
 * a tenant without entering it.
 */

const DAYS_OPTIONS = [
  { value: 1, label: 'Últimas 24 h' },
  { value: 7, label: 'Últimos 7 días' },
  { value: 30, label: 'Últimos 30 días' },
  { value: 90, label: 'Últimos 90 días' },
  { value: 365, label: 'Último año' },
];

const MODULE_COLORS: Record<string, string> = {
  organization: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  program: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  project: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  risk: 'text-red-400 bg-red-500/10 border-red-500/20',
  issue: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  change: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  minute: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  document: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  lesson: 'text-lime-400 bg-lime-500/10 border-lime-500/20',
  user: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
  role: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  superadmin: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  tenant: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
};

const ACTION_COLORS: Record<string, string> = {
  create: 'text-emerald-400 bg-emerald-500/10',
  update: 'text-sky-400 bg-sky-500/10',
  delete: 'text-red-400 bg-red-500/10',
  deactivate: 'text-amber-400 bg-amber-500/10',
  activate: 'text-emerald-400 bg-emerald-500/10',
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString('es-MX', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function actionLabel(action: string) {
  // "create_project" → "create". Actions are sometimes just "create" too.
  const base = action.split('_')[0];
  return base;
}

export default function SuperadminActivityLogsPage() {
  const [search, setSearch] = useState('');

  // Filters
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [tenantId, setTenantId] = useState<number | ''>('');
  const [days, setDays] = useState(7);

  const tenantsApi = useApi(() => superadminApi.listTenants(true), []);
  const logsApi = useApi(
    () => {
      const params: Record<string, string | number | undefined> = { days };
      if (moduleFilter) params.module = moduleFilter;
      if (actionFilter) params.action = actionFilter;
      if (tenantId !== '') params.tenant_id = tenantId;
      return superadminApi.activityLogs(params);
    },
    [moduleFilter, actionFilter, tenantId, days],
  );

  const tenants = tenantsApi.data || [];
  const logs = useMemo(() => logsApi.data || [], [logsApi.data]);
  const loading = logsApi.loading;
  const error = logsApi.error;

  // Build the module dropdown from whatever came back so we stay in sync with
  // whichever modules the backend actually emits.
  const modules = useMemo(() => {
    const s = new Set(logs.map(l => l.module));
    return Array.from(s).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(l =>
      (l.username || '').toLowerCase().includes(q)
      || (l.full_name || '').toLowerCase().includes(q)
      || (l.organization_name || '').toLowerCase().includes(q)
      || (l.action || '').toLowerCase().includes(q)
      || (l.module || '').toLowerCase().includes(q)
      || (l.details || '').toLowerCase().includes(q),
    );
  }, [logs, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Super Admin', href: '/superadmin' }, { label: 'Logs' }, { label: 'Actividad' }]}
        title="Logs de actividad"
        subtitle="Creaciones, actualizaciones y eliminaciones en organizaciones, programas, proyectos, RAID, actas y usuarios"
      >
        <button onClick={logsApi.refetch}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-[12px] text-text-secondary hover:bg-surface-hover">
          <RefreshCw className="w-3.5 h-3.5" /> Refrescar
        </button>
      </PageHeader>

      <div className="liquid-glass-border rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] text-text-tertiary mb-1">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Usuario, módulo, acción, detalles…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px]" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-text-tertiary mb-1">Módulo</label>
          <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px]">
            <option value="">Todos</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-text-tertiary mb-1">Acción</label>
          <input value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            placeholder="create, update, delete…"
            className="px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] w-48" />
        </div>
        <div>
          <label className="block text-[11px] text-text-tertiary mb-1">Tenant</label>
          <select value={tenantId} onChange={e => setTenantId(e.target.value === '' ? '' : Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px]">
            <option value="">Todos</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-text-tertiary mb-1">Rango</label>
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px]">
            {DAYS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="text-[11px] text-text-tertiary flex items-center gap-1 pb-2">
          <Filter className="w-3.5 h-3.5" /> {filtered.length} registro(s)
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-[12px]">{error}</div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 liquid-glass-border rounded-2xl">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40 text-text-tertiary" />
          <p className="text-[13px] text-text-tertiary">Sin actividad en los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="liquid-glass-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-surface-secondary/50 text-text-tertiary uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium">Módulo</th>
                  <th className="text-left px-4 py-3 font-medium">Acción</th>
                  <th className="text-left px-4 py-3 font-medium">Registro</th>
                  <th className="text-left px-4 py-3 font-medium">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const moduleColor = MODULE_COLORS[l.module] || 'text-text-secondary bg-surface-secondary border-border';
                  const actionColor = ACTION_COLORS[actionLabel(l.action)] || 'text-text-secondary bg-surface-secondary';
                  return (
                    <tr key={l.id} className="border-t border-border-light hover:bg-surface-hover/40">
                      <td className="px-4 py-2.5 text-text-tertiary font-mono text-[11px] whitespace-nowrap">{formatTimestamp(l.timestamp)}</td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {l.organization_name || <span className="italic text-text-tertiary">plataforma</span>}
                      </td>
                      <td className="px-4 py-2.5 text-text-primary">
                        {l.full_name || l.username || <span className="italic text-text-tertiary">sistema</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-lg border ${moduleColor}`}>
                          {l.module}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-lg ${actionColor}`}>
                          {l.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-text-tertiary font-mono text-[11px]">
                        {l.record_id != null ? `#${l.record_id}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary max-w-[360px] truncate" title={l.details || ''}>
                        {l.details || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
