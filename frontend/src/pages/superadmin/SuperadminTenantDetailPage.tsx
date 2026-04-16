import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Users, FolderKanban, Layers,
  FileText, Power, PowerOff, Edit2, Save, X,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import PageHeader from '../../components/common/PageHeader';
import HealthBadge from '../../components/common/HealthBadge';
import { useToast } from '../../context/ToastContext';
import ProgressBar from '../../components/common/ProgressBar';

interface TenantDetail {
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
  primary_color: string | null;
  secondary_color: string | null;
  is_active: boolean;
  created_at: string;
  user_count: number;
  project_count: number;
  programs: ProgramSummary[];
  projects: ProjectSummary[];
  users: UserSummary[];
  requests: RequestSummary[];
}

interface ProgramSummary {
  id: number;
  name: string;
  status: string;
  project_count: number;
  start_date: string | null;
  end_date: string | null;
}

interface ProjectSummary {
  id: number;
  folio: string;
  name: string;
  type: string;
  phase: string;
  health: string;
  progress: number;
  planned_progress: number;
  budget: number;
  program_name: string | null;
}

interface UserSummary {
  id: number;
  username: string;
  full_name: string;
  email: string;
  roles: string[];
  is_active: boolean;
  last_login: string | null;
}

interface RequestSummary {
  id: number;
  folio: string;
  title: string;
  status: string;
  requester_name: string;
  request_date: string;
}

function formatMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

const statusColors: Record<string, string> = {
  in_review: 'bg-amber-500/10 text-amber-400',
  approved: 'bg-emerald-500/10 text-emerald-400',
  rejected: 'bg-red-500/10 text-red-400',
  info_requested: 'bg-blue-500/10 text-blue-400',
};

const statusLabels: Record<string, string> = {
  in_review: 'En revision',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  info_requested: 'Info solicitada',
};

