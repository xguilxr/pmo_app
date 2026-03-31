import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FolderKanban, FileText, AlertTriangle, RefreshCw,
  DollarSign, TrendingUp, ShieldAlert, Bug,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import KpiCard from '../components/common/KpiCard';
import HealthBadge from '../components/common/HealthBadge';
import ProgressBar from '../components/common/ProgressBar';
import { api } from '../services/api';
import { useApi, LoadingSpinner } from '../hooks/useApi';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';

interface DashboardKPIs {
  active_projects: number;
  requests_in_review: number;
  open_risks: number;
  changes_in_review: number;
  total_budget: number;
  avg_progress: number;
  severe_risks: number;
  open_aids: number;
}

interface ProjectRow {
  id: number;
  folio: string;
  name: string;
  type: string;
  priority: string;
  phase: string;
  progress: number;
  planned_progress: number;
  budget: number;
  health: string;
  company?: string;
}

function formatMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

const PHASE_COLORS: Record<string, string> = {
  'Planificacion': '#2563eb',
  'Planificación': '#2563eb',
  'Ejecucion': '#f59e0b',
  'Ejecución': '#f59e0b',
  'Soporte': '#1d4ed8',
  'Cerrado': '#6b7280',
};

const HEALTH_COLORS: Record<string, { name: string; color: string }> = {
  green: { name: 'Sano', color: '#22c55e' },
  yellow: { name: 'Atencion', color: '#f59e0b' },
  red: { name: 'Critico', color: '#ef4444' },
};

