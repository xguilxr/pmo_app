import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { api } from '../services/api';
import { useApi, LoadingSpinner, ErrorMessage } from '../hooks/useApi';

interface Change {
  id: number;
  folio: string;
  title: string;
  changeType: string;
  impact: string;
  requestedBy: string;
  status: string;
  projectName: string;
  projectId: number;
  requestDate: string;
}

interface ApiChange {
  id: number;
  folio: string;
  title: string;
  change_type?: string;
  impact?: string;
  requested_by?: string;
  status: string;
  project_name?: string;
  project_id: number;
  request_date?: string;
  created_at?: string;
}

function mapApiChange(c: ApiChange): Change {
  return {
    id: c.id,
    folio: c.folio,
    title: c.title,
    changeType: c.change_type || '',
    impact: c.impact || '',
    requestedBy: c.requested_by || '',
    status: c.status,
    projectName: c.project_name || '',
    projectId: c.project_id,
    requestDate: c.request_date || c.created_at || '',
  };
}

export default function ChangesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: apiChanges, loading, error, refetch } = useApi<ApiChange[]>(() => api.get('/changes'), []);

  const changes: Change[] = apiChanges ? apiChanges.map(mapApiChange) : [];

  const uniqueProjects = [...new Set(changes.map(c => c.projectName))];

  const typeBadge = (type: string) => {
    const c: Record<string, { color: string; label: string }> = { scope: { color: 'bg-purple-100 text-purple-700', label: 'Alcance' }, time: { color: 'bg-blue-100 text-blue-700', label: 'Tiempo' }, cost: { color: 'bg-green-100 text-green-700', label: 'Costo' }, resource: { color: 'bg-amber-100 text-amber-700', label: 'Recurso' } };
    const cfg = c[type] || { color: 'bg-gray-100 text-gray-700', label: type };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
  };

  const statusBadge = (s: string) => {
    const c: Record<string, { color: string; label: string }> = { in_review: { color: 'bg-amber-100 text-amber-700', label: 'En Revisión' }, approved: { color: 'bg-green-100 text-green-700', label: 'Aprobado' }, rejected: { color: 'bg-red-100 text-red-700', label: 'Rechazado' }, implemented: { color: 'bg-blue-100 text-blue-700', label: 'Implementado' } };
    const cfg = c[s] || { color: 'bg-gray-100 text-gray-700', label: s };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
  };

  const filtered = changes.filter(c => {
    if (projectFilter !== 'all' && c.projectName !== projectFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (typeFilter !== 'all' && c.changeType !== typeFilter) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('nav.changes') }]}
        title={t('nav.changes')}
      >
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />{t('projectDetail.addChange')}</button>
      </PageHeader>

      {error && !apiChanges && (
        <ErrorMessage message={error} onRetry={refetch} />
      )}

      {/* Filter Panel */}
      <div className="liquid-glass-border rounded-xl p-4">
        <div className="grid grid-cols-3 gap-3">
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
              <option value="in_review">En Revision</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
              <option value="implemented">Implementado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projects.type')}</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="all">{t('projects.all')}</option>
              <option value="scope">Alcance</option>
              <option value="time">Tiempo</option>
              <option value="cost">Costo</option>
              <option value="resource">Recurso</option>
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
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.requestedBy')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.impact')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/projects/${c.projectId}`)}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.folio}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{c.title}</td>
                <td className="px-4 py-3 text-blue-600 text-xs">{c.projectName}</td>
                <td className="px-4 py-3">{typeBadge(c.changeType)}</td>
                <td className="px-4 py-3 text-gray-600">{c.requestedBy}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{c.impact}</td>
                <td className="px-4 py-3">{statusBadge(c.status)}</td>
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
