import { useState } from 'react';
import { Plus, X, Download, Edit2, Trash2, FileSpreadsheet, FileDown } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import type { BacklogItem } from '../../types';

export default function ProjectBacklogTab({ projectId }: { projectId: number }) {
  const { toastSuccess, toastError } = useToast();
  const { data: items, loading, refetch } = useApi(() => api.get<BacklogItem[]>(`/backlog?project_id=${projectId}`), [projectId]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BacklogItem | null>(null);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', area: '', priority: 'Media', status: 'Pendiente', progress: 0, start_date: '', end_date: '' });

  const filtered = (items || []).filter(i => filter === 'all' || i.status === filter);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', area: '', priority: 'Media', status: 'Pendiente', progress: 0, start_date: '', end_date: '' });
    setShowModal(true);
  };

  const openEdit = (item: BacklogItem) => {
    setEditing(item);
    setForm({ title: item.title, description: item.description || '', area: item.area || '', priority: item.priority || 'Media', status: item.status, progress: item.progress, start_date: item.start_date || '', end_date: item.end_date || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, start_date: form.start_date || null, end_date: form.end_date || null, area: form.area || null, description: form.description || null, project_id: projectId };
      if (editing) {
        await api.patch(`/backlog/${editing.id}`, payload);
        toastSuccess('Elemento actualizado');
      } else {
        await api.post(`/backlog?project_id=${projectId}`, payload);
        toastSuccess('Elemento creado');
      }
      setShowModal(false);
      refetch();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este elemento?')) return;
    try { await api.delete(`/backlog/${id}`); toastSuccess('Eliminado'); refetch(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleExport = () => {
    const token = localStorage.getItem('pmo_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/exports/backlog?project_id=${projectId}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backlog_${projectId}.csv`; a.click(); })
      .catch(() => toastError('Error al exportar'));
  };

  const handleDownloadTemplate = () => {
    const token = localStorage.getItem('pmo_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/exports/backlog-template`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'plantilla_backlog.xlsx'; a.click(); })
      .catch(() => toastError('Error al descargar plantilla'));
  };

  const handleDownloadXlsx = () => {
    const token = localStorage.getItem('pmo_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/exports/project-xlsx?project_id=${projectId}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `proyecto_backlog_raid_${projectId}.xlsx`; a.click(); })
      .catch(() => toastError('Error al descargar'));
  };

  if (loading) return <LoadingSpinner />;

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 bg-surface-tertiary p-1 rounded-xl">
          {['all', 'Pendiente', 'En Progreso', 'Completado', 'Bloqueado'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${filter === s ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
              {s === 'all' ? 'Todos' : s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all"><FileDown className="w-3.5 h-3.5" /> Plantilla</button>
          <button onClick={handleDownloadXlsx} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all"><FileSpreadsheet className="w-3.5 h-3.5" /> XLSX</button>
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all"><Download className="w-3.5 h-3.5" /> CSV</button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25"><Plus className="w-3.5 h-3.5" /> Nuevo</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 liquid-glass-border rounded-2xl"><p className="text-[13px] text-text-tertiary">Sin elementos en el backlog</p></div>
      ) : (
        <div className="liquid-glass-border rounded-2xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface-tertiary border-b border-border">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Folio</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Área</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Prioridad</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider w-32">Avance</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-border-light hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-text-tertiary font-mono text-[11px]">{item.folio}</td>
                  <td className="px-4 py-3 text-text-primary font-medium">{item.title}</td>
                  <td className="px-4 py-3 text-text-secondary">{item.area || '-'}</td>
                  <td className="px-4 py-3"><span className={`text-[11px] font-semibold ${item.priority==='Alta'?'text-red-600':item.priority==='Media'?'text-amber-600':'text-text-tertiary'}`}>{item.priority || '-'}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${item.status==='Completado'?'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600':item.status==='Bloqueado'?'bg-red-100 dark:bg-red-950/50 text-red-600':item.status==='En Progreso'?'bg-blue-100 dark:bg-blue-950/50 text-blue-600':'bg-gray-100 dark:bg-gray-800 text-text-secondary'}`}>{item.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-tertiary rounded-full overflow-hidden"><div className="h-full bg-accent rounded-full" style={{width:`${item.progress}%`}} /></div>
                      <span className="text-[11px] font-semibold text-text-secondary w-8 text-right">{item.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-surface-tertiary rounded-lg"><Edit2 className="w-3.5 h-3.5 text-text-tertiary" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg ml-1"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
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
              <h3 className="text-[15px] font-bold text-text-primary">{editing ? 'Editar Elemento' : 'Nuevo Elemento'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={labelCls}>Título *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Descripción</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className={inputCls} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Área</label><input value={form.area} onChange={e => setForm({...form, area: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Prioridad</label><select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className={inputCls}>{['Alta','Media','Baja'].map(p=><option key={p}>{p}</option>)}</select></div>
                <div><label className={labelCls}>Estado</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}>{['Pendiente','En Progreso','Completado','Bloqueado'].map(s=><option key={s}>{s}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Avance (%)</label><input type="number" min={0} max={100} value={form.progress} onChange={e => setForm({...form, progress: Number(e.target.value)})} className={inputCls} /></div>
                <div><label className={labelCls}>F. Inicio</label><input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>F. Fin</label><input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className={inputCls} /></div>
              </div>
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
