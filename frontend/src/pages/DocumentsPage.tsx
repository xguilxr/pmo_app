import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FileText, FileSpreadsheet, Files, Plus, Download } from 'lucide-react';

interface Doc { id: number; folio: string; name: string; category: string; fileType: string; fileSize: number; projectName: string; projectId: number; uploadedBy: string; createdAt: string; }

const mockDocs: Doc[] = [
  { id: 1, folio: 'DOC-2026-001', name: 'Project Charter - Migración ERP', category: 'plan', fileType: 'pdf', fileSize: 245000, projectName: 'Migración ERP SAP', projectId: 1, uploadedBy: 'Admin PMO', createdAt: '2026-01-15' },
  { id: 2, folio: 'DOC-2026-002', name: 'Plan de Proyecto ERP', category: 'plan', fileType: 'xlsx', fileSize: 890000, projectName: 'Migración ERP SAP', projectId: 1, uploadedBy: 'Juan García', createdAt: '2026-01-20' },
  { id: 3, folio: 'DOC-2026-003', name: 'Arquitectura Portal B2B', category: 'report', fileType: 'pdf', fileSize: 1200000, projectName: 'Portal Clientes B2B', projectId: 2, uploadedBy: 'María Rodríguez', createdAt: '2026-02-10' },
  { id: 4, folio: 'DOC-2026-004', name: 'Contrato Salesforce', category: 'contract', fileType: 'pdf', fileSize: 520000, projectName: 'Implementación CRM Salesforce', projectId: 6, uploadedBy: 'Admin PMO', createdAt: '2026-01-25' },
];

export default function DocumentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formatSize = (b: number) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  const fileIcon = (type: string) => type === 'xlsx' || type === 'xls' ? <FileSpreadsheet className="w-8 h-8 text-green-500" /> : <FileText className="w-8 h-8 text-red-500" />;
  const catBadge = (c: string) => {
    const m: Record<string, { color: string; label: string }> = { plan: { color: 'bg-blue-100 text-blue-700', label: 'Plan' }, report: { color: 'bg-purple-100 text-purple-700', label: 'Reporte' }, contract: { color: 'bg-amber-100 text-amber-700', label: 'Contrato' } };
    const cfg = m[c] || { color: 'bg-gray-100 text-gray-700', label: c };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('nav.documents')}</h2>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />{t('projectDetail.addDocument')}</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockDocs.map(d => (
          <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/projects/${d.projectId}`)}>
            {fileIcon(d.fileType)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-gray-400">{d.folio}</span>
                {catBadge(d.category)}
              </div>
              <h4 className="font-medium text-gray-900 text-sm truncate">{d.name}</h4>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span className="text-blue-600">{d.projectName}</span>
                <span>{formatSize(d.fileSize)}</span>
                <span>{d.uploadedBy}</span>
                <span>{d.createdAt}</span>
              </div>
            </div>
            <button className="p-1 hover:bg-blue-50 rounded self-center"><Download className="w-4 h-4 text-blue-500" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
