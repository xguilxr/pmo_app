import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Plus } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';

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

const mockChanges: Change[] = [
  { id: 1, folio: 'CHG-2026-001', title: 'Ampliar alcance módulo de reportes', changeType: 'scope', impact: '2 semanas adicionales', requestedBy: 'Director Comercial', status: 'in_review', projectName: 'Implementación CRM Salesforce', projectId: 6, requestDate: '2026-03-01' },
  { id: 2, folio: 'CHG-2026-002', title: 'Agregar soporte multi-idioma', changeType: 'scope', impact: '1 sprint adicional', requestedBy: 'Gerente de Producto', status: 'approved', projectName: 'Portal Clientes B2B', projectId: 2, requestDate: '2026-03-10' },
  { id: 3, folio: 'CHG-2026-003', title: 'Incremento presupuesto infraestructura', changeType: 'cost', impact: '+$200,000 MXN', requestedBy: 'Arquitecto TI', status: 'in_review', projectName: 'Migración ERP SAP', projectId: 1, requestDate: '2026-03-15' },
  { id: 4, folio: 'CHG-2026-004', title: 'Extensión plazo Go-Live', changeType: 'time', impact: '3 semanas adicionales', requestedBy: 'PM', status: 'rejected', projectName: 'Certificación ISO 27001', projectId: 8, requestDate: '2026-03-05' },
];

export default function ChangesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');

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

  const filtered = statusFilter === 'all' ? mockChanges : mockChanges.filter(c => c.status === statusFilter);

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('nav.changes') }]}
        title={t('nav.changes')}
      >
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />{t('projectDetail.addChange')}</button>
      </PageHeader>
      <div className="flex gap-2">
        {['all', 'in_review', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {s === 'all' ? t('projects.all') : s === 'in_review' ? 'En Revisión' : s === 'approved' ? 'Aprobados' : 'Rechazados'}
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
