import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Search, Layers } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner, ErrorMessage } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

interface ProgramItem {
  id: number;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  organization_id: number;
  project_count: number;
  created_at: string;
}

interface OrgOption { id: number; name: string; }

export default function AdminProgramsPage() {
  const { toastSuccess, toastError } = useToast();
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProgramItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProgramItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', status: 'active',
    organization_id: 0, start_date: '', end_date: '',
  });

  const { data: orgs } = useApi(() => api.get<OrgOption[]>('/organizations'), []);
  const { data: programs, loading, error, refetch } = useApi(
    () => api.get<ProgramItem[]>(orgFilter ? `/programs?organization_id=${orgFilter}` : '/programs'),
    [orgFilter]
  );

  const orgName = (orgId: number) => (orgs || []).find(o => o.id === orgId)?.name || '-';

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', status: 'active', organization_id: orgFilter || 0, start_date: '', end_date: '' });
    setShowModal(true);
  };

  const openEdit = (p: ProgramItem) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || '', status: p.status,
      organization_id: p.organization_id, start_date: p.start_date || '', end_date: p.end_date || '',
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
        await api.patch(`/programs/${editing.id}`, {
          name: form.name, description: form.description || null, status: form.status,
          start_date: form.start_date || null, end_date: form.end_date || null,
        });
        toastSuccess('Programa actualizado');
      } else {
        await api.post('/programs', {
          name: form.name, description: form.description || null, status: form.status,
          organization_id: form.organization_id,
          start_date: form.start_date || null, end_date: form.end_date || null,
        });
        toastSuccess('Programa creado');
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
      await api.delete(`/programs/${deleteTarget.id}`);
      toastSuccess(`Programa "${deleteTarget.name}" eliminado`);
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al eliminar');
    }
    setDeleteTarget(null);
  };

  const filtered = (programs || []).filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;
  if (error && !(programs || []).length) return <ErrorMessage message={error} onRetry={refetch} />;

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Gestión de Programas</h2>
          <p className="text-[13px] text-text-tertiary mt-0.5">{filtered.length} programa{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-[13px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25">
          <Plus className="w-4 h-4" /> Nuevo Programa
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-2xl border border-border p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar programa..." className={`${inputCls} pl-9`} />
        </div>
        <select value={orgFilter} onChange={e => setOrgFilter(Number(e.target.value))} className={`${inputCls} w-48`}>
          <option value={0}>Todas las organizaciones</option>
          {(orgs || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-surface-tertiary border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Organización</th>
              <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Proyectos</th>
              <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">Fechas</th>
              <th className="text-right px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-text-tertiary">Sin programas</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-surface-hover transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-text-primary">{p.name}</p>
                    {p.description && <p className="text-[11px] text-text-tertiary truncate max-w-[200px]">{p.description}</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-secondary">{orgName(p.organization_id)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-surface-tertiary text-text-secondary'}`}>
                    {p.status === 'active' ? 'Activo' : p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text-primary font-medium">{p.project_count}</span>
                  <span className="text-text-tertiary text-[11px] ml-1">proyecto{p.project_count !== 1 ? 's' : ''}</span>
                </td>
                <td className="px-4 py-3 text-[12px] text-text-secondary">
                  {p.start_date || '—'} → {p.end_date || '—'}
                </td>
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
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-2xl w-full max-w-lg border border-border shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">{editing ? 'Editar Programa' : 'Nuevo Programa'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={labelCls}>Nombre *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Descripción</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Organización *</label>
                  <select value={form.organization_id} onChange={e => setForm({...form, organization_id: Number(e.target.value)})} className={inputCls} disabled={!!editing}>
                    <option value={0}>-- Seleccionar --</option>
                    {(orgs || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Estado</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}>
                    <option value="active">Activo</option>
                    <option value="paused">Pausado</option>
                    <option value="closed">Cerrado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Fecha Inicio</label><input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Fecha Fin</label><input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className={inputCls} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-[13px] font-semibold bg-accent text-white rounded-xl hover:bg-accent-hover shadow-sm shadow-accent/25 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-2xl w-full max-w-sm border border-border shadow-2xl animate-fade-in p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-[15px] font-bold text-text-primary">Eliminar Programa</h3>
            </div>
            <p className="text-[13px] text-text-secondary mb-1">¿Estás seguro de eliminar el programa:</p>
            <p className="text-[13px] font-semibold text-text-primary mb-1">{deleteTarget.name}</p>
            <p className="text-[12px] text-text-tertiary mb-3">{orgName(deleteTarget.organization_id)} · {deleteTarget.project_count} proyecto(s)</p>
            {deleteTarget.project_count > 0 && (
              <p className="text-[12px] text-red-500 mb-5">Se eliminarán todos los proyectos y sus registros asociados.</p>
            )}
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
