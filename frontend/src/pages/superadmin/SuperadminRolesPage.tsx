import { useMemo, useState } from 'react';
import { Shield, Plus, Edit2, Trash2, Lock } from 'lucide-react';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import PageHeader from '../../components/common/PageHeader';
import { useToast } from '../../context/ToastContext';
import { superadminApi, type PlatformRole } from '../../services/superadmin';

interface RoleFormState {
  name: string;
  description: string;
  permission_ids: number[];
}

const emptyRoleForm: RoleFormState = { name: '', description: '', permission_ids: [] };

export default function SuperadminRolesPage() {
  const { toastSuccess, toastError } = useToast();
  const [formMode, setFormMode] = useState<false | 'create' | PlatformRole>(false);
  const [form, setForm] = useState<RoleFormState>({ ...emptyRoleForm });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const rolesApi = useApi(() => superadminApi.listRoles(), []);
  const permsApi = useApi(() => superadminApi.listPermissions(), []);

  const roles = rolesApi.data || [];
  const perms = useMemo(() => permsApi.data || [], [permsApi.data]);

  // Group permissions by module for nicer display
  const permsByModule = useMemo(() => {
    const map = new Map<string, typeof perms>();
    for (const p of perms) {
      const arr = map.get(p.module) || [];
      arr.push(p);
      map.set(p.module, arr);
    }
    return map;
  }, [perms]);

  function openCreate() {
    setForm({ ...emptyRoleForm });
    setFormError('');
    setFormMode('create');
  }

  function openEdit(r: PlatformRole) {
    setForm({
      name: r.name,
      description: r.description || '',
      permission_ids: r.permission_ids,
    });
    setFormError('');
    setFormMode(r);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (formMode === 'create') {
        await superadminApi.createRole({
          name: form.name,
          description: form.description || null,
          permission_ids: form.permission_ids,
        });
        toastSuccess('Rol creado');
      } else if (typeof formMode === 'object') {
        await superadminApi.updateRole(formMode.id, {
          name: form.name,
          description: form.description || null,
          permission_ids: form.permission_ids,
        });
        toastSuccess('Rol actualizado');
      }
      setFormMode(false);
      rolesApi.refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: PlatformRole) {
    if (r.is_system) {
      toastError('No puedes eliminar un rol del sistema');
      return;
    }
    if (r.user_count > 0) {
      if (!window.confirm(`El rol "${r.name}" está asignado a ${r.user_count} usuario(s). ¿Eliminar de todas formas?`)) return;
    } else if (!window.confirm(`¿Eliminar el rol "${r.name}"?`)) return;
    try {
      await superadminApi.deleteRole(r.id);
      toastSuccess('Rol eliminado');
      rolesApi.refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  if (rolesApi.loading || permsApi.loading) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumb={[{ label: 'Super Admin', href: '/superadmin' }, { label: 'Roles' }]} title="Roles" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Super Admin', href: '/superadmin' }, { label: 'Roles' }]}
        title="Roles"
        subtitle="Roles compartidos por todos los tenants"
      >
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gradient text-white text-[13px] font-medium shadow-lg shadow-accent/20"
        >
          <Plus className="w-4 h-4" /> Nuevo rol
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {roles.map(r => (
          <div key={r.id} className="liquid-glass-border rounded-2xl p-5 card-glow">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-[14px] font-medium text-text-primary">{r.name}</h3>
                  {r.is_system && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg mt-0.5">
                      <Lock className="w-3 h-3" /> Sistema
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(r)} title="Editar"
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-indigo-400 hover:bg-indigo-500/10">
                  <Edit2 className="w-4 h-4" />
                </button>
                {!r.is_system && (
                  <button onClick={() => remove(r)} title="Eliminar"
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {r.description && <p className="text-[12px] text-text-tertiary mb-3">{r.description}</p>}
            <div className="flex items-center justify-between pt-3 border-t border-border-light">
              <span className="text-[11px] text-text-tertiary">
                {r.permission_ids.length} permisos
              </span>
              <span className="text-[11px] text-text-tertiary">
                {r.user_count} usuario(s)
              </span>
            </div>
          </div>
        ))}
      </div>
      {roles.length === 0 && (
        <div className="text-center py-16 liquid-glass-border rounded-2xl">
          <Shield className="w-10 h-10 mx-auto mb-2 opacity-40 text-text-tertiary" />
          <p className="text-[13px] text-text-tertiary">Aún no hay roles.</p>
        </div>
      )}

      {/* Modal */}
      {formMode !== false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <h2 className="text-[16px] font-medium text-text-primary mb-5">
              {formMode === 'create' ? 'Nuevo rol' : `Editar rol "${formMode.name}"`}
            </h2>
            {formError && <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-400 text-[12px]">{formError}</div>}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-[11px] text-text-tertiary mb-1">Nombre *</label>
                <input required value={form.name}
                  disabled={typeof formMode === 'object' && formMode.is_system}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px] disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-[11px] text-text-tertiary mb-1">Descripción</label>
                <input value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-secondary border border-border text-[13px]" />
              </div>

              <div>
                <label className="block text-[11px] text-text-tertiary mb-2 uppercase tracking-widest">Permisos</label>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {[...permsByModule.entries()].map(([module, list]) => (
                    <div key={module} className="border border-border-light rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[12px] font-medium text-text-primary capitalize">{module}</h4>
                        <button type="button"
                          onClick={() => {
                            const all = list.map(p => p.id);
                            const anyUnchecked = all.some(id => !form.permission_ids.includes(id));
                            setForm(f => ({
                              ...f,
                              permission_ids: anyUnchecked
                                ? [...new Set([...f.permission_ids, ...all])]
                                : f.permission_ids.filter(id => !all.includes(id)),
                            }));
                          }}
                          className="text-[11px] text-accent hover:underline">
                          {list.every(p => form.permission_ids.includes(p.id)) ? 'Ninguno' : 'Todos'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {list.map(p => {
                          const selected = form.permission_ids.includes(p.id);
                          return (
                            <button type="button" key={p.id}
                              onClick={() => setForm(f => ({
                                ...f,
                                permission_ids: selected ? f.permission_ids.filter(x => x !== p.id) : [...f.permission_ids, p.id],
                              }))}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                                selected ? 'bg-accent/20 text-accent border-accent/30' : 'border-border text-text-secondary hover:bg-surface-hover'
                              }`}>
                              {p.action}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {permsByModule.size === 0 && (
                    <p className="text-[12px] text-text-tertiary">No hay permisos definidos en la plataforma.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setFormMode(false)}
                  className="px-4 py-2 rounded-xl border border-border text-[13px] text-text-secondary hover:bg-surface-hover">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 rounded-xl btn-gradient text-white text-[13px] font-medium disabled:opacity-50">
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
