import { useState, useRef } from 'react';
import { Plus, X, Download, Edit2, Trash2, Upload, FileText, FileSpreadsheet, FileImage, Files, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import type { Document, UploadResponse } from '../../types';

// Folder definitions with their categories
const FOLDERS = [
  {
    id: 'artefactos',
    label: 'Artefactos Principales',
    description: 'Charter, Backlog + RAID, archivos importados',
    categories: ['artefacto', 'charter', 'plan'],
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
  },
  {
    id: 'minutas',
    label: 'Minutas y Transcripts',
    description: 'Actas de reunión, transcripciones',
    categories: ['minuta', 'transcript'],
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
  },
  {
    id: 'reportes',
    label: 'Reportes',
    description: 'Avance y seguimiento',
    categories: ['report', 'reporte'],
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
  },
  {
    id: 'otros',
    label: 'Otros Documentos',
    description: 'Contratos, anexos, otros',
    categories: ['contract', 'other'],
    color: 'text-text-secondary',
    bg: 'bg-surface-tertiary',
  },
];

const ALL_CATEGORIES = [
  { value: 'artefacto', label: 'Artefacto', folder: 'artefactos' },
  { value: 'charter', label: 'Charter', folder: 'artefactos' },
  { value: 'plan', label: 'Plan', folder: 'artefactos' },
  { value: 'minuta', label: 'Minuta', folder: 'minutas' },
  { value: 'transcript', label: 'Transcript', folder: 'minutas' },
  { value: 'report', label: 'Reporte', folder: 'reportes' },
  { value: 'contract', label: 'Contrato', folder: 'otros' },
  { value: 'other', label: 'Otro', folder: 'otros' },
];

export default function ProjectDocumentsTab({ projectId }: { projectId: number }) {
  const { toastSuccess, toastError } = useToast();
  const { data: docs, loading, refetch } = useApi(() => api.get<Document[]>(`/documents?project_id=${projectId}`), [projectId]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Document | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'artefacto' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['artefactos', 'minutas', 'reportes', 'otros']));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const getDocsForFolder = (folder: typeof FOLDERS[number]) => {
    return (docs || []).filter(d => folder.categories.includes(d.category));
  };

  // Documents that don't match any folder go to "otros"
  const getUncategorizedDocs = () => {
    const allKnown = FOLDERS.flatMap(f => f.categories);
    return (docs || []).filter(d => !allKnown.includes(d.category));
  };

  const openCreate = (defaultCategory?: string) => {
    setEditing(null);
    setForm({ name: '', description: '', category: defaultCategory || 'artefacto' });
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

  const formatSize = (bytes: number | null) => {
    if (!bytes || bytes === 0) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const fileIcon = (type: string | null) => {
    switch (type) {
      case 'pdf': case 'application/pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'xlsx': case 'xls': case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'mpp': case 'mpx': return <FileSpreadsheet className="w-5 h-5 text-blue-600" />;
      case 'jpg': case 'png': case 'image/jpeg': case 'image/png': return <FileImage className="w-5 h-5 text-blue-500" />;
      default: return <FileText className="w-5 h-5 text-text-tertiary" />;
    }
  };

  const categoryLabel = (cat: string) => {
    const found = ALL_CATEGORIES.find(c => c.value === cat);
    return found ? found.label : cat;
  };

  if (loading) return <LoadingSpinner />;

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";
  const uncategorized = getUncategorizedDocs();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-text-primary">Documentos del Proyecto</h3>
        <button onClick={() => openCreate()} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25"><Plus className="w-3.5 h-3.5" /> Nuevo</button>
      </div>

      {/* Folder Structure */}
      <div className="space-y-3">
        {FOLDERS.map(folder => {
          const folderDocs = folder.id === 'otros'
            ? [...getDocsForFolder(folder), ...uncategorized]
            : getDocsForFolder(folder);
          const isExpanded = expandedFolders.has(folder.id);
          const count = folderDocs.length;

          return (
            <div key={folder.id} className="liquid-glass-border rounded-2xl overflow-hidden">
              {/* Folder Header */}
              <button
                onClick={() => toggleFolder(folder.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-hover transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 text-text-tertiary" /> : <ChevronRight className="w-4 h-4 text-text-tertiary" />}
                <FolderOpen className={`w-5 h-5 ${folder.color}`} />
                <div className="flex-1 text-left">
                  <span className="text-[13px] font-semibold text-text-primary">{folder.label}</span>
                  <span className="text-[11px] text-text-tertiary ml-2">{folder.description}</span>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${folder.bg} ${folder.color}`}>
                  {count}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); openCreate(folder.categories[0]); }}
                  className="p-1 hover:bg-accent/10 rounded-lg ml-1"
                  title={`Agregar a ${folder.label}`}
                >
                  <Plus className="w-3.5 h-3.5 text-accent" />
                </button>
              </button>

              {/* Folder Contents */}
              {isExpanded && (
                <div className="border-t border-border-light">
                  {count === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <p className="text-[12px] text-text-tertiary">Sin documentos en esta carpeta</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border-light">
                      {folderDocs.map(doc => (
                        <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-hover transition-colors">
                          {fileIcon(doc.file_type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-text-primary truncate">{doc.name}</span>
                              <span className="text-[10px] font-mono text-text-tertiary">{doc.folio}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${folder.bg} ${folder.color}`}>{categoryLabel(doc.category)}</span>
                            </div>
                            {doc.description && <p className="text-[11px] text-text-tertiary truncate mt-0.5">{doc.description}</p>}
                          </div>
                          <span className="text-[11px] text-text-tertiary whitespace-nowrap">{formatSize(doc.file_size)}</span>
                          {doc.created_at && <span className="text-[11px] text-text-tertiary whitespace-nowrap">{doc.created_at.split('T')[0]}</span>}
                          <div className="flex items-center gap-0.5">
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
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-lg animate-fade-in">
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
                  {FOLDERS.map(folder => (
                    <optgroup key={folder.id} label={folder.label}>
                      {ALL_CATEGORIES.filter(c => c.folder === folder.id).map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </optgroup>
                  ))}
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
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-[13px] font-semibold btn-glow text-white rounded-xl shadow-sm shadow-accent/25 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
