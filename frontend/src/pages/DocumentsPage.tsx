import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FileText, FileSpreadsheet, Files, Plus, Download, Search } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { api } from '../services/api';
import { useApi, LoadingSpinner, ErrorMessage } from '../hooks/useApi';

interface Doc { id: number; folio: string; name: string; category: string; fileType: string; fileSize: number; projectName: string; projectId: number; uploadedBy: string; createdAt: string; }

const mockDocs: Doc[] = [
  { id: 1, folio: 'DOC-2026-001', name: 'Project Charter - Migración ERP', category: 'plan', fileType: 'pdf', fileSize: 245000, projectName: 'Migración ERP SAP', projectId: 1, uploadedBy: 'Admin PMO', createdAt: '2026-01-15' },
  { id: 2, folio: 'DOC-2026-002', name: 'Plan de Proyecto ERP', category: 'plan', fileType: 'xlsx', fileSize: 890000, projectName: 'Migración ERP SAP', projectId: 1, uploadedBy: 'Juan García', createdAt: '2026-01-20' },
  { id: 3, folio: 'DOC-2026-003', name: 'Arquitectura Portal B2B', category: 'report', fileType: 'pdf', fileSize: 1200000, projectName: 'Portal Clientes B2B', projectId: 2, uploadedBy: 'María Rodríguez', createdAt: '2026-02-10' },
  { id: 4, folio: 'DOC-2026-004', name: 'Contrato Salesforce', category: 'contract', fileType: 'pdf', fileSize: 520000, projectName: 'Implementación CRM Salesforce', projectId: 6, uploadedBy: 'Admin PMO', createdAt: '2026-01-25' },
];

interface ApiDoc {
  id: number;
  folio: string;
  name?: string;
  title?: string;
  category?: string;
  file_type?: string;
  file_size?: number;
  project_name?: string;
  project_id: number;
  uploaded_by?: string;
  created_at?: string;
}

function mapApiDoc(d: ApiDoc): Doc {
  return {
    id: d.id,
    folio: d.folio,
    name: d.name || d.title || '',
    category: d.category || '',
    fileType: d.file_type || 'pdf',
    fileSize: d.file_size || 0,
    projectName: d.project_name || '',
    projectId: d.project_id,
    uploadedBy: d.uploaded_by || '',
    createdAt: d.created_at || '',
  };
}

export default function DocumentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: apiDocs, loading, error, refetch } = useApi<ApiDoc[]>(() => api.get('/documents'), []);

  const docs: Doc[] = apiDocs ? apiDocs.map(mapApiDoc) : mockDocs;

  const uniqueProjects = [...new Set(docs.map(d => d.projectName))];
  const uniqueCategories = [...new Set(docs.map(d => d.category))];

  const filtered = docs.filter(d => {
    if (projectFilter !== 'all' && d.projectName !== projectFilter) return false;
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    if (searchQuery && !d.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatSize = (b: number) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  const fileIcon = (type: string) => type === 'xlsx' || type === 'xls' ? <FileSpreadsheet className="w-8 h-8 text-green-500" /> : <FileText className="w-8 h-8 text-red-500" />;
  const catBadge = (c: string) => {
    const m: Record<string, { color: string; label: string }> = { plan: { color: 'bg-blue-100 text-blue-700', label: 'Plan' }, report: { color: 'bg-purple-100 text-purple-700', label: 'Reporte' }, contract: { color: 'bg-amber-100 text-amber-700', label: 'Contrato' } };
    const cfg = m[c] || { color: 'bg-gray-100 text-gray-700', label: c };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('nav.documents') }]}
        title={t('nav.documents')}
      >
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />{t('projectDetail.addDocument')}</button>
      </PageHeader>

      {error && !apiDocs && (
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
              {uniqueCategories.map(c => <option key={c} value={c}>{c === 'plan' ? 'Plan' : c === 'report' ? 'Reporte' : c === 'contract' ? 'Contrato' : c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('common.search')}</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar por nombre..." className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(d => (
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
