import { useState } from 'react';
import { Plus, X, Download, Edit2, Trash2 } from 'lucide-react';
import { api, API_BASE_URL } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import type { Risk } from '../../types';

export default function ProjectRisksTab({ projectId }: { projectId: number }) {
  const { toastSuccess, toastError } = useToast();
  const { data: risks, loading, refetch } = useApi(() => api.get<Risk[]>(`/risks?project_id=${projectId}`), [projectId]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Risk | null>(null);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Técnico', probability: 3, impact: 3, mitigation_strategy: '', status: 'Abierto', identification_date: '', deadline: '' });

  const filtered = (risks || []).filter(r => filter === 'all' || r.status === filter);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', category: 'Técnico', probability: 3, impact: 3, mitigation_strategy: '', status: 'Abierto', identification_date: new Date().toISOString().slice(0,10), deadline: '' });
    setShowModal(true);
  };

  const openEdit = (r: Risk) => {
    setEditing(r);
    setForm({ title: r.title, description: r.description || '', category: r.category || 'Técnico', probability: r.probability, impact: r.impact, mitigation_strategy: r.mitigation_strategy || '', status: r.status, identification_date: r.identification_date || '', deadline: r.deadline || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, identification_date: form.identification_date || null, deadline: form.deadline || null, project_id: projectId };
      if (editing) {
        await api.patch(`/risks/${editing.id}`, payload);
        toastSuccess('Riesgo actualizado');
      } else {
        await api.post(`/risks?project_id=${projectId}`, payload);
        toastSuccess('Riesgo creado');
      }
      setShowModal(false);
      refetch();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este riesgo?')) return;
    try { await api.delete(`/risks/${id}`); toastSuccess('Riesgo eliminado'); refetch(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleExport = () => {
    const token = localStorage.getItem('pmo_token');
    const url = `${API_BASE_URL}/exports/risks?project_id=${projectId}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `riesgos_${projectId}.csv`; a.click(); })
      .catch(() => toastError('Error al exportar'));
  };

  const severityColor = (s: number) => s >= 15 ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400' : s >= 8 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400';

  if (loading) return <LoadingSpinner />;

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 bg-surface-tertiary p-1 rounded-xl">
          {['all', 'Abierto', 'Mitigado', 'Cerrado'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${filter === s ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
              {s === 'all' ? 'Todos' : s} {s !== 'all' ? `(${(risks||[]).filter(r=>r.status===s).length})` : `(${(risks||[]).length})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25">
            <Plus className="w-3.5 h-3.5" /> Nuevo Riesgo
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 liquid-glass-border rounded-2xl">
          <p className="text-[13px] text-text-tertiary">Sin riesgos registrados</p>
        </div>
      ) : (
        <div className="liquid-glass-border rounded-2xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface-tertiary border-b border-border">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Folio</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Categoría</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">P</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">I</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Severidad</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-border-light hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-text-tertiary font-mono text-[11px]">{r.folio}</td>
                  <td className="px-4 py-3 text-text-primary font-medium">{r.title}</td>
                  <td className="px-4 py-3 text-text-secondary">{r.category || '-'}</td>
                  <td className="px-4 py-3 text-center text-text-secondary">{r.probability}</td>
                  <td className="px-4 py-3 text-center text-text-secondary">{r.impact}</td>
                  <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${severityColor(r.severity)}`}>{r.severity}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${r.status==='Abierto'?'bg-red-100 dark:bg-red-950/50 text-red-600':r.status==='Mitigado'?'bg-amber-100 dark:bg-amber-950/50 text-amber-600':'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600'}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5 text-text-tertiary" /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors ml-1"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
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
              <h3 className="text-[15px] font-bold text-text-primary">{editing ? 'Editar Riesgo' : 'Nuevo Riesgo'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div><label className={labelCls}>Título *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Descripción</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className={inputCls} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Categoría</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inputCls}>
                    {['Técnico', 'Financiero', 'Organizacional', 'Externo', 'Legal'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Probabilidad (1-5)</label><input type="number" min={1} max={5} value={form.probability} onChange={e => setForm({...form, probability: Number(e.target.value)})} className={inputCls} /></div>
                <div><label className={labelCls}>Impacto (1-5)</label><input type="number" min={1} max={5} value={form.impact} onChange={e => setForm({...form, impact: Number(e.target.value)})} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Estrategia de Mitigación</label><textarea value={form.mitigation_strategy} onChange={e => setForm({...form, mitigation_strategy: e.target.value})} rows={2} className={inputCls} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Estado</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}>
                    {['Abierto', 'Mitigado', 'Cerrado'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>F. Identificación</label><input type="date" value={form.identification_date} onChange={e => setForm({...form, identification_date: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>F. Límite</label><input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} className={inputCls} /></div>
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
