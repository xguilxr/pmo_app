import { useState } from 'react';
import { Plus, X, Edit2, Trash2, User } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

interface Area {
  id: number;
  name: string;
  description: string | null;
  role_in_project: string | null;
  responsible_id: number | null;
  responsible_name: string | null;
  project_id: number;
  created_at: string;
}

export default function ProjectAreasTab({ projectId }: { projectId: number }) {
  const { toastSuccess, toastError } = useToast();
  const { data: areas, loading, refetch } = useApi(() => api.get<Area[]>(`/projects/${projectId}/areas`), [projectId]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', role_in_project: '', responsible_name: '' });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', role_in_project: '', responsible_name: '' });
    setShowModal(true);
  };

  const openEdit = (area: Area) => {
    setEditing(area);
    setForm({
      name: area.name,
      description: area.description || '',
      role_in_project: area.role_in_project || '',
      responsible_name: area.responsible_name || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        role_in_project: form.role_in_project || null,
        responsible_name: form.responsible_name || null,
      };
      if (editing) {
        await api.patch(`/projects/${projectId}/areas/${editing.id}`, payload);
        toastSuccess('Area actualizada');
      } else {
        await api.post(`/projects/${projectId}/areas`, payload);
        toastSuccess('Area creada');
      }
      setShowModal(false);
      refetch();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta area?')) return;
    try { await api.delete(`/projects/${projectId}/areas/${id}`); toastSuccess('Area eliminada'); refetch(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
  };

  const roleColors: Record<string, string> = {
    'Sponsor': 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400',
    'Líder Técnico': 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
    'QA Lead': 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
    'Arquitecto': 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400',
    'Analista de Negocio': 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
    'Diseñador Lead': 'bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400',
    'Desarrollador Sr.': 'bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400',
    'Desarrollador Frontend': 'bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400',
    'Project Manager': 'bg-surface-tertiary text-text-secondary',
  };

  if (loading) return <LoadingSpinner />;

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-text-secondary">
          {(areas || []).length} {(areas || []).length === 1 ? 'area' : 'areas'} registradas
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25">
          <Plus className="w-3.5 h-3.5" /> Nueva Area
        </button>
      </div>

      {(areas || []).length === 0 ? (
        <div className="text-center py-12 liquid-glass-border rounded-2xl">
          <p className="text-[13px] text-text-tertiary">Sin areas registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(areas || []).map(area => (
            <div key={area.id} className="liquid-glass-border rounded-2xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-[13px] font-semibold text-text-primary">{area.name}</h4>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(area)} className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors">
                    <Edit2 className="w-3.5 h-3.5 text-text-tertiary" />
                  </button>
                  <button onClick={() => handleDelete(area.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              <p className="text-[12px] text-text-secondary mb-3">{area.description || '-'}</p>
              {area.role_in_project && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${roleColors[area.role_in_project] || 'bg-surface-tertiary text-text-secondary'}`}>
                  {area.role_in_project}
                </span>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-light">
                <div className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className="text-[12px] font-medium text-text-secondary">{area.responsible_name || 'Sin asignar'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">{editing ? 'Editar Area' : 'Nueva Area'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div><label className={labelCls}>Nombre *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} placeholder="Ej: Desarrollo, QA, Infraestructura..." /></div>
              <div><label className={labelCls}>Descripcion</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className={inputCls} /></div>
              <div><label className={labelCls}>Rol en el Proyecto</label><input value={form.role_in_project} onChange={e => setForm({...form, role_in_project: e.target.value})} className={inputCls} placeholder="Ej: Líder Técnico, Sponsor, QA Lead..." /></div>
              <div><label className={labelCls}>Responsable</label><input value={form.responsible_name} onChange={e => setForm({...form, responsible_name: e.target.value})} className={inputCls} placeholder="Nombre del responsable" /></div>
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