const CHART_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data: apiKpis, loading: kpisLoading } = useApi(() => api.get<DashboardKPIs>('/dashboard/kpis'), []);
  const { data: apiProjects, loading: projectsLoading } = useApi(() => api.get<ProjectRow[]>('/projects'), []);

  const kpiData = apiKpis
    ? {
        activeProjects: apiKpis.active_projects,
        requestsInReview: apiKpis.requests_in_review,
        openRisks: apiKpis.open_risks,
        changesInReview: apiKpis.changes_in_review,
        totalBudget: apiKpis.total_budget,
        avgProgress: apiKpis.avg_progress,
        severeRisks: apiKpis.severe_risks,
        openAids: apiKpis.open_aids,
      }
    : { activeProjects: 0, requestsInReview: 0, openRisks: 0, changesInReview: 0, totalBudget: 0, avgProgress: 0, severeRisks: 0, openAids: 0 };

  const projectData = apiProjects || [];
  const activeProjects = projectData.filter(p => p.phase !== 'Cerrado');

  const computedProjectsByPhase = useMemo(() => {
    const phases = ['Planificación', 'Ejecución', 'Soporte', 'Cerrado'];
    return phases.map(phase => ({
      name: phase,
      value: projectData.filter(p => p.phase === phase).length,
      color: PHASE_COLORS[phase] || '#6b7280',
    }));
  }, [projectData]);

  const computedAvgProgressByPhase = useMemo(() => {
    const phases = ['Planificación', 'Ejecución', 'Soporte', 'Cerrado'];
    return phases.map(phase => {
      const pp = projectData.filter(p => p.phase === phase);
      const avg = pp.length > 0 ? Math.round(pp.reduce((s, p) => s + p.progress, 0) / pp.length) : 0;
      return { phase, progress: avg };
    });
  }, [projectData]);

  const computedBudgetByType = useMemo(() => {
    const typeMap = new Map<string, number>();
    projectData.forEach(p => { typeMap.set(p.type, (typeMap.get(p.type) || 0) + p.budget); });
    return Array.from(typeMap.entries()).map(([type, budget]) => ({ type, budget }));
  }, [projectData]);

  const computedPortfolioHealth = useMemo(() => {
    const hc = new Map<string, number>();
    projectData.forEach(p => { hc.set(p.health, (hc.get(p.health) || 0) + 1); });
    return ['green', 'yellow', 'red'].map(h => ({ name: HEALTH_COLORS[h].name, value: hc.get(h) || 0, color: HEALTH_COLORS[h].color }));
  }, [projectData]);

  if (kpisLoading && projectsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumb={[{ label: 'Dashboard' }]} title={t('dashboard.title')} />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader breadcrumb={[{ label: 'Dashboard' }]} title={t('dashboard.title')} />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard title={t('dashboard.activeProjects')} value={kpiData.activeProjects} icon={<FolderKanban className="w-5 h-5 text-indigo-500" />} to="/projects" color="bg-indigo-500/10" />
        <KpiCard title={t('dashboard.requestsInReview')} value={kpiData.requestsInReview} icon={<FileText className="w-5 h-5 text-amber-500" />} to="/requests" color="bg-amber-500/10" />
        <KpiCard title={t('dashboard.openRisks')} value={kpiData.openRisks} icon={<AlertTriangle className="w-5 h-5 text-orange-500" />} to="/risks" color="bg-orange-500/10" />
        <KpiCard title={t('dashboard.changesInReview')} value={kpiData.changesInReview} icon={<RefreshCw className="w-5 h-5 text-violet-500" />} to="/changes" color="bg-violet-500/10" />
        <KpiCard title={t('dashboard.totalBudget')} value={formatMXN(kpiData.totalBudget)} icon={<DollarSign className="w-5 h-5 text-emerald-500" />} to="/projects" color="bg-emerald-500/10" />
        <KpiCard title={t('dashboard.avgProgress')} value={`${kpiData.avgProgress}%`} icon={<TrendingUp className="w-5 h-5 text-indigo-500" />} to="/projects" color="bg-indigo-500/10" />
        <KpiCard title={t('dashboard.severeRisks')} value={kpiData.severeRisks} icon={<ShieldAlert className="w-5 h-5 text-red-500" />} to="/risks" color="bg-red-500/10" />
        <KpiCard title={t('dashboard.openAids')} value={kpiData.openAids} icon={<Bug className="w-5 h-5 text-violet-500" />} to="/issues" color="bg-violet-500/10" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="liquid-glass-border rounded-2xl p-5 card-glow">
          <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-widest mb-4">{t('dashboard.projectsByPhase')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={computedProjectsByPhase} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {computedProjectsByPhase.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="liquid-glass-border rounded-2xl p-5 card-glow">
          <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-widest mb-4">{t('dashboard.avgProgressByPhase')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={computedAvgProgressByPhase}>
              <XAxis dataKey="phase" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
              <Tooltip formatter={(value) => `${value}%`} contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
              <Bar dataKey="progress" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="liquid-glass-border rounded-2xl p-5 card-glow">
          <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-widest mb-4">{t('dashboard.budgetByType')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={computedBudgetByType} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} tickFormatter={(v: number) => formatMXN(v)} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} width={110} />
              <Tooltip formatter={(value) => formatMXN(value as number)} contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
              <Bar dataKey="budget" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="liquid-glass-border rounded-2xl p-5 card-glow">
          <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-widest mb-4">{t('dashboard.portfolioHealth')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={computedPortfolioHealth} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {computedPortfolioHealth.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Plan vs Real Matrix */}
      <div className="liquid-glass-border rounded-2xl p-5 card-glow">
        <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-widest mb-4">{t('dashboard.planVsReal')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest">{t('dashboard.project')}</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest text-right">{t('dashboard.planBudget')}</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest text-center">{t('dashboard.plannedProgress')}</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest w-40">{t('dashboard.progress')}</th>
                <th className="pb-3 font-normal text-text-tertiary text-[11px] uppercase tracking-widest text-center">{t('dashboard.health')}</th>
              </tr>
            </thead>
            <tbody>
              {activeProjects.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border-light hover:bg-surface-hover transition-colors"
                >
                  <td className="py-3">
                    <Link to={`/projects/${p.id}`} className="text-accent hover:opacity-80 font-normal">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-3 text-right text-text-secondary font-light">{formatMXN(p.budget)}</td>
                  <td className="py-3 text-center text-text-tertiary font-light">{p.planned_progress}%</td>
                  <td className="py-3"><ProgressBar value={p.progress} planned={p.planned_progress} /></td>
                  <td className="py-3 text-center"><HealthBadge health={p.health as 'green' | 'yellow' | 'red'} /></td>
                </tr>
              ))}
              {activeProjects.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-text-tertiary font-light">Sin proyectos activos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
