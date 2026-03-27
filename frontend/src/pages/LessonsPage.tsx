import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { api } from '../services/api';
import { useApi, LoadingSpinner, ErrorMessage } from '../hooks/useApi';

interface Lesson { id: number; folio: string; title: string; description: string; category: string; projectPhase: string; recommendation: string; projectName: string; projectId: number; recordedBy: string; createdAt: string; }

interface ApiLesson {
  id: number;
  folio: string;
  title: string;
  description?: string;
  category?: string;
  project_phase?: string;
  recommendation?: string;
  project_name?: string;
  project_id: number;
  recorded_by?: string;
  created_at?: string;
}

function mapApiLesson(l: ApiLesson): Lesson {
  return {
    id: l.id,
    folio: l.folio,
    title: l.title,
    description: l.description || '',
    category: l.category || 'improvement',
    projectPhase: l.project_phase || '',
    recommendation: l.recommendation || '',
    projectName: l.project_name || '',
    projectId: l.project_id,
    recordedBy: l.recorded_by || '',
    createdAt: l.created_at || '',
  };
}

export default function LessonsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: apiLessons, loading, error, refetch } = useApi<ApiLesson[]>(() => api.get('/lessons'), []);

  const lessons: Lesson[] = apiLessons ? apiLessons.map(mapApiLesson) : [];

  const uniqueProjects = [...new Set(lessons.map(l => l.projectName))];
  const uniqueCategories = [...new Set(lessons.map(l => l.category))];

  const catConfig: Record<string, { icon: typeof CheckCircle2; color: string; bgColor: string; label: string }> = {
    success: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', label: 'Éxito' },
    improvement: { icon: TrendingUp, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', label: 'Mejora' },
    error: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', label: 'Error' },
  };

  const filtered = lessons.filter(l => {
    if (projectFilter !== 'all' && l.projectName !== projectFilter) return false;
    if (categoryFilter !== 'all' && l.category !== categoryFilter) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('nav.lessons') }]}
        title={t('nav.lessons')}
      >
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />{t('projectDetail.addLesson')}</button>
      </PageHeader>

      {error && !apiLessons && (
        <ErrorMessage message={error} onRetry={refetch} />
      )}

      {/* Filter Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('minutes.project')}</label>
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="all">{t('projects.all')}</option>
              {uniqueProjects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projectDetail.category')}</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="all">{t('projects.all')}</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{catConfig[c]?.label || c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map(l => {
          const cat = catConfig[l.category] || catConfig.improvement;
          const Icon = cat.icon;
          return (
            <div key={l.id} className={`bg-white rounded-xl border p-5 ${cat.bgColor} hover:shadow-md transition-shadow cursor-pointer`} onClick={() => navigate(`/projects/${l.projectId}`)}>
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 ${cat.color}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-400">{l.folio}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.color} bg-white/60`}>{cat.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{l.projectPhase}</span>
                    <span className="text-xs text-blue-600">{l.projectName}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">{l.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{l.description}</p>
                  {l.recommendation && (
                    <div className="mt-3 p-3 bg-white/60 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 mb-1">{t('projectDetail.recommendation')}</p>
                      <p className="text-sm text-gray-700">{l.recommendation}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                    <span>{l.recordedBy}</span><span>{l.createdAt}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
