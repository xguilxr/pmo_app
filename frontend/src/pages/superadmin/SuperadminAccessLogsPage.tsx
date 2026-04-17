import { useMemo, useState } from 'react';
import { FileText, Filter, RefreshCw, Search, LogIn, LogOut, ShieldAlert, KeyRound, Ban } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { superadminApi } from '../../services/superadmin';

/**
 * Super admin access log page.
 *
 * Shows authentication-related audit entries (logins, logouts, password
 * changes/resets) across the whole platform. Defaults to platform-level rows
 * (``tenant_id`` unset) because each login writes one platform row plus one
 * per tenant the user belongs to — showing them all by default would
 * duplicate every entry.
 */

const ACTION_META: Record<string, { label: string; color: string; icon: typeof LogIn }> = {
  login_success: { label: 'Login exitoso', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: LogIn },
  login_failed: { label: 'Login fallido', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: ShieldAlert },
  login_blocked: { label: 'Login bloqueado', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Ban },
  logout: { label: 'Cierre de sesión', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', icon: LogOut },
  password_change: { label: 'Cambio de contraseña', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: KeyRound },
  password_reset: { label: 'Reset por admin', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', icon: KeyRound },
  password_reset_platform: { label: 'Reset super admin', color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20', icon: KeyRound },
  password_reset_request: { label: 'Solicitud de reset', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: KeyRound },
};

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas las acciones' },
  ...Object.entries(ACTION_META).map(([value, meta]) => ({ value, label: meta.label })),
];

const DAYS_OPTIONS = [
  { value: 1, label: 'Últimas 24 h' },
  { value: 7, label: 'Últimos 7 días' },
  { value: 30, label: 'Últimos 30 días' },
  { value: 90, label: 'Últimos 90 días' },
  { value: 365, label: 'Último año' },
];

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString('es-MX', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function SuperadminAccessLogsPage() {
  const [search, setSearch] = useState('');

  // Filters
  const [action, setAction] = useState('');
  const [tenantId, setTenantId] = useState<number | ''>('');
  const [days, setDays] = useState(30);

  const tenantsApi = useApi(() => superadminApi.listTenants(true), []);
  const logsApi = useApi(
    () => {
      const params: Record<string, string | number | undefined> = { days };
      if (action) params.action = action;
      if (tenantId !== '') params.tenant_id = tenantId;
      return superadminApi.accessLogs(params);
    },
    [action, tenantId, days],
  );

  const tenants = tenantsApi.data || [];
  const logs = useMemo(() => logsApi.data || [], [logsApi.data]);
  const loading = logsApi.loading;
  const error = logsApi.error;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(l =>
      (l.username || '').toLowerCase().includes(q)
      || (l.full_name || '').toLowerCase().includes(q)
      || (l.organization_name || '').toLowerCase().includes(q)
      || (l.ip_address || '').toLowerCase().includes(q)
      || (l.details || '').toLowerCase().includes(q),
    );
  }, [logs, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Super Admin', href: '/superadmin' }, { label: 'Logs' }, { label: 'Acceso' }]}
        title="Logs de acceso"
        subtitle="Inicios de sesión, logouts y cambios de contraseña en toda la plataforma"
      >
        <button onClick={logsApi.refetch}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-[12px] text-text-secondary hover:bg-surface-hover">
          <RefreshCw className="w-3.5 h-3.5" /> Refrescar
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="liquid-glass-border rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] text-text-tertiary mb-1">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Usuario, tenant, IP, detalles…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px]" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-text-tertiary mb-1">Acción</label>
          <select value={action} onChange={e => setAction(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px]">
            {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-text-tertiary mb-1">Tenant</label>
          <select
            value={tenantId}
            onChange={e => setTenantId(e.target.value === '' ? '' : Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px]"
          >
            <option value="">Plataforma (sin duplicados)</option>
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
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-40 text-text-tertiary" />
          <p className="text-[13px] text-text-tertiary">Sin eventos en los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="liquid-glass-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-surface-secondary/50 text-text-tertiary uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Acción</th>
                  <th className="text-left px-4 py-3 font-medium">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium">IP</th>
                  <th className="text-left px-4 py-3 font-medium">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const meta = ACTION_META[l.action] || {
                    label: l.action, color: 'text-text-secondary bg-surface-secondary border-border', icon: FileText,
                  };
                  const Icon = meta.icon;
                  return (
                    <tr key={l.id} className="border-t border-border-light hover:bg-surface-hover/40">
                      <td className="px-4 py-2.5 text-text-tertiary font-mono text-[11px] whitespace-nowrap">{formatTimestamp(l.timestamp)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg border ${meta.color}`}>
                          <Icon className="w-3 h-3" /> {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-text-primary">
                        {l.full_name || l.username || <span className="italic text-text-tertiary">anónimo</span>}
                        {l.username && l.full_name && (
                          <span className="text-text-tertiary"> · @{l.username}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {l.organization_name || <span className="italic text-text-tertiary">plataforma</span>}
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary font-mono text-[11px]">{l.ip_address || '—'}</td>
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
