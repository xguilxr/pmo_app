import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, X, FolderKanban } from 'lucide-react';
import { api } from '../services/api';
import { useApi, LoadingSpinner } from '../hooks/useApi';
import ProgressBar from '../components/common/ProgressBar';
import PhaseBadge from '../components/common/PhaseBadge';
import HealthBadge from '../components/common/HealthBadge';
import PageHeader from '../components/common/PageHeader';
import { useToast } from '../context/ToastContext';

const PROJECT_TYPES = ['Tecnología', 'Digital', 'Procesos', 'Infraestructura', 'Regulatorio'];
const PRIORITIES = ['Alta', 'Media', 'Baja'];

type StatusFilter = 'Todos' | 'Planificación' | 'Ejecución' | 'Soporte' | 'Cerrado';

interface ApiProject {
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

export default function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: apiProjects, loading, refetch } = useApi(() => api.get<ApiProject[]>('/projects'), []);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterOrgs, setFilterOrgs] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusFilter>('Todos');
  const [company, setCompany] = useState('');
  const [folio, setFolio] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    api.get<Array<{id: number; name: string}>>('/organizations').then(orgs => setFilterOrgs(orgs.map(o => o.name))).catch(() => {});
  }, []);

  const statuses: StatusFilter[] = ['Todos', 'Planificación', 'Ejecución', 'Soporte', 'Cerrado'];
  const statusLabels: Record<StatusFilter, string> = {
    Todos: t('projects.all'), Planificación: t('projects.planning'),
    Ejecución: t('projects.execution'), Soporte: t('projects.support'), Cerrado: t('projects.closed'),
  };

  const allProjects = useMemo(() => {
    if (!apiProjects) return [];
    return apiProjects;
  }, [apiProjects]);

  const filtered = useMemo(() => {
    return allProjects.filter((p) => {
      if (status !== 'Todos' && p.phase !== status) return false;
      if (company && p.company !== company) return false;
      if (folio && !p.folio.toLowerCase().includes(folio.toLowerCase())) return false;
      if (name && !p.name.toLowerCase().includes(name.toLowerCase())) return false;
      if (type && p.type !== type) return false;
      if (priority && p.priority !== priority) return false;
      return true;
    });
  }, [allProjects, status, company, folio, name, type, priority, dateFrom, dateTo]);

  const clearFilters = () => {
    setStatus('Todos'); setCompany(''); setFolio(''); setName('');
    setType(''); setPriority(''); setDateFrom(''); setDateTo('');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('nav.projects') }]}
        title={t('projects.title')}
      >
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-[13px] font-semibold hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/25"
        >
          <Plus className="w-4 h-4" />
          {t('projects.newProject')}
        </button>
      </PageHeader>

      {/* Status Tabs */}
      <div className="flex gap-1.5 bg-surface-tertiary p-1 rounded-xl w-fit">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
              status === s
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="liquid-glass-border rounded-2xl p-4">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">{t('projects.company')}</label>
            <select value={company} onChange={(e) => setCompany(e.target.value)}
              className="w-full border border-border bg-surface rounded-xl px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30">
              <option value="">{t('common.selectOption')}</option>
              {filterOrgs.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">{t('projects.folio')}</label>
            <input value={folio} onChange={(e) => setFolio(e.target.value)} placeholder="PRJ-2026-..."
              className="w-full border border-border bg-surface rounded-xl px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">{t('projects.name')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-text-tertiary" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('common.search')}
                className="w-full border border-border bg-surface rounded-xl pl-8 pr-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">{t('projects.type')}</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full border border-border bg-surface rounded-xl px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30">
              <option value="">{t('common.selectOption')}</option>
              {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">{t('projects.priority')}</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}
              className="w-full border border-border bg-surface rounded-xl px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30">
              <option value="">{t('common.selectOption')}</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">{t('projects.startDate')} ({t('common.from')})</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-border bg-surface rounded-xl px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">{t('projects.startDate')} ({t('common.to')})</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-border bg-surface rounded-xl px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <div className="flex items-end">
            <button onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-[13px] text-text-secondary hover:bg-surface-hover transition-all">
              <X className="w-3.5 h-3.5" />
              {t('projects.clearFilters')}
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-[13px] text-text-tertiary">{filtered.length} {t('projects.results')}</p>

      {/* Projects Table */}
      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <FolderKanban className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Sin proyectos</h3>
          <p className="text-[13px] text-text-secondary">Crea tu primer proyecto para comenzar</p>
        </div>
      ) : (
        <div className="liquid-glass-border rounded-2xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface-tertiary border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">{t('projects.folio')}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">{t('projects.name')}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">{t('projects.company')}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">{t('projects.phase')}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">{t('projects.health', 'Salud')}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider w-40">{t('projects.progress')}</th>
                <th className="text-right px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">{t('projects.budget')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="border-b border-border-light hover:bg-surface-hover transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-text-tertiary font-mono text-[11px]">{p.folio}</td>
                  <td className="px-4 py-3">
                    <Link to={`/projects/${p.id}`} className="text-accent hover:opacity-80 font-medium">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{p.company || '-'}</td>
                  <td className="px-4 py-3"><PhaseBadge phase={p.phase} /></td>
                  <td className="px-4 py-3"><HealthBadge health={(p.health || 'green') as 'green' | 'yellow' | 'red'} /></td>
                  <td className="px-4 py-3"><ProgressBar value={p.progress} planned={p.planned_progress} /></td>
                  <td className="px-4 py-3 text-right text-text-secondary font-medium">{formatMXN(p.budget)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(projectId) => { setShowCreateModal(false); refetch(); navigate(`/projects/${projectId}`); }}
        />
      )}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const { t } = useTranslation();
  const { toastSuccess, toastError } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [orgs, setOrgs] = useState<Array<{id: number; name: string}>>([]);
  const [programs, setPrograms] = useState<Array<{id: number; name: string; organization_id: number}>>([]);
  const [form, setForm] = useState({
    name: '', type: PROJECT_TYPES[0], priority: 'Media' as string,
    organizationId: 0, programId: 0 as number, startDate: '', endDate: '', budget: 0,
  });

  useEffect(() => {
    api.get<Array<{id: number; name: string}>>('/organizations').then(setOrgs).catch(() => {});
    api.get<Array<{id: number; name: string; organization_id: number}>>('/programs').then(setPrograms).catch(() => {});
  }, []);

  const filteredPrograms = programs.filter(p => p.organization_id === form.organizationId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.organizationId) { toastError('Selecciona una organización'); return; }
    setSubmitting(true);
    try {
      const created = await api.post<ApiProject>('/projects', {
        name: form.name, type: form.type, priority: form.priority,
        organization_id: form.organizationId,
        program_id: form.programId || null,
        start_date: form.startDate || null, end_date: form.endDate || null,
        budget: form.budget,
      });
      toastSuccess(`Proyecto "${form.name}" creado exitosamente`);
      onCreated(created.id);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al crear proyecto');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="liquid-modal rounded-2xl w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h3 className="text-[15px] font-bold text-text-primary">{t('projects.newProject')}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-xl transition-colors"><X className="w-4 h-4 text-text-tertiary" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">{t('projects.name')} *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">{t('projects.type')}</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30">
                {PROJECT_TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">{t('projects.priority')}</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">{t('projects.company')} *</label>
              <select value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: Number(e.target.value), programId: 0 })}
                className="w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value={0}>Seleccionar organización...</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Programa (opcional)</label>
              <select value={form.programId} onChange={(e) => setForm({ ...form, programId: Number(e.target.value) })}
                className="w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                disabled={!form.organizationId}>
                <option value={0}>Sin programa</option>
                {filteredPrograms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">{t('projects.startDate')}</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">{t('projects.endDate')}</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">{t('projects.budget')}</label>
            <input type="number" min="0" step="1000" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
              className="w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-border rounded-xl text-[13px] font-medium text-text-secondary hover:bg-surface-hover transition-all">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-accent text-white rounded-xl text-[13px] font-semibold hover:bg-accent-hover transition-all shadow-sm shadow-accent/25 disabled:opacity-50">
              {submitting ? 'Creando...' : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
