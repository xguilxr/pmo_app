import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus } from 'lucide-react';

interface Risk {
  id: number;
  folio: string;
  title: string;
  category: string;
  probability: number;
  impact: number;
  severity: number;
  status: string;
  projectName: string;
  projectId: number;
  identificationDate: string;
}

const mockRisks: Risk[] = [
  { id: 1, folio: 'RSK-2026-001', title: 'Retraso en entrega de licencias SAP', category: 'Proveedor', probability: 4, impact: 5, severity: 20, status: 'open', projectName: 'Migración ERP SAP', projectId: 1, identificationDate: '2026-01-20' },
  { id: 2, folio: 'RSK-2026-002', title: 'Rotación de personal clave', category: 'Recurso', probability: 3, impact: 4, severity: 12, status: 'open', projectName: 'Migración ERP SAP', projectId: 1, identificationDate: '2026-02-05' },
  { id: 3, folio: 'RSK-2026-003', title: 'Cambio en regulación fiscal', category: 'Externo', probability: 2, impact: 5, severity: 10, status: 'open', projectName: 'Sistema de Facturación 4.0', projectId: 10, identificationDate: '2026-01-15' },
  { id: 4, folio: 'RSK-2026-004', title: 'Dependencia de proveedor cloud', category: 'Técnico', probability: 3, impact: 3, severity: 9, status: 'mitigated', projectName: 'Data Warehouse Analytics', projectId: 7, identificationDate: '2026-03-18' },
  { id: 5, folio: 'RSK-2026-005', title: 'Falta de adopción del CRM', category: 'Organizacional', probability: 4, impact: 4, severity: 16, status: 'open', projectName: 'Implementación CRM Salesforce', projectId: 6, identificationDate: '2026-02-10' },
];

export default function RisksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');

  const severityColor = (s: number) => s >= 15 ? 'bg-red-100 text-red-700' : s >= 8 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
  const statusBadge = (s: string) => {
    const c: Record<string, string> = { open: 'bg-red-100 text-red-700', mitigated: 'bg-blue-100 text-blue-700', closed: 'bg-gray-100 text-gray-700' };
    const l: Record<string, string> = { open: 'Abierto', mitigated: 'Mitigado', closed: 'Cerrado' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c[s] || ''}`}>{l[s] || s}</span>;
  };

  const filtered = statusFilter === 'all' ? mockRisks : mockRisks.filter(r => r.status === statusFilter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('nav.risks')}</h2>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          {t('projectDetail.addRisk')}
        </button>
      </div>

      <div className="flex gap-2">
        {['all', 'open', 'mitigated', 'closed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {s === 'all' ? t('projects.all') : s === 'open' ? 'Abiertos' : s === 'mitigated' ? 'Mitigados' : 'Cerrados'}
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
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.category')}</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">P</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">I</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">{t('projectDetail.severity')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/projects/${r.projectId}`)}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.folio}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.title}</td>
                <td className="px-4 py-3 text-blue-600 text-xs">{r.projectName}</td>
                <td className="px-4 py-3 text-gray-600">{r.category}</td>
                <td className="px-4 py-3 text-center">{r.probability}</td>
                <td className="px-4 py-3 text-center">{r.impact}</td>
                <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${severityColor(r.severity)}`}>{r.severity}</span></td>
                <td className="px-4 py-3">{statusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
