import { useState } from 'react';
import { Plus, X, Download, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

interface Issue {
  id: number; folio: string; title: string; description: string | null;
  type: string; priority: string; status: string;
  resolution: string | null; report_date: string | null; commitment_date: string | null;
}

export default function ProjectIssuesTab({ projectId }: { projectId: number }) {
  const { toastSuccess, toastError } = useToast();
  const { data: issues, loading, refetch } = useApi(() => api.get<Issue[]>(`/issues?project_id=${projectId}`), [projectId]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'issue', priority: 'Media', status: 'Abierto', resolution: '', report_date: '', commitment_date: '' });

  const filtered = (issues || []).filter(i => filter === 'all' || i.type === filter);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', type: 'issue', priority: 'Media', status: 'Abierto', resolution: '', report_date: new Date().toISOString().slice(0,10), commitment_date: '' });
    setShowModal(true);
  };

  const openEdit = (i: Issue) => {
    setEditing(i);
    setForm({ title: i.title, description: i.description || '', type: i.type, priority: i.priority, status: i.status, resolution: i.resolution || '', report_date: i.report_date || '', commitment_date: i.commitment_date || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, report_date: form.report_date || null, commitment_date: form.commitment_date || null, project_id: projectId };
      if (editing) {
        await api.patch(`/issues/${editing.id}`, payload);
        toastSuccess('Incidencia actualizada');
      } else {
        await api.post(`/issues?project_id=${projectId}`, payload);
        toastSuccess('Incidencia creada');
      }
      setShowModal(false);
      refetch();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta incidencia?')) return;
    try { await api.delete(`/issues/${id}`); toastSuccess('Incidencia eliminada'); refetch(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleExport = () => {
    const token = localStorage.getItem('pmo_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/exports/issues?project_id=${projectId}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `incidencias_${projectId}.csv`; a.click(); })
      .catch(() => toastError('Error al exportar'));
  };

  const typeLabel: Record<string, string> = { action: 'Acción', issue: 'Incidencia', decision: 'Decisión' };
  const typeColor: Record<string, string> = {
    action: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
    issue: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400',
    decision: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400',
  };

  const priorityColor: Record<string, string> = {
    Alta: 'text-red-600 dark:text-red-400',
    Media: 'text-amber-600 dark:text-amber-400',
    Baja: 'text-emerald-600 dark:text-emerald-400',
  };

  const statusColor: Record<string, string> = {
    Abierto: 'bg-red-100 dark:bg-red-950/50 text-red-600',
    'En Progreso': 'bg-blue-100 dark:bg-blue-950/50 text-blue-600',
    Resuelto: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600',
    Cerrado: 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400',
  };

  if (loading) return <LoadingSpinner />;

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 bg-surface-tertiary p-1 rounded-xl">
          {['all', 'action', 'issue', 'decision'].map(t => (
            <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${filter === t ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
              {t === 'all' ? 'Todos' : typeLabel[t]} {t !== 'all' ? `(${(issues||[]).filter(i=>i.type===t).length})` : `(${(issues||[]).length})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25">
            <Plus className="w-3.5 h-3.5" /> Nueva Incidencia
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-2xl border border-border">
          <p className="text-[13px] text-text-tertiary">Sin incidencias registradas</p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface-tertiary border-b border-border">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Folio</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Prioridad</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">F. Compromiso</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id} className="border-b border-border-light hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-text-tertiary font-mono text-[11px]">{i.folio}</td>
                  <td className="px-4 py-3">
                    <p className="text-text-primary font-medium">{i.title}</p>
                    {i.description && <p className="text-[11px] text-text-tertiary mt-0.5 line-clamp-1">{i.description}</p>}
                  </td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeColor[i.type] || 'bg-gray-100 text-gray-600'}`}>{typeLabel[i.type] || i.type}</span></td>
                  <td className="px-4 py-3"><span className={`font-semibold text-[12px] ${priorityColor[i.priority] || 'text-text-secondary'}`}>{i.priority}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusColor[i.status] || 'bg-gray-100 text-gray-600'}`}>{i.status}</span></td>
                  <td className="px-4 py-3 text-text-secondary text-[12px]">{i.commitment_date || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(i)} className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5 text-text-tertiary" /></button>
                    <button onClick={() => handleDelete(i.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors ml-1"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-2xl w-full max-w-lg border border-border shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">{editing ? 'Editar Incidencia' : 'Nueva Incidencia'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div><label className={labelCls}>Título *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Descripción</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className={inputCls} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Tipo</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputCls}>
                    <option value="action">Acción</option>
                    <option value="issue">Incidencia</option>
                    <option value="decision">Decisión</option>
                  </select>
                </div>
                <div><label className={labelCls}>Prioridad</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className={inputCls}>
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
                <div><label className={labelCls}>Estado</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}>
                    <option value="Abierto">Abierto</option>
                    <option value="En Progreso">En Progreso</option>
                    <option value="Resuelto">Resuelto</option>
                    <option value="Cerrado">Cerrado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>F. Reporte</label><input type="date" value={form.report_date} onChange={e => setForm({...form, report_date: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>F. Compromiso</label><input type="date" value={form.commitment_date} onChange={e => setForm({...form, commitment_date: e.target.value})} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Resolución</label><textarea value={form.resolution} onChange={e => setForm({...form, resolution: e.target.value})} rows={2} className={inputCls} /></div>
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
