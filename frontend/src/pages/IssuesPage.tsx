import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { api } from '../services/api';
import { useApi, LoadingSpinner, ErrorMessage } from '../hooks/useApi';

interface Issue {
  id: number;
  folio: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  projectName: string;
  projectId: number;
  reportDate: string;
  commitmentDate: string;
}

interface ApiIssue {
  id: number;
  folio: string;
  title: string;
  type?: string;
  priority?: string;
  status: string;
  project_name?: string;
  project_id: number;
  report_date?: string;
  commitment_date?: string;
  created_at?: string;
}

function mapApiIssue(i: ApiIssue): Issue {
  return {
    id: i.id,
    folio: i.folio,
    title: i.title,
    type: i.type || 'issue',
    priority: i.priority || 'Media',
    status: i.status,
    projectName: i.project_name || '',
    projectId: i.project_id,
    reportDate: i.report_date || i.created_at || '',
    commitmentDate: i.commitment_date || '',
  };
}

export default function IssuesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { data: apiIssues, loading, error, refetch } = useApi<ApiIssue[]>(() => api.get('/issues'), []);

  const issues: Issue[] = apiIssues ? apiIssues.map(mapApiIssue) : [];

  const uniqueProjects = [...new Set(issues.map(i => i.projectName))];

  const typeBadge = (type: string) => {
    const c: Record<string, { color: string; label: string }> = { action: { color: 'bg-blue-100 text-blue-700', label: 'Acción' }, issue: { color: 'bg-red-100 text-red-700', label: 'Incidencia' }, decision: { color: 'bg-purple-100 text-purple-700', label: 'Decisión' } };
    const cfg = c[type] || { color: 'bg-gray-100 text-gray-700', label: type };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
  };

  const statusBadge = (s: string) => {
    const c: Record<string, { color: string; label: string }> = { open: { color: 'bg-red-100 text-red-700', label: 'Abierto' }, in_progress: { color: 'bg-blue-100 text-blue-700', label: 'En Progreso' }, resolved: { color: 'bg-green-100 text-green-700', label: 'Resuelto' }, closed: { color: 'bg-gray-100 text-gray-700', label: 'Cerrado' } };
    const cfg = c[s] || { color: 'bg-gray-100 text-gray-700', label: s };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
  };

  const filtered = issues.filter(i => {
    if (projectFilter !== 'all' && i.projectName !== projectFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('nav.issues') }]}
        title={`${t('nav.issues')} (AID)`}
      >
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />{t('projectDetail.addIssue')}
        </button>
      </PageHeader>

      {error && !apiIssues && (
        <ErrorMessage message={error} onRetry={refetch} />
      )}

      {/* Filter Panel */}
      <div className="liquid-glass-border rounded-xl p-4">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('minutes.project')}</label>
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="all">{t('projects.all')}</option>
              {uniqueProjects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('common.status')}</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="all">{t('projects.all')}</option>
              <option value="open">Abierto</option>
              <option value="in_progress">En Progreso</option>
              <option value="resolved">Resuelto</option>
              <option value="closed">Cerrado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projects.type')}</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="all">{t('projects.all')}</option>
              <option value="action">Accion</option>
              <option value="issue">Incidencia</option>
              <option value="decision">Decision</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projects.priority')}</label>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="all">{t('projects.all')}</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
        </div>
      </div>
      <div className="liquid-glass-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Folio</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.riskTitle')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('minutes.project')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projects.type')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projects.priority')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.commitDate')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(i => (
              <tr key={i.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/projects/${i.projectId}`)}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{i.folio}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{i.title}</td>
                <td className="px-4 py-3 text-blue-600 text-xs">{i.projectName}</td>
                <td className="px-4 py-3">{typeBadge(i.type)}</td>
                <td className="px-4 py-3"><span className={`font-medium ${i.priority === 'Alta' ? 'text-red-600' : i.priority === 'Media' ? 'text-amber-600' : 'text-green-600'}`}>{i.priority}</span></td>
                <td className="px-4 py-3">{statusBadge(i.status)}</td>
                <td className="px-4 py-3 text-gray-500">{i.commitmentDate || '-'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">{t('projects.noResults')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
