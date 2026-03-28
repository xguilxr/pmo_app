import { useState } from 'react';
import { Plus, X, Download, Edit2, Trash2, Lightbulb, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

interface Lesson {
  id: number;
  folio: string;
  title: string;
  description: string | null;
  category: string;
  project_phase: string | null;
  recommendation: string | null;
  created_at: string | null;
}

export default function ProjectLessonsTab({ projectId }: { projectId: number }) {
  const { toastSuccess, toastError } = useToast();
  const { data: lessons, loading, refetch } = useApi(() => api.get<Lesson[]>(`/lessons?project_id=${projectId}`), [projectId]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'improvement', project_phase: '', recommendation: '' });

  const filtered = (lessons || []).filter(l => filter === 'all' || l.category === filter);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', category: 'improvement', project_phase: '', recommendation: '' });
    setShowModal(true);
  };

  const openEdit = (l: Lesson) => {
    setEditing(l);
    setForm({ title: l.title, description: l.description || '', category: l.category, project_phase: l.project_phase || '', recommendation: l.recommendation || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        description: form.description || null,
        project_phase: form.project_phase || null,
        recommendation: form.recommendation || null,
        project_id: projectId,
      };
      if (editing) {
        await api.patch(`/lessons/${editing.id}`, payload);
        toastSuccess('Leccion actualizada');
      } else {
        await api.post(`/lessons?project_id=${projectId}`, payload);
        toastSuccess('Leccion creada');
      }
      setShowModal(false);
      refetch();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta leccion?')) return;
    try { await api.delete(`/lessons/${id}`); toastSuccess('Eliminada'); refetch(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleExport = () => {
    const token = localStorage.getItem('pmo_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/exports/lessons?project_id=${projectId}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lecciones_${projectId}.csv`; a.click(); })
      .catch(() => toastError('Error al exportar'));
  };

  const categoryConfig: Record<string, { icon: typeof CheckCircle2; color: string; badgeColor: string; label: string }> = {
    success: { icon: CheckCircle2, color: 'text-emerald-600', badgeColor: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600', label: 'Exito' },
    improvement: { icon: TrendingUp, color: 'text-amber-600', badgeColor: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600', label: 'Mejora' },
    error: { icon: AlertCircle, color: 'text-red-600', badgeColor: 'bg-red-100 dark:bg-red-950/50 text-red-600', label: 'Error' },
  };

  if (loading) return <LoadingSpinner />;

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 bg-surface-tertiary p-1 rounded-xl">
          {['all', 'success', 'improvement', 'error'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${filter === s ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
              {s === 'all' ? 'Todas' : categoryConfig[s]?.label || s} {s !== 'all' ? `(${(lessons||[]).filter(l=>l.category===s).length})` : `(${(lessons||[]).length})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25">
            <Plus className="w-3.5 h-3.5" /> Nueva Leccion
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-2xl border border-border">
          <Lightbulb className="w-10 h-10 text-text-tertiary mx-auto mb-3 opacity-40" />
          <p className="text-[13px] text-text-tertiary">Sin lecciones registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(l => {
            const cat = categoryConfig[l.category] || categoryConfig.improvement;
            const Icon = cat.icon;
            return (
              <div key={l.id} className="bg-surface rounded-2xl border border-border p-5 hover:border-border-hover hover:shadow-sm transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-xl bg-surface-tertiary ${cat.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] text-text-tertiary">{l.folio}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cat.badgeColor}`}>{cat.label}</span>
                        {l.project_phase && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-text-secondary">{l.project_phase}</span>}
                      </div>
                      <h4 className="font-semibold text-text-primary text-[13px]">{l.title}</h4>
                      {l.description && <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">{l.description}</p>}
                      {l.recommendation && (
                        <div className="mt-3 p-3 bg-surface-tertiary rounded-xl">
                          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">Recomendacion</p>
                          <p className="text-[12px] text-text-primary leading-relaxed">{l.recommendation}</p>
                        </div>
                      )}
                      {l.created_at && (
                        <div className="mt-2 text-[11px] text-text-tertiary">{l.created_at.split('T')[0]}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-3">
                    <button onClick={() => openEdit(l)} className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5 text-text-tertiary" /></button>
                    <button onClick={() => handleDelete(l.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-2xl w-full max-w-lg border border-border shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">{editing ? 'Editar Leccion' : 'Nueva Leccion'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div><label className={labelCls}>Titulo *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Descripcion</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Categoria</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inputCls}>
                    <option value="success">Exito</option>
                    <option value="improvement">Mejora</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Fase del Proyecto</label>
                  <select value={form.project_phase} onChange={e => setForm({...form, project_phase: e.target.value})} className={inputCls}>
                    <option value="">Seleccionar...</option>
                    <option value="Planificacion">Planificacion</option>
                    <option value="Ejecucion">Ejecucion</option>
                    <option value="Soporte">Soporte</option>
                    <option value="Cerrado">Cerrado</option>
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>Recomendacion</label><textarea value={form.recommendation} onChange={e => setForm({...form, recommendation: e.target.value})} rows={2} className={inputCls} /></div>
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
