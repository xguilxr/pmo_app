import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { api } from '../services/api';
import { useApi, LoadingSpinner, ErrorMessage } from '../hooks/useApi';

import type { RiskWithProject } from '../types';

interface ApiRisk {
  id: number;
  folio: string;
  title: string;
  category: string;
  probability: number;
  impact: number;
  severity: number;
  status: string;
  project_name?: string;
  project_id: number;
  identification_date?: string;
  created_at?: string;
}

function mapApiRisk(r: ApiRisk): RiskWithProject {
  return {
    id: r.id,
    folio: r.folio,
    title: r.title,
    category: r.category || '',
    probability: r.probability ?? 0,
    impact: r.impact ?? 0,
    severity: r.severity ?? (r.probability ?? 0) * (r.impact ?? 0),
    status: r.status,
    project_name: r.project_name || '',
    project_id: r.project_id,
    identification_date: r.identification_date || r.created_at || '',
  };
}

export default function RisksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [severityMin, setSeverityMin] = useState('');
  const [severityMax, setSeverityMax] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: apiRisks, loading, error, refetch } = useApi<ApiRisk[]>(() => api.get('/risks'), []);

  const risks: RiskWithProject[] = apiRisks ? apiRisks.map(mapApiRisk) : [];

  const uniqueProjects = [...new Set(risks.map(r => r.project_name))];

  const severityColor = (s: number) => s >= 15 ? 'bg-red-100 text-red-700' : s >= 8 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
  const statusBadge = (s: string) => {
    const c: Record<string, string> = { open: 'bg-red-100 text-red-700', mitigated: 'bg-blue-100 text-blue-700', closed: 'bg-gray-100 text-gray-700' };
    const l: Record<string, string> = { open: 'Abierto', mitigated: 'Mitigado', closed: 'Cerrado' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c[s] || ''}`}>{l[s] || s}</span>;
  };

  const filtered = risks.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (projectFilter !== 'all' && r.project_name !== projectFilter) return false;
    if (severityMin && r.severity < Number(severityMin)) return false;
    if (severityMax && r.severity > Number(severityMax)) return false;
    if (dateFrom && r.identification_date < dateFrom) return false;
    if (dateTo && r.identification_date > dateTo) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('nav.risks') }]}
        title={t('nav.risks')}
      >
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          {t('projectDetail.addRisk')}
        </button>
      </PageHeader>

      {error && !apiRisks && (
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
              <option value="open">Abierto</option>
              <option value="mitigated">Mitigado</option>
              <option value="closed">Cerrado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projectDetail.severity')}</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" value={severityMin} onChange={e => setSeverityMin(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="Max" value={severityMax} onChange={e => setSeverityMax(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('common.from')}</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('common.to')}</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.category')}</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">P</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">I</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">{t('projectDetail.severity')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/projects/${r.project_id}`)}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.folio}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.title}</td>
                <td className="px-4 py-3 text-blue-600 text-xs">{r.project_name}</td>
                <td className="px-4 py-3 text-gray-600">{r.category}</td>
                <td className="px-4 py-3 text-center">{r.probability}</td>
                <td className="px-4 py-3 text-center">{r.impact}</td>
                <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${severityColor(r.severity)}`}>{r.severity}</span></td>
                <td className="px-4 py-3">{statusBadge(r.status)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">{t('projects.noResults')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
