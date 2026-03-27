import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Info, Users, AlertTriangle, Bug, RefreshCw,
  Files, Lightbulb, ClipboardList, DollarSign, Target,
  Calendar, Building2, TrendingUp, ListTree, ListChecks, BarChart3
} from 'lucide-react';
import { projects } from '../data/mock';
import PhaseBadge from '../components/common/PhaseBadge';
import HealthBadge from '../components/common/HealthBadge';
import ProgressBar from '../components/common/ProgressBar';
import ProjectInfoTab from '../components/project/ProjectInfoTab';
import ProjectCharterTab from '../components/project/ProjectCharterTab';
import ProjectBacklogTab from '../components/project/ProjectBacklogTab';
import ProjectAreasTab from '../components/project/ProjectAreasTab';
import ProjectRisksTab from '../components/project/ProjectRisksTab';
import ProjectIssuesTab from '../components/project/ProjectIssuesTab';
import ProjectChangesTab from '../components/project/ProjectChangesTab';
import ProjectDocumentsTab from '../components/project/ProjectDocumentsTab';
import ProjectLessonsTab from '../components/project/ProjectLessonsTab';
import ProjectMinutesTab from '../components/project/ProjectMinutesTab';
import ProjectReportsTab from '../components/project/ProjectReportsTab';
import PageHeader from '../components/common/PageHeader';

const tabs = [
  { id: 'info', icon: Info, labelKey: 'projectDetail.info' },
  { id: 'charter', icon: ListTree, labelKey: 'projectDetail.charter' },
  { id: 'backlog', icon: ListChecks, labelKey: 'projectDetail.backlog' },
  { id: 'areas', icon: Users, labelKey: 'projectDetail.areas' },
  { id: 'risks', icon: AlertTriangle, labelKey: 'nav.risks' },
  { id: 'issues', icon: Bug, labelKey: 'nav.issues' },
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

  const project = projects.find(p => p.id === Number(id));

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
      case 'risks': return <ProjectRisksTab projectId={project.id} />;
      case 'issues': return <ProjectIssuesTab projectId={project.id} />;
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
        <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl border border-blue-100/50 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Building2 className="w-4 h-4" />
            {t('projects.company')}
          </div>
          <p className="font-semibold text-gray-900">{project.company}</p>
        </div>
        <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl border border-blue-100/50 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Calendar className="w-4 h-4" />
            {t('projectDetail.timeline')}
          </div>
          <p className="font-semibold text-gray-900 text-sm">{project.startDate} → {project.endDate}</p>
        </div>
        <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl border border-blue-100/50 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <DollarSign className="w-4 h-4" />
            {t('projects.budget')}
          </div>
          <p className="font-semibold text-gray-900">{formatCurrency(project.budget)}</p>
          <p className="text-xs text-gray-500">Real: {formatCurrency(project.realBudget)}</p>
        </div>
        <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl border border-blue-100/50 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            {t('projects.progress')}
          </div>
          <ProgressBar value={project.progress} planned={project.plannedProgress} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey)}
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
