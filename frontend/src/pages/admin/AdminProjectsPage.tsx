import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Search, FolderKanban, Building2, Layers } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner, ErrorMessage } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import PhaseBadge from '../../components/common/PhaseBadge';
import HealthBadge from '../../components/common/HealthBadge';
import ProgressBar from '../../components/common/ProgressBar';

interface ProjectItem {
  id: number;
  folio: string;
  name: string;
  type: string | null;
  priority: string | null;
  company: string;
  phase: string;
  progress: number;
  planned_progress: number;
  budget: number;
  health: string;
  start_date: string | null;
  end_date: string | null;
  program_id: number | null;
  program_name: string | null;
}

interface OrgOption { id: number; name: string; }
interface ProgramOption { id: number; name: string; organization_id: number; }

const PROJECT_TYPES = ['Tecnología', 'Digital', 'Procesos', 'Infraestructura', 'Regulatorio'];
const PRIORITIES = ['Alta', 'Media', 'Baja'];
const PHASES = ['Planificación', 'Ejecución', 'Soporte', 'Cerrado'];

function formatMXN(v: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);
}

export default function AdminProjectsPage() {
  const { toastSuccess, toastError } = useToast();
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProjectItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', type: PROJECT_TYPES[0], priority: 'Media', phase: 'Planificación',
    health: 'green', organization_id: 0, program_id: 0,
    start_date: '', end_date: '', budget: 0,
  });

  const { data: projects, loading, error, refetch } = useApi(
    () => api.get<ProjectItem[]>('/projects'),
    []
  );

  const { data: orgs } = useApi(() => api.get<OrgOption[]>('/organizations'), []);
  const { data: programs } = useApi(
    () => form.organization_id ? api.get<ProgramOption[]>(`/programs?organization_id=${form.organization_id}`) : Promise.resolve([]),
    [form.organization_id]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', type: PROJECT_TYPES[0], priority: 'Media', phase: 'Planificación', health: 'green', organization_id: 0, program_id: 0, start_date: '', end_date: '', budget: 0 });
    setShowModal(true);
  };

  const openEdit = (p: ProjectItem) => {
    setEditing(p);
    const org = (orgs || []).find(o => o.name === p.company);
    setForm({
      name: p.name, type: p.type || PROJECT_TYPES[0], priority: p.priority || 'Media',
      phase: p.phase, health: p.health || 'green',
      organization_id: org?.id || 0, program_id: p.program_id || 0,
      start_date: p.start_date || '', end_date: p.end_date || '', budget: p.budget,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.organization_id) {
      toastError('Nombre y organización son requeridos');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/projects/${editing.id}`, {
          name: form.name, type: form.type, priority: form.priority,
          phase: form.phase, health: form.health,
          organization_id: form.organization_id,
          program_id: form.program_id || null,
          start_date: form.start_date || null, end_date: form.end_date || null,
          budget: form.budget,
        });
        toastSuccess('Proyecto actualizado');
      } else {
        await api.post('/projects', {
          name: form.name, type: form.type, priority: form.priority,
          organization_id: form.organization_id,
          program_id: form.program_id || null,
          start_date: form.start_date || null, end_date: form.end_date || null,
          budget: form.budget,
        });
        toastSuccess('Proyecto creado');
      }
      setShowModal(false);
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al guardar');
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/projects/${deleteTarget.id}`);
      toastSuccess(`Proyecto "${deleteTarget.name}" eliminado`);
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al eliminar');
    }
    setDeleteTarget(null);
  };

  const filtered = (projects || []).filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.folio.toLowerCase().includes(search.toLowerCase()) && !p.company.toLowerCase().includes(search.toLowerCase())) return false;
    if (phaseFilter && p.phase !== phaseFilter) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;
  if (error && !(projects || []).length) return <ErrorMessage message={error} onRetry={refetch} />;

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Gestión de Proyectos</h2>
          <p className="text-[13px] text-text-tertiary mt-0.5">{filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-[13px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25">
          <Plus className="w-4 h-4" /> Nuevo Proyecto
        </button>
      </div>

      {/* Filters */}
      <div className="liquid-glass-border rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, folio o empresa..." className={`${inputCls} pl-9`} />
        </div>
        <select value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)} className={`${inputCls} w-40`}>
          <option value="">Todas las fases</option>
          {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="liquid-glass-border rounded-2xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-surface-tertiary border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Folio</th>
              <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Empresa</th>
              <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Programa</th>
              <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Fase</th>
              <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Salud</th>
              <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider w-28">Avance</th>
              <th className="text-right px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Presupuesto</th>
              <th className="text-right px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-text-tertiary">Sin proyectos</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-surface-hover transition-colors">
                <td className="px-4 py-3 font-mono text-[11px] text-text-tertiary">{p.folio}</td>
                <td className="px-4 py-3 font-medium text-text-primary">{p.name}</td>
                <td className="px-4 py-3 text-text-secondary">{p.company}</td>
                <td className="px-4 py-3 text-text-secondary text-[12px]">{p.program_name || '-'}</td>
                <td className="px-4 py-3"><PhaseBadge phase={p.phase} /></td>
                <td className="px-4 py-3"><HealthBadge health={(p.health || 'green') as 'green' | 'yellow' | 'red'} /></td>
                <td className="px-4 py-3"><ProgressBar value={p.progress} planned={p.planned_progress} /></td>
                <td className="px-4 py-3 text-right text-text-secondary font-medium">{formatMXN(p.budget)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-0.5">
                    <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-surface-tertiary rounded-lg"><Edit2 className="w-3.5 h-3.5 text-text-tertiary" /></button>
                    <button onClick={() => setDeleteTarget(p)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">{editing ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={labelCls}>Nombre *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Organización *</label>
                  <select value={form.organization_id} onChange={e => setForm({...form, organization_id: Number(e.target.value), program_id: 0})} className={inputCls}>
                    <option value={0}>-- Seleccionar --</option>
                    {(orgs || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Programa</label>
                  <select value={form.program_id} onChange={e => setForm({...form, program_id: Number(e.target.value)})} className={inputCls}>
                    <option value={0}>Sin programa</option>
                    {(programs || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Tipo</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputCls}>{PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className={labelCls}>Prioridad</label><select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className={inputCls}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
                {editing && <div><label className={labelCls}>Fase</label><select value={form.phase} onChange={e => setForm({...form, phase: e.target.value})} className={inputCls}>{PHASES.map(p => <option key={p}>{p}</option>)}</select></div>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Fecha Inicio</label><input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Fecha Fin</label><input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Presupuesto</label><input type="number" min="0" step="1000" value={form.budget} onChange={e => setForm({...form, budget: Number(e.target.value)})} className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-[13px] font-semibold btn-glow text-white rounded-xl shadow-sm shadow-accent/25 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-sm animate-fade-in p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-[15px] font-bold text-text-primary">Eliminar Proyecto</h3>
            </div>
            <p className="text-[13px] text-text-secondary mb-1">¿Estás seguro de eliminar el proyecto:</p>
            <p className="text-[13px] font-semibold text-text-primary mb-1">{deleteTarget.name}</p>
            <p className="text-[12px] text-text-tertiary mb-5">Folio: {deleteTarget.folio} · {deleteTarget.company}</p>
            <p className="text-[12px] text-red-500 mb-5">Se eliminarán todas las tareas, riesgos, incidencias, cambios, documentos y demás registros asociados.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">Cancelar</button>
              <button onClick={confirmDelete} className="px-5 py-2.5 text-[13px] font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-sm">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
