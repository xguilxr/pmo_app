import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layers, FolderKanban, TrendingUp, Calendar, Plus, X } from 'lucide-react';
import { api } from '../services/api';
import { useApi, LoadingSpinner } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import PhaseBadge from '../components/common/PhaseBadge';
import HealthBadge from '../components/common/HealthBadge';
import ProgressBar from '../components/common/ProgressBar';
import PageHeader from '../components/common/PageHeader';

const PROJECT_TYPES = ['Tecnología', 'Digital', 'Procesos', 'Infraestructura', 'Regulatorio'];
const PRIORITIES = ['Alta', 'Media', 'Baja'];

interface ProgramDetail {
  id: number; name: string; description: string | null; status: string;
  start_date: string | null; end_date: string | null; organization_id: number;
  organization_name: string; project_count: number;
}

interface ApiProject {
  id: number; folio: string; name: string; type: string; priority: string;
  phase: string; progress: number; planned_progress: number; budget: number; health: string;
  company?: string; program_id?: number | null;
}

function formatMXN(v: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);
}

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const programId = Number(id);

  const { data: program, loading: pLoading } = useApi(() => api.get<ProgramDetail>(`/programs/${programId}`), [programId]);
  const { data: programProjects, loading: projLoading, refetch } = useApi(
    () => api.get<ApiProject[]>(`/projects?program_id=${programId}`),
    [programId],
  );

  const [showCreateModal, setShowCreateModal] = useState(false);

  const loading = pLoading || projLoading;

  if (loading) return <LoadingSpinner />;
  if (!program) {
    return (
      <div className="text-center py-16 bg-surface rounded-2xl border border-border">
        <Layers className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
        <p className="text-text-secondary">Programa no encontrado</p>
      </div>
    );
  }

  const projects = programProjects || [];
  const stats = {
    total: projects.length,
    inExecution: projects.filter(p => p.phase === 'Ejecución').length,
    avgProgress: projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0,
    totalBudget: projects.reduce((s, p) => s + p.budget, 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: t('nav.organizations'), href: '/organizations' },
          { label: program.organization_name, href: `/organizations/${encodeURIComponent(program.organization_name)}` },
          { label: program.name },
        ]}
        title={program.name}
        subtitle={program.description || `Programa de ${program.organization_name}`}
      >
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${program.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-surface-tertiary text-text-secondary'}`}>
            {program.status === 'active' ? 'Activo' : program.status}
          </span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo Proyecto
          </button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Proyectos', value: stats.total, icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/50' },
          { label: 'En Ejecución', value: stats.inExecution, icon: FolderKanban, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/50' },
          { label: 'Avance Promedio', value: `${stats.avgProgress}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
          { label: 'Presupuesto Total', value: formatMXN(stats.totalBudget), icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-surface rounded-2xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">{kpi.label}</p>
                <p className="text-xl font-bold text-text-primary">{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {(program.start_date || program.end_date) && (
        <div className="bg-surface rounded-2xl border border-border p-5">
          <h3 className="text-[13px] font-semibold text-text-secondary mb-2">Cronograma del Programa</h3>
          <p className="text-[13px] text-text-primary">{program.start_date || '—'} → {program.end_date || '—'}</p>
        </div>
      )}

      {/* Projects Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h3 className="text-[15px] font-bold text-text-primary">Proyectos del Programa</h3>
        </div>
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="w-10 h-10 text-text-tertiary mx-auto mb-3 opacity-40" />
            <p className="text-[13px] text-text-secondary">Sin proyectos en este programa</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25"
            >
              <Plus className="w-3.5 h-3.5" /> Crear Proyecto
            </button>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface-tertiary border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Folio</th>
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Fase</th>
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Salud</th>
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider w-40">Avance</th>
                <th className="text-right px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Presupuesto</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="border-b border-border-light hover:bg-surface-hover transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-text-tertiary font-mono text-[11px]">{p.folio}</td>
                  <td className="px-4 py-3 text-accent font-medium">{p.name}</td>
                  <td className="px-4 py-3"><PhaseBadge phase={p.phase} /></td>
                  <td className="px-4 py-3"><HealthBadge health={(p.health || 'green') as 'green' | 'yellow' | 'red'} /></td>
                  <td className="px-4 py-3"><ProgressBar value={p.progress} planned={p.planned_progress} /></td>
                  <td className="px-4 py-3 text-right text-text-secondary font-medium">{formatMXN(p.budget)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectInProgramModal
          organizationId={program.organization_id}
          organizationName={program.organization_name}
          programId={program.id}
          programName={program.name}
          onClose={() => setShowCreateModal(false)}
          onCreated={(projectId) => {
            setShowCreateModal(false);
            refetch();
            navigate(`/projects/${projectId}`);
          }}
        />
      )}
    </div>
  );
}

function CreateProjectInProgramModal({
  organizationId, organizationName, programId, programName, onClose, onCreated,
}: {
  organizationId: number; organizationName: string;
  programId: number; programName: string;
  onClose: () => void; onCreated: (id: number) => void;
}) {
  const { toastSuccess, toastError } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', type: PROJECT_TYPES[0], priority: 'Media',
    startDate: '', endDate: '', budget: 0,
  });

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.post<{ id: number }>('/projects', {
        name: form.name,
        type: form.type,
        priority: form.priority,
        organization_id: organizationId,
        program_id: programId,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
        budget: form.budget,
      });
      toastSuccess(`Proyecto "${form.name}" creado en ${programName}`);
      onCreated(created.id);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al crear proyecto');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-elevated rounded-2xl w-full max-w-lg border border-border shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h3 className="text-[15px] font-bold text-text-primary">Nuevo Proyecto</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Organization and Program info (read-only) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Organización</label>
              <div className="px-3.5 py-2.5 bg-surface-tertiary border border-border rounded-xl text-[13px] text-text-secondary">{organizationName}</div>
            </div>
            <div>
              <label className={labelCls}>Programa</label>
              <div className="px-3.5 py-2.5 bg-surface-tertiary border border-border rounded-xl text-[13px] text-text-secondary">{programName}</div>
            </div>
          </div>
          <div>
            <label className={labelCls}>Nombre *</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputCls}>
                {PROJECT_TYPES.map(ty => <option key={ty} value={ty}>{ty}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Prioridad</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className={inputCls}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha Inicio</label>
              <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha Fin</label>
              <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Presupuesto</label>
            <input type="number" min="0" step="1000" value={form.budget} onChange={e => setForm({...form, budget: Number(e.target.value)})} className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-border rounded-xl text-[13px] font-medium text-text-secondary hover:bg-surface-hover transition-all">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-accent text-white rounded-xl text-[13px] font-semibold hover:bg-accent-hover transition-all shadow-sm shadow-accent/25 disabled:opacity-50">
              {submitting ? 'Creando...' : 'Crear Proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
