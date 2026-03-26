import { useTranslation } from 'react-i18next';
import { Target, Calendar, DollarSign, TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface Project {
  id: number;
  folio: string;
  name: string;
  type: string;
  priority: string;
  company: string;
  phase: string;
  progress: number;
  plannedProgress: number;
  budget: number;
  realBudget: number;
  startDate: string;
  endDate: string;
  health: string;
}

// Mock objectives for demo
const mockObjectives = [
  { id: 1, description: 'Migrar 100% de m\u00f3dulos financieros a SAP S/4HANA', type: 'general', targetValue: '100%', currentValue: '65%', progress: 65, status: 'in_progress' },
  { id: 2, description: 'Reducir tiempo de cierre contable mensual de 10 a 3 d\u00edas', type: 'specific', targetValue: '3 d\u00edas', currentValue: '6 d\u00edas', progress: 40, status: 'in_progress' },
  { id: 3, description: 'Capacitar al 100% del personal financiero', type: 'specific', targetValue: '45 personas', currentValue: '20 personas', progress: 44, status: 'in_progress' },
];

export default function ProjectInfoTab({ project }: { project: Project }) {
  const { t } = useTranslation();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  const budgetDeviation = project.budget > 0
    ? ((project.realBudget - project.budget) / project.budget * 100).toFixed(1)
    : '0';
  const budgetDeviationNum = parseFloat(budgetDeviation);

  const progressDeviation = project.progress - project.plannedProgress;

  // Calculate timeline progress
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  const now = Date.now();
  const timelineProgress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));

  const statusIcon = (status: string) => {
    switch (status) {
      case 'achieved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'not_achieved': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const typeLabel = (type: string) => {
    const colors: Record<string, string> = {
      general: 'bg-blue-100 text-blue-700',
      specific: 'bg-purple-100 text-purple-700',
      kpi: 'bg-amber-100 text-amber-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>{type.toUpperCase()}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Project Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* General Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            {t('projectDetail.generalInfo')}
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('projects.type')}</dt>
              <dd className="font-medium text-gray-900">{project.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('projects.priority')}</dt>
              <dd className={`font-medium ${project.priority === 'Alta' ? 'text-red-600' : project.priority === 'Media' ? 'text-amber-600' : 'text-green-600'}`}>{project.priority}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('projects.phase')}</dt>
              <dd className="font-medium text-gray-900">{project.phase}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('projects.company')}</dt>
              <dd className="font-medium text-gray-900">{project.company}</dd>
            </div>
          </dl>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            {t('projectDetail.costs')}
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('dashboard.planBudget')}</dt>
              <dd className="font-medium text-gray-900">{formatCurrency(project.budget)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('dashboard.realBudget')}</dt>
              <dd className="font-medium text-gray-900">{formatCurrency(project.realBudget)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('projectDetail.deviation')}</dt>
              <dd className={`font-medium ${budgetDeviationNum > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {budgetDeviationNum > 0 ? '+' : ''}{budgetDeviation}%
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('projectDetail.remaining')}</dt>
              <dd className="font-medium text-gray-900">{formatCurrency(project.budget - project.realBudget)}</dd>
            </div>
          </dl>
          {/* Budget bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t('projectDetail.spent')}</span>
              <span>{((project.realBudget / project.budget) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${
                  project.realBudget > project.budget ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (project.realBudget / project.budget) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Progress & Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            {t('projectDetail.progressTimeline')}
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('dashboard.progress')}</dt>
              <dd className="font-medium text-gray-900">{project.progress}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('dashboard.plannedProgress')}</dt>
              <dd className="font-medium text-gray-900">{project.plannedProgress}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('projectDetail.deviation')}</dt>
              <dd className={`font-medium ${progressDeviation < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {progressDeviation > 0 ? '+' : ''}{progressDeviation}%
              </dd>
            </div>
          </dl>
          {/* Timeline bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t('projectDetail.timeElapsed')}</span>
              <span>{timelineProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="h-2.5 rounded-full bg-blue-500" style={{ width: `${timelineProgress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{project.startDate}</span>
              <span>{project.endDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Objectives */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          {t('projectDetail.objectives')}
        </h3>
        <div className="space-y-4">
          {mockObjectives.map(obj => (
            <div key={obj.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              {statusIcon(obj.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {typeLabel(obj.type)}
                </div>
                <p className="text-sm text-gray-900">{obj.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>{t('projectDetail.target')}: <span className="font-medium text-gray-700">{obj.targetValue}</span></span>
                  <span>{t('projectDetail.current')}: <span className="font-medium text-gray-700">{obj.currentValue}</span></span>
                </div>
              </div>
              <div className="w-24 text-right">
                <span className="text-sm font-semibold text-gray-900">{obj.progress}%</span>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full ${obj.progress >= 80 ? 'bg-green-500' : obj.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                    style={{ width: `${obj.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
