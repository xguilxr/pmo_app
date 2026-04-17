import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users, Shield, RefreshCw,
  Files, Lightbulb, ClipboardList, DollarSign,
  Calendar, Building2, TrendingUp, ListTree, ListChecks, BarChart3,
  Layers, Edit2, X, Save
} from 'lucide-react';
import { api } from '../services/api';
import { useApi, LoadingSpinner } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import PhaseBadge from '../components/common/PhaseBadge';
import HealthBadge from '../components/common/HealthBadge';
import ProgressBar from '../components/common/ProgressBar';
import ProjectCharterInfoTab from '../components/project/ProjectCharterInfoTab';
import ProjectPlanTab from '../components/project/ProjectPlanTab';
import ProjectBacklogTab from '../components/project/ProjectBacklogTab';
import ProjectAreasTab from '../components/project/ProjectAreasTab';
import ProjectRaidTab from '../components/project/ProjectRaidTab';
import ProjectChangesTab from '../components/project/ProjectChangesTab';
import ProjectDocumentsTab from '../components/project/ProjectDocumentsTab';
import ProjectLessonsTab from '../components/project/ProjectLessonsTab';
import ProjectMinutesTab from '../components/project/ProjectMinutesTab';
import ProjectReportsTab from '../components/project/ProjectReportsTab';
import PageHeader from '../components/common/PageHeader';

import type { Project } from '../types';
import type { OrgOption } from '../types';

interface ApiProgram { id: number; name: string; organization_id: number; }

const PROJECT_TYPES = ['Tecnología', 'Digital', 'Procesos', 'Infraestructura', 'Regulatorio'];
const PRIORITIES = ['Alta', 'Media', 'Baja'];
const PHASES = ['Planificación', 'Ejecución', 'Soporte', 'Cerrado'];
const HEALTHS = ['green', 'yellow', 'red'];

