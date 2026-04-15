import { useState } from 'react';
import { Plus, X, Download, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import type { Change } from '../../types';

export default function ProjectChangesTab({ projectId }: { projectId: number }) {
  const { toastSuccess, toastError } = useToast();
  const { data: changes, loading, refetch } = useApi(() => api.get<Change[]>(`/changes?project_id=${projectId}`), [projectId]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Change | null>(null);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', change_type: 'scope', impact: '', requested_by: '', request_date: '', status: 'Pendiente', comments: '' });

  const filtered = (changes || []).filter(c => filter === 'all' || c.status === filter);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', change_type: 'scope', impact: '', requested_by: '', request_date: new Date().toISOString().slice(0, 10), status: 'Pendiente', comments: '' });
    setShowModal(true);
  };

  const openEdit = (c: Change) => {
    setEditing(c);
    setForm({ title: c.title, description: c.description || '', change_type: c.change_type, impact: c.impact || '', requested_by: c.requested_by || '', request_date: c.request_date || '', status: c.status, comments: c.comments || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, impact: form.impact || null, requested_by: form.requested_by || null, request_date: form.request_date || null, comments: form.comments || null, project_id: projectId };
      if (editing) {
        await api.patch(`/changes/${editing.id}`, payload);
        toastSuccess('Cambio actualizado');
      } else {
        await api.post(`/changes?project_id=${projectId}`, payload);
        toastSuccess('Cambio creado');
      }
      setShowModal(false);
      refetch();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este cambio?')) return;
    try { await api.delete(`/changes/${id}`); toastSuccess('Cambio eliminado'); refetch(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleExport = () => {
    const token = localStorage.getItem('pmo_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/exports/changes?project_id=${projectId}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cambios_${projectId}.csv`; a.click(); })
      .catch(() => toastError('Error al exportar'));
  };

  const typeLabel: Record<string, string> = { scope: 'Alcance', time: 'Tiempo', cost: 'Costo', resource: 'Recurso' };
  const typeColor: Record<string, string> = {
    scope: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400',
    time: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
    cost: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
    resource: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
  };

  const statusColor: Record<string, string> = {
    Pendiente: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600',
    Aprobado: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600',
    Rechazado: 'bg-red-100 dark:bg-red-950/50 text-red-600',
  };

  if (loading) return <LoadingSpinner />;

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 bg-surface-tertiary p-1 rounded-xl">
          {['all', 'Pendiente', 'Aprobado', 'Rechazado'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${filter === s ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
              {s === 'all' ? 'Todos' : s} {s !== 'all' ? `(${(changes||[]).filter(c=>c.status===s).length})` : `(${(changes||[]).length})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25">
            <Plus className="w-3.5 h-3.5" /> Nuevo Cambio
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 liquid-glass-border rounded-2xl">
          <p className="text-[13px] text-text-tertiary">Sin cambios registrados</p>
        </div>
      ) : (
        <div className="liquid-glass-border rounded-2xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface-tertiary border-b border-border">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Folio</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Titulo</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Solicitado por</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Impacto</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">F. Solicitud</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-border-light hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-text-tertiary font-mono text-[11px]">{c.folio}</td>
                  <td className="px-4 py-3">
                    <p className="text-text-primary font-medium">{c.title}</p>
                    {c.description && <p className="text-[11px] text-text-tertiary mt-0.5 line-clamp-1">{c.description}</p>}
                  </td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeColor[c.change_type] || 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400'}`}>{typeLabel[c.change_type] || c.change_type}</span></td>
                  <td className="px-4 py-3 text-text-secondary">{c.requested_by || '-'}</td>
                  <td className="px-4 py-3 text-text-secondary text-[12px]">{c.impact || '-'}</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusColor[c.status] || 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400'}`}>{c.status}</span></td>
                  <td className="px-4 py-3 text-text-secondary text-[12px]">{c.request_date || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5 text-text-tertiary" /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors ml-1"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">{editing ? 'Editar Cambio' : 'Nuevo Cambio'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div><label className={labelCls}>Titulo *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Descripcion</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Tipo de Cambio</label>
                  <select value={form.change_type} onChange={e => setForm({...form, change_type: e.target.value})} className={inputCls}>
                    <option value="scope">Alcance</option>
                    <option value="time">Tiempo</option>
                    <option value="cost">Costo</option>
                    <option value="resource">Recurso</option>
                  </select>
                </div>
                <div><label className={labelCls}>Estado</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>Solicitado por</label><input value={form.requested_by} onChange={e => setForm({...form, requested_by: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Impacto</label><textarea value={form.impact} onChange={e => setForm({...form, impact: e.target.value})} rows={2} className={inputCls} placeholder="Describe el impacto del cambio..." /></div>
              <div className="grid grid-cols-1 gap-4">
                <div><label className={labelCls}>F. Solicitud</label><input type="date" value={form.request_date} onChange={e => setForm({...form, request_date: e.target.value})} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Comentarios</label><textarea value={form.comments} onChange={e => setForm({...form, comments: e.target.value})} rows={2} className={inputCls} /></div>
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
