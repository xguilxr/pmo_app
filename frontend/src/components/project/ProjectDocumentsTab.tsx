import { useState, useRef } from 'react';
import { Plus, X, Download, Edit2, Trash2, Upload, FileText, FileSpreadsheet, FileImage, Files } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

interface Document {
  id: number;
  folio: string;
  name: string;
  description: string | null;
  category: string;
  file_path: string | null;
  file_type: string | null;
  file_size: number | null;
  created_at: string | null;
}

interface UploadResponse {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

export default function ProjectDocumentsTab({ projectId }: { projectId: number }) {
  const { toastSuccess, toastError } = useToast();
  const { data: docs, loading, refetch } = useApi(() => api.get<Document[]>(`/documents?project_id=${projectId}`), [projectId]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Document | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'other' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', category: 'other' });
    setSelectedFile(null);
    setShowModal(true);
  };

  const openEdit = (doc: Document) => {
    setEditing(doc);
    setForm({ name: doc.name, description: doc.description || '', category: doc.category });
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/documents/${editing.id}`, { name: form.name, description: form.description || null, category: form.category });
        toastSuccess('Documento actualizado');
      } else {
        let filePath: string | null = null;
        let fileType: string | null = null;
        let fileSize: number | null = null;

        if (selectedFile) {
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('project_id', String(projectId));
          formData.append('category', form.category);

          const token = localStorage.getItem('pmo_token');
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
          const res = await fetch(`${baseUrl}/uploads`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Error al subir archivo' }));
            throw new Error(err.detail || 'Error al subir archivo');
          }
          const uploadData: UploadResponse = await res.json();
          filePath = uploadData.file_path;
          fileType = uploadData.file_type;
          fileSize = uploadData.file_size;
        }

        await api.post(`/documents?project_id=${projectId}`, {
          name: form.name,
          description: form.description || null,
          category: form.category,
          file_path: filePath,
          file_type: fileType,
          file_size: fileSize,
          project_id: projectId,
        });
        toastSuccess('Documento creado');
      }
      setShowModal(false);
      refetch();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try { await api.delete(`/documents/${id}`); toastSuccess('Eliminado'); refetch(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleDownload = (doc: Document) => {
    if (!doc.file_path) return;
    const token = localStorage.getItem('pmo_token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
    fetch(`${baseUrl}/uploads/${encodeURIComponent(doc.file_path)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = doc.name; a.click(); })
      .catch(() => toastError('Error al descargar'));
  };

  const handleExport = () => {
    const token = localStorage.getItem('pmo_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/exports/tasks?project_id=${projectId}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `documents_${projectId}.csv`; a.click(); })
      .catch(() => toastError('Error al exportar'));
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes || bytes === 0) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const fileIcon = (type: string | null) => {
    switch (type) {
      case 'pdf': case 'application/pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'xlsx': case 'xls': case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      case 'jpg': case 'png': case 'image/jpeg': case 'image/png': return <FileImage className="w-8 h-8 text-blue-500" />;
      default: return <FileText className="w-8 h-8 text-text-tertiary" />;
    }
  };

  const categoryBadge = (cat: string) => {
    const config: Record<string, { color: string; label: string }> = {
      plan: { color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600', label: 'Plan' },
      report: { color: 'bg-purple-100 dark:bg-purple-950/50 text-purple-600', label: 'Reporte' },
      contract: { color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600', label: 'Contrato' },
      other: { color: 'bg-gray-100 dark:bg-gray-800 text-text-secondary', label: 'Otro' },
    };
    const c = config[cat] || config.other;
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.color}`}>{c.label}</span>;
  };

  if (loading) return <LoadingSpinner />;

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-text-primary">Documentos</h3>
        <div className="flex gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all"><Download className="w-3.5 h-3.5" /> CSV</button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25"><Plus className="w-3.5 h-3.5" /> Nuevo</button>
        </div>
      </div>

      {(docs || []).length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-2xl border border-border">
          <Files className="w-10 h-10 text-text-tertiary mx-auto mb-3 opacity-40" />
          <p className="text-[13px] text-text-tertiary">Sin documentos registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(docs || []).map(doc => (
            <div key={doc.id} className="bg-surface rounded-2xl border border-border p-4 flex gap-4 hover:border-border-hover hover:shadow-sm transition-all">
              <div className="flex-shrink-0 mt-1">{fileIcon(doc.file_type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[11px] text-text-tertiary">{doc.folio}</span>
                  {categoryBadge(doc.category)}
                </div>
                <h4 className="font-semibold text-text-primary text-[13px] truncate">{doc.name}</h4>
                {doc.description && <p className="text-[12px] text-text-secondary mt-0.5 line-clamp-1">{doc.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-[11px] text-text-tertiary">
                  <span>{formatSize(doc.file_size)}</span>
                  {doc.created_at && <span>{doc.created_at.split('T')[0]}</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {doc.file_path && (
                  <button onClick={() => handleDownload(doc)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg"><Download className="w-3.5 h-3.5 text-blue-500" /></button>
                )}
                <button onClick={() => openEdit(doc)} className="p-1.5 hover:bg-surface-tertiary rounded-lg"><Edit2 className="w-3.5 h-3.5 text-text-tertiary" /></button>
                <button onClick={() => handleDelete(doc.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-2xl w-full max-w-lg border border-border shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">{editing ? 'Editar Documento' : 'Nuevo Documento'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={labelCls}>Nombre *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Descripción</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className={inputCls} /></div>
              <div>
                <label className={labelCls}>Categoría</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inputCls}>
                  <option value="plan">Plan</option>
                  <option value="report">Reporte</option>
                  <option value="contract">Contrato</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              {!editing && (
                <div>
                  <label className={labelCls}>Archivo</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                      if (file && !form.name) setForm(f => ({ ...f, name: file.name }));
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-accent/50 hover:bg-surface-hover transition-all"
                  >
                    <Upload className="w-6 h-6 text-text-tertiary mx-auto mb-2" />
                    {selectedFile ? (
                      <p className="text-[13px] text-text-primary font-medium">{selectedFile.name} <span className="text-text-tertiary">({formatSize(selectedFile.size)})</span></p>
                    ) : (
                      <p className="text-[13px] text-text-tertiary">Haz clic para seleccionar un archivo</p>
                    )}
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-[13px] font-semibold bg-accent text-white rounded-xl hover:bg-accent-hover shadow-sm shadow-accent/25 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
