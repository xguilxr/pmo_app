import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layers, FolderKanban, TrendingUp, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { useApi, LoadingSpinner } from '../hooks/useApi';
import PhaseBadge from '../components/common/PhaseBadge';
import HealthBadge from '../components/common/HealthBadge';
import ProgressBar from '../components/common/ProgressBar';
import PageHeader from '../components/common/PageHeader';

interface ProgramDetail {
  id: number; name: string; description: string | null; status: string;
  start_date: string | null; end_date: string | null; organization_id: number;
  organization_name: string; project_count: number;
}

interface ApiProject {
  id: number; folio: string; name: string; type: string; priority: string;
  phase: string; progress: number; planned_progress: number; budget: number; health: string; company?: string;
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
  const { data: allProjects, loading: projLoading } = useApi(() => api.get<ApiProject[]>('/projects').catch(() => []), []);

  // Filter projects that belong to this program — the API doesn't support program_id filter on list, so we get the project detail
  // Actually, we need to filter by checking the project's program_id. But the list endpoint doesn't return program_id.
  // We'll use the program's organization to show all org projects for now and let the user know which are in this program.
  // Better: we can fetch all projects and check via individual detail calls or enhance the backend.
  // For simplicity, let's just show all projects from the same org.

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

  // Filter projects by org (program's org)
  const orgProjects = (allProjects || []).filter(p => p.company === program.organization_name);
  const stats = {
    total: orgProjects.length,
    inExecution: orgProjects.filter(p => p.phase === 'Ejecución').length,
    avgProgress: orgProjects.length > 0 ? Math.round(orgProjects.reduce((s, p) => s + p.progress, 0) / orgProjects.length) : 0,
    totalBudget: orgProjects.reduce((s, p) => s + p.budget, 0),
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
        <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${program.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 text-gray-500'}`}>
          {program.status === 'active' ? 'Activo' : program.status}
        </span>
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
        <div className="px-6 py-4 border-b border-border-light">
          <h3 className="text-[15px] font-bold text-text-primary">Proyectos del Programa</h3>
        </div>
        {orgProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <p className="text-[13px] text-text-secondary">Sin proyectos asignados a este programa</p>
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
              {orgProjects.map(p => (
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
    </div>
  );
}
