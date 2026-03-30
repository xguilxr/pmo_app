import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Info, Users, Shield, RefreshCw,
  Files, Lightbulb, ClipboardList, DollarSign,
  Calendar, Building2, TrendingUp, ListTree, ListChecks, BarChart3
} from 'lucide-react';
import { api } from '../services/api';
import { useApi, LoadingSpinner } from '../hooks/useApi';
import PhaseBadge from '../components/common/PhaseBadge';
import HealthBadge from '../components/common/HealthBadge';
import ProgressBar from '../components/common/ProgressBar';
import ProjectInfoTab from '../components/project/ProjectInfoTab';
import ProjectCharterTab from '../components/project/ProjectCharterTab';
import ProjectBacklogTab from '../components/project/ProjectBacklogTab';
import ProjectAreasTab from '../components/project/ProjectAreasTab';
import ProjectRaidTab from '../components/project/ProjectRaidTab';
import ProjectChangesTab from '../components/project/ProjectChangesTab';
import ProjectDocumentsTab from '../components/project/ProjectDocumentsTab';
import ProjectLessonsTab from '../components/project/ProjectLessonsTab';
import ProjectMinutesTab from '../components/project/ProjectMinutesTab';
import ProjectReportsTab from '../components/project/ProjectReportsTab';
import PageHeader from '../components/common/PageHeader';

interface ApiProject {
  id: number;
  folio: string;
  name: string;
  description?: string;
  type: string;
  priority: string;
  phase: string;
  status: string;
  health: string;
  start_date: string;
  end_date: string;
  budget: number;
  real_budget?: number;
  progress: number;
  planned_progress?: number;
  organization_id?: number;
}

const tabs = [
  { id: 'info', icon: Info, labelKey: 'projectDetail.info' },
  { id: 'charter', icon: ListTree, labelKey: 'projectDetail.charter' },
  { id: 'backlog', icon: ListChecks, labelKey: 'projectDetail.backlog' },
  { id: 'areas', icon: Users, labelKey: 'projectDetail.areas' },
  { id: 'raid', icon: Shield, label: 'RAID' },
  { id: 'changes', icon: RefreshCw, labelKey: 'nav.changes' },
  { id: 'documents', icon: Files, labelKey: 'nav.documents' },
  { id: 'lessons', icon: Lightbulb, labelKey: 'nav.lessons' },
  { id: 'minutes', icon: ClipboardList, labelKey: 'nav.minutes' },
  { id: 'reports', icon: BarChart3, labelKey: 'nav.reports' },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('info');

  const projectId = Number(id);
  const { data: apiProject, loading } = useApi(
    () => api.get<ApiProject>(`/projects/${projectId}`).catch(() => null),
    [projectId]
  );

  const project = apiProject
    ? {
        id: apiProject.id,
        folio: apiProject.folio,
        name: apiProject.name,
        type: apiProject.type,
        priority: apiProject.priority as 'Alta' | 'Media' | 'Baja',
        company: '',
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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  const renderTab = () => {
    switch (activeTab) {
      case 'info': return <ProjectInfoTab project={project} />;
      case 'charter': return <ProjectCharterTab projectId={project.id} />;
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
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: t('nav.projects'), href: '/projects' },
          { label: project.name },
        ]}
        title={project.name}
        subtitle={`${project.folio}`}
      >
        <div className="flex items-center gap-2">
          <PhaseBadge phase={project.phase} />
          <HealthBadge health={project.health} />
        </div>
      </PageHeader>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl border border-border p-4 card-glow">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary uppercase tracking-widest mb-1.5">
            <Building2 className="w-3.5 h-3.5" />
            {t('projects.company')}
          </div>
          <p className="font-medium text-text-primary">{project.company || '-'}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-4 card-glow">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary uppercase tracking-widest mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {t('projectDetail.timeline')}
          </div>
          <p className="font-medium text-text-primary text-[13px]">{project.startDate} → {project.endDate}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-4 card-glow">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary uppercase tracking-widest mb-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            {t('projects.budget')}
          </div>
          <p className="font-medium text-text-primary">{formatCurrency(project.budget)}</p>
          <p className="text-[11px] text-text-tertiary font-light mt-0.5">Real: {formatCurrency(project.realBudget)}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-4 card-glow">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary uppercase tracking-widest mb-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            {t('projects.progress')}
          </div>
          <ProgressBar value={project.progress} planned={project.plannedProgress} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0.5 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-[13px] font-normal border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
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
    </div>
  );
}
