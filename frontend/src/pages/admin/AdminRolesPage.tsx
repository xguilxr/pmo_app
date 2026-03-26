import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Edit2, Plus, X, Check } from 'lucide-react';

interface RoleItem {
  id: number;
  name: string;
  description: string;
  isSystem: boolean;
  usersCount: number;
  permissions: Record<string, string[]>;
}

const modules = ['projects', 'risks', 'issues', 'changes', 'documents', 'lessons', 'minutes', 'admin', 'requests'];
const actions = ['view', 'create', 'edit', 'delete'];

const mockRoles: RoleItem[] = [
  { id: 1, name: 'Administrador', description: 'Acceso total al sistema', isSystem: true, usersCount: 1, permissions: Object.fromEntries(modules.map(m => [m, [...actions]])) },
  { id: 2, name: 'PMO Manager', description: 'Gestión del portafolio de proyectos', isSystem: true, usersCount: 1, permissions: Object.fromEntries(modules.map(m => [m, ['view', 'create', 'edit']])) },
  { id: 3, name: 'Project Manager', description: 'Gestión de proyectos asignados', isSystem: true, usersCount: 2, permissions: Object.fromEntries(modules.filter(m => m !== 'admin').map(m => [m, [...actions]])) },
  { id: 4, name: 'Viewer', description: 'Solo lectura', isSystem: true, usersCount: 1, permissions: Object.fromEntries(modules.map(m => [m, ['view']])) },
];

export default function AdminRolesPage() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<RoleItem[]>(mockRoles);
  const [editing, setEditing] = useState<RoleItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', permissions: {} as Record<string, string[]> });

  const openEdit = (role: RoleItem) => {
    setEditing(role);
    setForm({ name: role.name, description: role.description, permissions: JSON.parse(JSON.stringify(role.permissions)) });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', permissions: Object.fromEntries(modules.map(m => [m, []])) });
    setShowModal(true);
  };

  const togglePermission = (mod: string, action: string) => {
    const current = form.permissions[mod] || [];
    const updated = current.includes(action) ? current.filter(a => a !== action) : [...current, action];
    setForm({ ...form, permissions: { ...form.permissions, [mod]: updated } });
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      setRoles(roles.map(r => r.id === editing.id ? { ...r, name: form.name, description: form.description, permissions: form.permissions } : r));
    } else {
      setRoles([...roles, { id: Date.now(), name: form.name, description: form.description, isSystem: false, usersCount: 0, permissions: form.permissions }]);
    }
    setShowModal(false);
  };

  const actionLabels: Record<string, string> = { view: 'Ver', create: 'Crear', edit: 'Editar', delete: 'Eliminar' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('admin.rolesTitle')}</h2>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          {t('admin.newRole')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map(role => (
          <div key={role.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{role.name}</h3>
                  <p className="text-xs text-gray-500">{role.description}</p>
                </div>
              </div>
              <button onClick={() => openEdit(role)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
              <span>{role.usersCount} {t('admin.usersAssigned')}</span>
              {role.isSystem && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{t('admin.systemRole')}</span>}
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(role.permissions).map(([mod, acts]) =>
                acts.length > 0 && (
                  <span key={mod} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                    {mod}: {acts.length === 4 ? t('admin.full') : acts.join(', ')}
                  </span>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('admin.editRole') : t('admin.newRole')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.roleName')}</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.description')}</label>
                  <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.permissions')}</label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">{t('admin.module')}</th>
                        {actions.map(a => <th key={a} className="text-center px-3 py-2 font-medium text-gray-500">{actionLabels[a]}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {modules.map(mod => (
                        <tr key={mod} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-700 capitalize">{mod}</td>
                          {actions.map(action => (
                            <td key={action} className="text-center px-3 py-2">
                              <button type="button" onClick={() => togglePermission(mod, action)} className={`w-5 h-5 rounded border flex items-center justify-center ${(form.permissions[mod] || []).includes(action) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'}`}>
                                {(form.permissions[mod] || []).includes(action) && <Check className="w-3 h-3 text-white" />}
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">{t('common.cancel')}</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