const tabs = [
  { id: 'charter', icon: ListTree, label: 'Charter' },
  { id: 'plan', icon: Calendar, label: 'Plan' },
  { id: 'backlog', icon: ListChecks, labelKey: 'projectDetail.backlog' },
  { id: 'raid', icon: Shield, label: 'RAID' },
  { id: 'changes', icon: RefreshCw, labelKey: 'nav.changes' },
  { id: 'documents', icon: Files, labelKey: 'nav.documents' },
  { id: 'lessons', icon: Lightbulb, labelKey: 'nav.lessons' },
  { id: 'minutes', icon: ClipboardList, labelKey: 'nav.minutes' },
  { id: 'reports', icon: BarChart3, labelKey: 'nav.reports' },
  { id: 'areas', icon: Users, labelKey: 'projectDetail.areas' },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('charter');
  const [showEditModal, setShowEditModal] = useState(false);

  const projectId = Number(id);
  const { data: apiProject, loading, refetch } = useApi(
    () => api.get<Project>(`/projects/${projectId}`).catch(() => null),
    [projectId]
  );

  // Build navigation context from location state (passed when navigating from org/program)
  const navContext = (location.state as { fromOrg?: string; fromOrgId?: number; fromProgram?: string; fromProgramId?: number } | null) || {};

  const project = apiProject
    ? {
        id: apiProject.id,
        folio: apiProject.folio,
        name: apiProject.name,
        description: apiProject.description || '',
        type: apiProject.type || '',
        priority: apiProject.priority as 'Alta' | 'Media' | 'Baja',
        company: apiProject.organization_name || '',
        organizationId: apiProject.organization_id || 0,
        programId: apiProject.program_id || null,
        programName: apiProject.program_name || '',
        phase: apiProject.phase as 'Planificación' | 'Ejecución' | 'Soporte' | 'Cerrado',
        progress: apiProject.progress,
        plannedProgress: apiProject.planned_progress || 0,
        budget: apiProject.budget,
        realBudget: apiProject.real_budget || 0,
        startDate: apiProject.start_date,
        endDate: apiProject.end_date,
        health: (apiProject.health || 'green') as 'green' | 'yellow' | 'red',
      }
    : null;

  if (loading) return <LoadingSpinner />;

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">{t('projectDetail.notFound')}</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-blue-600 hover:underline">
          {t('projectDetail.backToProjects')}
        </button>
      </div>
    );
  }

  // Build breadcrumb based on navigation context
  const buildBreadcrumb = () => {
    const items: { label: string; href?: string }[] = [{ label: 'Inicio', href: '/' }];

    // If we came from an org → program → project flow
    const orgName = navContext.fromOrg || project.company;
    const programName = navContext.fromProgram || project.programName;
    const programId = navContext.fromProgramId || project.programId;

    if (navContext.fromOrg) {
      items.push({ label: t('nav.organizations'), href: '/organizations' });
      items.push({ label: orgName, href: `/organizations/${encodeURIComponent(orgName)}` });
      if (programName && programId) {
        items.push({ label: programName, href: `/programs/${programId}` });
      }
    } else {
      items.push({ label: t('nav.projects'), href: '/projects' });
    }

    items.push({ label: project.name });
    return items;
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  const renderTab = () => {
    switch (activeTab) {
      case 'charter': return <ProjectCharterInfoTab project={project} projectId={project.id} />;
      case 'plan': return <ProjectPlanTab projectId={project.id} />;
      case 'backlog': return <ProjectBacklogTab projectId={project.id} />;
      case 'areas': return <ProjectAreasTab projectId={project.id} />;
      case 'raid': return <ProjectRaidTab projectId={project.id} />;
      case 'changes': return <ProjectChangesTab projectId={project.id} />;
      case 'documents': return <ProjectDocumentsTab projectId={project.id} />;
      case 'lessons': return <ProjectLessonsTab projectId={project.id} />;
      case 'minutes': return <ProjectMinutesTab projectId={project.id} />;
      case 'reports': return <ProjectReportsTab projectId={project.id} />;
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumb={buildBreadcrumb()}
        title={project.name}
        subtitle={`${project.folio}`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" /> Editar
          </button>
          <PhaseBadge phase={project.phase} />
          <HealthBadge health={project.health} />
        </div>
      </PageHeader>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="liquid-glass-border rounded-2xl p-4 card-glow">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary uppercase tracking-widest mb-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Organización
          </div>
          <p className="font-medium text-text-primary text-[13px]">{project.company || '-'}</p>
        </div>
        <div className="liquid-glass-border rounded-2xl p-4 card-glow">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary uppercase tracking-widest mb-1.5">
            <Layers className="w-3.5 h-3.5" />
            Programa
          </div>
          <p className="font-medium text-text-primary text-[13px]">{project.programName || '-'}</p>
        </div>
        <div className="liquid-glass-border rounded-2xl p-4 card-glow">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary uppercase tracking-widest mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {t('projectDetail.timeline')}
          </div>
          <p className="font-medium text-text-primary text-[13px]">{project.startDate} → {project.endDate}</p>
        </div>
        <div className="liquid-glass-border rounded-2xl p-4 card-glow">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary uppercase tracking-widest mb-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            {t('projects.budget')}
          </div>
          <p className="font-medium text-text-primary">{formatCurrency(project.budget)}</p>
          <p className="text-[11px] text-text-tertiary font-light mt-0.5">Real: {formatCurrency(project.realBudget)}</p>
        </div>
        <div className="liquid-glass-border rounded-2xl p-4 card-glow">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary uppercase tracking-widest mb-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            {t('projects.progress')}
          </div>
          <ProgressBar value={project.progress} planned={project.plannedProgress} />
        </div>
      </div>

      {/* Tabs */}
      <div className="liquid-glass rounded-xl p-1">
        <div className="flex gap-0.5 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-accent/10 text-accent shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-hover'
                }`}
              >
                <Icon className="w-4 h-4" />
                {'label' in tab ? tab.label : t(tab.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>{renderTab()}</div>

      {/* Edit Metadata Modal */}
      {showEditModal && apiProject && (
        <EditProjectModal
          project={apiProject}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); refetch(); }}
        />
      )}
    </div>
  );
}

function EditProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toastSuccess, toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    description: project.description || '',
    type: project.type || PROJECT_TYPES[0],
    priority: project.priority || 'Media',
    phase: project.phase || 'Planificación',
    health: project.health || 'green',
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    budget: project.budget || 0,
    real_budget: project.real_budget || 0,
    progress: project.progress || 0,
    planned_progress: project.planned_progress || 0,
    organization_id: project.organization_id || 0,
    program_id: project.program_id || 0,
  });

  const { data: orgs } = useApi(() => api.get<OrgOption[]>('/organizations'), []);
  const { data: programs } = useApi(
    () => form.organization_id ? api.get<ApiProgram[]>(`/programs?organization_id=${form.organization_id}`) : Promise.resolve([]),
    [form.organization_id]
  );

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/projects/${project.id}`, {
        name: form.name,
        description: form.description || null,
        type: form.type,
        priority: form.priority,
        phase: form.phase,
        health: form.health,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: form.budget,
        real_budget: form.real_budget,
        progress: form.progress,
        planned_progress: form.planned_progress,
        organization_id: form.organization_id || undefined,
        program_id: form.program_id || null,
      });
      toastSuccess('Proyecto actualizado');
      onSaved();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al actualizar');
    }
    setSaving(false);
  };

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="liquid-modal rounded-2xl w-full max-w-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light sticky top-0 bg-transparent z-10">
          <h3 className="text-[15px] font-bold text-text-primary">Editar Proyecto</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className={labelCls}>Nombre *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className={inputCls} />
          </div>

          {/* Organization & Program */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Organización</label>
              <select value={form.organization_id} onChange={e => setForm({...form, organization_id: Number(e.target.value), program_id: 0})} className={inputCls}>
                <option value={0}>-- Seleccionar --</option>
                {(orgs || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Programa</label>
              <select value={form.program_id} onChange={e => setForm({...form, program_id: Number(e.target.value)})} className={inputCls}>
                <option value={0}>Sin programa</option>
                {(programs || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Type, Priority, Phase, Health */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Tipo</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputCls}>
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Prioridad</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className={inputCls}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fase</label>
              <select value={form.phase} onChange={e => setForm({...form, phase: e.target.value})} className={inputCls}>
                {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Salud</label>
              <select value={form.health} onChange={e => setForm({...form, health: e.target.value})} className={inputCls}>
                {HEALTHS.map(h => <option key={h} value={h}>{h === 'green' ? 'Verde' : h === 'yellow' ? 'Amarillo' : 'Rojo'}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha Inicio</label>
              <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha Fin</label>
              <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className={inputCls} />
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Presupuesto Planificado</label>
              <input type="number" min="0" step="1000" value={form.budget} onChange={e => setForm({...form, budget: Number(e.target.value)})} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Presupuesto Real</label>
              <input type="number" min="0" step="1000" value={form.real_budget} onChange={e => setForm({...form, real_budget: Number(e.target.value)})} className={inputCls} />
            </div>
          </div>

          {/* Progress */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Avance Real (%)</label>
              <input type="number" min="0" max="100" step="1" value={form.progress} onChange={e => setForm({...form, progress: Number(e.target.value)})} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Avance Planificado (%)</label>
              <input type="number" min="0" max="100" step="1" value={form.planned_progress} onChange={e => setForm({...form, planned_progress: Number(e.target.value)})} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light sticky bottom-0 bg-transparent">
          <button onClick={onClose} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold btn-glow text-white rounded-xl disabled:opacity-50">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
