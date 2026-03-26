import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, Files, FileText, FileSpreadsheet, FileImage, Download } from 'lucide-react';

interface Doc {
  id: number;
  folio: string;
  name: string;
  description: string;
  category: string;
  fileType: string;
  fileSize: number;
  version: number;
  uploadedBy: string;
  createdAt: string;
}

const mockDocs: Record<number, Doc[]> = {
  1: [
    { id: 1, folio: 'DOC-2026-001', name: 'Project Charter - Migración ERP', description: 'Acta de constitución del proyecto', category: 'plan', fileType: 'pdf', fileSize: 245000, version: 1, uploadedBy: 'Administrador PMO', createdAt: '2026-01-15' },
    { id: 2, folio: 'DOC-2026-002', name: 'Plan de Proyecto ERP', description: 'Cronograma y plan detallado', category: 'plan', fileType: 'xlsx', fileSize: 890000, version: 1, uploadedBy: 'Juan García', createdAt: '2026-01-20' },
  ],
  2: [
    { id: 3, folio: 'DOC-2026-003', name: 'Arquitectura Portal B2B', description: 'Documento de arquitectura técnica', category: 'report', fileType: 'pdf', fileSize: 1200000, version: 1, uploadedBy: 'María Rodríguez', createdAt: '2026-02-10' },
  ],
};

export default function ProjectDocumentsTab({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  const [docs, setDocs] = useState<Doc[]>(mockDocs[projectId] || []);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Doc | null>(null);
  const [form, setForm] = useState({ name: '', description: '', category: 'other' });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', category: 'other' });
    setShowModal(true);
  };

  const openEdit = (d: Doc) => {
    setEditing(d);
    setForm({ name: d.name, description: d.description, category: d.category });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      setDocs(docs.map(d => d.id === editing.id ? { ...d, ...form } : d));
    } else {
      setDocs([...docs, { id: Date.now(), folio: `DOC-2026-${(docs.length + 1).toString().padStart(3, '0')}`, ...form, fileType: 'pdf', fileSize: 0, version: 1, uploadedBy: 'Usuario', createdAt: new Date().toISOString().split('T')[0] }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => setDocs(docs.filter(d => d.id !== id));

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const fileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'xlsx': case 'xls': return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      case 'jpg': case 'png': return <FileImage className="w-8 h-8 text-blue-500" />;
      default: return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  const categoryBadge = (cat: string) => {
    const config: Record<string, { color: string; label: string }> = {
      plan: { color: 'bg-blue-100 text-blue-700', label: 'Plan' },
      report: { color: 'bg-purple-100 text-purple-700', label: 'Reporte' },
      contract: { color: 'bg-amber-100 text-amber-700', label: 'Contrato' },
      other: { color: 'bg-gray-100 text-gray-700', label: 'Otro' },
    };
    const c = config[cat] || { color: 'bg-gray-100 text-gray-700', label: cat };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">{t('nav.documents')}</h3>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          {t('projectDetail.addDocument')}
        </button>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Files className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('projectDetail.noDocuments')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 hover:shadow-md transition-shadow">
              <div className="flex-shrink-0">{fileIcon(d.fileType)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-400">{d.folio}</span>
                  {categoryBadge(d.category)}
                </div>
                <h4 className="font-medium text-gray-900 text-sm truncate">{d.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{d.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{formatSize(d.fileSize)}</span>
                  <span>v{d.version}</span>
                  <span>{d.uploadedBy}</span>
                  <span>{d.createdAt}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button className="p-1 hover:bg-blue-50 rounded"><Download className="w-3.5 h-3.5 text-blue-500" /></button>
                <button onClick={() => openEdit(d)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                <button onClick={() => handleDelete(d.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('projectDetail.editDocument') : t('projectDetail.addDocument')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.docName')}</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.description')}</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.category')}</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="plan">Plan</option>
                  <option value="report">Reporte</option>
                  <option value="contract">Contrato</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.file')}</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Files className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{t('projectDetail.dragOrClick')}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">{t('common.cancel')}</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