export default function SuperadminTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'programs' | 'projects' | 'users' | 'requests'>('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);

  const { data: tenant, loading, refetch } = useApi(
    () => api.get<TenantDetail>(`/superadmin/tenants/${id}/detail`), [id]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/superadmin/tenants/${id}`, editForm);
      setEditing(false);
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al guardar tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      await api.patch(`/superadmin/tenants/${id}`, { is_active: !tenant.is_active });
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al cambiar estado del tenant');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !tenant) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumb={[{ label: 'Super Admin', href: '/superadmin' }, { label: 'Tenant' }]} title="Cargando..." />
        <LoadingSpinner />
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Resumen', icon: Building2 },
    { key: 'programs', label: `Programas (${tenant.programs.length})`, icon: Layers },
    { key: 'projects', label: `Proyectos (${tenant.projects.length})`, icon: FolderKanban },
    { key: 'users', label: `Usuarios (${tenant.users.length})`, icon: Users },
    { key: 'requests', label: `Solicitudes (${tenant.requests.length})`, icon: FileText },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: 'Super Admin', href: '/superadmin' },
          { label: tenant.name },
        ]}
        title={tenant.name}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleActive}
              disabled={saving}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all ${
                tenant.is_active
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {tenant.is_active ? <><PowerOff className="w-3.5 h-3.5" /> Desactivar</> : <><Power className="w-3.5 h-3.5" /> Activar</>}
            </button>
            <Link
              to="/superadmin"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-[12px] text-text-secondary hover:bg-surface-hover transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver
            </Link>
          </div>
        }
      />

      {/* Tenant Header Card */}
      <div className="liquid-glass-border rounded-2xl p-6 card-glow">
        <div className="flex items-start gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shrink-0"
            style={{ backgroundColor: tenant.primary_color || '#3B82F6' }}
          >
            {tenant.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-medium text-text-primary">{tenant.name}</h2>
              {tenant.is_active ? (
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">Activo</span>
              ) : (
                <span className="text-[10px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-lg">Inactivo</span>
              )}
            </div>
            <p className="text-[12px] text-text-tertiary mb-3">
              {tenant.slug ? `pmoaas.${tenant.slug}.com` : 'Sin slug configurado'} | {tenant.industry || 'Sin industria'} | {tenant.country || 'Sin pais'}
            </p>
            {!editing ? (
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Razon Social</p>
                  <p className="text-[13px] text-text-primary">{tenant.legal_name || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Contacto</p>
                  <p className="text-[13px] text-text-primary">{tenant.contact_email || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Telefono</p>
                  <p className="text-[13px] text-text-primary">{tenant.contact_phone || '-'}</p>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => { setEditing(true); setEditForm({ name: tenant.name, slug: tenant.slug || '', industry: tenant.industry || '', country: tenant.country || '', contact_email: tenant.contact_email || '' }); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] text-accent hover:bg-accent/10 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <input value={editForm.name as string || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nombre" className="px-3 py-1.5 rounded-xl bg-surface-secondary border border-border text-[12px] text-text-primary" />
                <input value={editForm.slug as string || ''} onChange={e => setEditForm({ ...editForm, slug: e.target.value })} placeholder="Slug" className="px-3 py-1.5 rounded-xl bg-surface-secondary border border-border text-[12px] text-text-primary" />
                <input value={editForm.industry as string || ''} onChange={e => setEditForm({ ...editForm, industry: e.target.value })} placeholder="Industria" className="px-3 py-1.5 rounded-xl bg-surface-secondary border border-border text-[12px] text-text-primary" />
                <input value={editForm.country as string || ''} onChange={e => setEditForm({ ...editForm, country: e.target.value })} placeholder="Pais" className="px-3 py-1.5 rounded-xl bg-surface-secondary border border-border text-[12px] text-text-primary" />
                <input value={editForm.contact_email as string || ''} onChange={e => setEditForm({ ...editForm, contact_email: e.target.value })} placeholder="Email" className="px-3 py-1.5 rounded-xl bg-surface-secondary border border-border text-[12px] text-text-primary" />
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-xl btn-gradient text-white text-[11px]"><Save className="w-3 h-3" /> Guardar</button>
                  <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-[11px] text-text-secondary"><X className="w-3 h-3" /> Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-border-light">
          <div className="text-center">
            <p className="text-2xl font-semibold text-text-primary">{tenant.programs.length}</p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Programas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-text-primary">{tenant.projects.length}</p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Proyectos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-text-primary">{tenant.users.length}</p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Usuarios</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-text-primary">{tenant.requests.length}</p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Solicitudes</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Recent Projects */}
          <div className="liquid-glass-border rounded-2xl p-5 card-glow">
            <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-widest mb-4">Proyectos Recientes</h3>
            <div className="space-y-3">
              {tenant.projects.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
                  <div>
                    <p className="text-[13px] text-text-primary font-medium">{p.name}</p>
                    <p className="text-[11px] text-text-tertiary">{p.folio} | {p.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={p.progress} planned={p.planned_progress} />
                    <HealthBadge health={p.health as 'green' | 'yellow' | 'red'} />
                  </div>
                </div>
              ))}
              {tenant.projects.length === 0 && <p className="text-[12px] text-text-tertiary text-center py-4">Sin proyectos</p>}
            </div>
          </div>

          {/* Recent Requests */}
          <div className="liquid-glass-border rounded-2xl p-5 card-glow">
            <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-widest mb-4">Solicitudes Recientes</h3>
            <div className="space-y-3">
              {tenant.requests.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
                  <div>
                    <p className="text-[13px] text-text-primary font-medium">{r.title}</p>
                    <p className="text-[11px] text-text-tertiary">{r.folio} | {r.requester_name}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-lg ${statusColors[r.status] || 'bg-gray-500/10 text-gray-400'}`}>
                    {statusLabels[r.status] || r.status}
                  </span>
                </div>
              ))}
              {tenant.requests.length === 0 && <p className="text-[12px] text-text-tertiary text-center py-4">Sin solicitudes</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'programs' && (
        <div className="liquid-glass-border rounded-2xl p-5 card-glow">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Programa</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest text-center">Estado</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest text-center">Proyectos</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Inicio</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Fin</th>
              </tr>
            </thead>
            <tbody>
              {tenant.programs.map(p => (
                <tr key={p.id} className="border-b border-border-light hover:bg-surface-hover transition-colors">
                  <td className="py-3 font-medium text-text-primary">{p.name}</td>
                  <td className="py-3 text-center">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-lg ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                      {p.status === 'active' ? 'Activo' : p.status}
                    </span>
                  </td>
                  <td className="py-3 text-center text-text-secondary">{p.project_count}</td>
                  <td className="py-3 text-text-tertiary">{p.start_date || '-'}</td>
                  <td className="py-3 text-text-tertiary">{p.end_date || '-'}</td>
                </tr>
              ))}
              {tenant.programs.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-text-tertiary">Sin programas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="liquid-glass-border rounded-2xl p-5 card-glow">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Folio</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Proyecto</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Tipo</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest text-center">Fase</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest w-32">Avance</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest text-right">Presupuesto</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest text-center">Salud</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Programa</th>
              </tr>
            </thead>
            <tbody>
              {tenant.projects.map(p => (
                <tr key={p.id} className="border-b border-border-light hover:bg-surface-hover transition-colors">
                  <td className="py-3 text-text-tertiary font-mono text-[11px]">{p.folio}</td>
                  <td className="py-3 font-medium text-text-primary">{p.name}</td>
                  <td className="py-3 text-text-secondary">{p.type}</td>
                  <td className="py-3 text-center">
                    <span className="text-[10px] font-medium px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400">{p.phase}</span>
                  </td>
                  <td className="py-3"><ProgressBar value={p.progress} planned={p.planned_progress} /></td>
                  <td className="py-3 text-right text-text-secondary">{formatMXN(p.budget)}</td>
                  <td className="py-3 text-center"><HealthBadge health={p.health as 'green' | 'yellow' | 'red'} /></td>
                  <td className="py-3 text-text-tertiary text-[11px]">{p.program_name || '-'}</td>
                </tr>
              ))}
              {tenant.projects.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-text-tertiary">Sin proyectos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="liquid-glass-border rounded-2xl p-5 card-glow">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Usuario</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Nombre</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Email</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Roles</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest text-center">Estado</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Ultimo acceso</th>
              </tr>
            </thead>
            <tbody>
              {tenant.users.map(u => (
                <tr key={u.id} className="border-b border-border-light hover:bg-surface-hover transition-colors">
                  <td className="py-3 font-mono text-[12px] text-text-primary">{u.username}</td>
                  <td className="py-3 text-text-primary">{u.full_name}</td>
                  <td className="py-3 text-text-secondary">{u.email}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map(r => (
                        <span key={r} className="text-[10px] px-2 py-0.5 rounded-lg bg-accent/10 text-accent">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    {u.is_active ? (
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">Activo</span>
                    ) : (
                      <span className="text-[10px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-lg">Inactivo</span>
                    )}
                  </td>
                  <td className="py-3 text-text-tertiary text-[11px]">{u.last_login ? new Date(u.last_login).toLocaleDateString('es-MX') : 'Nunca'}</td>
                </tr>
              ))}
              {tenant.users.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-text-tertiary">Sin usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="liquid-glass-border rounded-2xl p-5 card-glow">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Folio</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Titulo</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Solicitante</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">Fecha</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {tenant.requests.map(r => (
                <tr key={r.id} className="border-b border-border-light hover:bg-surface-hover transition-colors">
                  <td className="py-3 font-mono text-[11px] text-text-tertiary">{r.folio}</td>
                  <td className="py-3 font-medium text-text-primary">{r.title}</td>
                  <td className="py-3 text-text-secondary">{r.requester_name}</td>
                  <td className="py-3 text-text-tertiary">{r.request_date}</td>
                  <td className="py-3 text-center">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-lg ${statusColors[r.status] || 'bg-gray-500/10 text-gray-400'}`}>
                      {statusLabels[r.status] || r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {tenant.requests.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-text-tertiary">Sin solicitudes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
