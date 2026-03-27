import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bug, Plus } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';

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

const mockIssues: Issue[] = [
  { id: 1, folio: 'INC-2026-001', title: 'Integración API fallando en staging', type: 'issue', priority: 'Alta', status: 'open', projectName: 'Migración ERP SAP', projectId: 1, reportDate: '2026-03-10', commitmentDate: '2026-03-20' },
  { id: 2, folio: 'INC-2026-002', title: 'Definir estándar de documentación', type: 'decision', priority: 'Media', status: 'open', projectName: 'Portal Clientes B2B', projectId: 2, reportDate: '2026-03-05', commitmentDate: '' },
  { id: 3, folio: 'INC-2026-003', title: 'Capacitación pendiente equipo ventas', type: 'action', priority: 'Alta', status: 'in_progress', projectName: 'Implementación CRM Salesforce', projectId: 6, reportDate: '2026-03-12', commitmentDate: '2026-03-30' },
  { id: 4, folio: 'INC-2026-004', title: 'Conflicto de versiones en dependencias', type: 'issue', priority: 'Media', status: 'resolved', projectName: 'App Móvil Ventas', projectId: 4, reportDate: '2026-03-08', commitmentDate: '2026-03-15' },
  { id: 5, folio: 'INC-2026-005', title: 'Aprobar diseño de dashboard ejecutivo', type: 'decision', priority: 'Alta', status: 'open', projectName: 'Data Warehouse Analytics', projectId: 7, reportDate: '2026-03-20', commitmentDate: '2026-03-28' },
];

export default function IssuesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('all');

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

  const filtered = typeFilter === 'all' ? mockIssues : mockIssues.filter(i => i.type === typeFilter);

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
      <div className="flex gap-2">
        {['all', 'action', 'issue', 'decision'].map(tp => (
          <button key={tp} onClick={() => setTypeFilter(tp)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${typeFilter === tp ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {tp === 'all' ? t('projects.all') : tp === 'action' ? 'Acciones' : tp === 'issue' ? 'Incidencias' : 'Decisiones'}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
