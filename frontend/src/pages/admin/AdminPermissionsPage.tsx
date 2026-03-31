import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Save, Plus } from 'lucide-react';

const roles = ['Administrador', 'PMO Manager', 'Project Manager', 'Viewer'];

const modules = [
  'Dashboard',
  'Empresas',
  'Solicitudes',
  'Proyectos',
  'Riesgos',
  'Incidencias',
  'Cambios',
  'AIDs',
  'Documentos',
  'Minutas',
  'Lecciones',
  'Usuarios',
  'Reportes',
];

const actions = ['view', 'create', 'edit', 'delete', 'approve'] as const;
type Action = (typeof actions)[number];

type PermissionMatrix = Record<string, Record<string, boolean>>;


function buildDefaultPermissions(role: string): PermissionMatrix {
  const matrix: PermissionMatrix = {};
  for (const mod of modules) {
    matrix[mod] = {};
    for (const action of actions) {
      if (role === 'Administrador') {
        matrix[mod][action] = true;
      } else if (role === 'Viewer') {
        matrix[mod][action] = action === 'view';
      } else if (role === 'PMO Manager') {
        matrix[mod][action] = action !== 'delete';
      } else if (role === 'Project Manager') {
        if (mod === 'Usuarios') {
          matrix[mod][action] = action === 'view';
        } else {
          matrix[mod][action] = action !== 'approve';
        }
      }
    }
  }
  return matrix;
}

const allPermissions: Record<string, PermissionMatrix> = {};
for (const role of roles) {
  allPermissions[role] = buildDefaultPermissions(role);
}

export default function AdminPermissionsPage() {
  const { t } = useTranslation();
  const isAdmin = true; // mock as true

  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [permissions, setPermissions] = useState<Record<string, PermissionMatrix>>(
    JSON.parse(JSON.stringify(allPermissions))
  );

  const currentMatrix = permissions[selectedRole];

  const togglePermission = (mod: string, action: Action) => {
    if (!isAdmin) return;
    setPermissions((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[selectedRole][mod][action] = !next[selectedRole][mod][action];
      return next;
    });
  };

  const actionLabels: Record<string, string> = {
    view: t('admin.view'),
    create: t('admin.create'),
    edit: t('common.edit'),
    delete: t('common.delete'),
    approve: t('admin.approve'),
  };

  const handleSave = () => {
    // Mock save
    alert('Permisos guardados correctamente');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('admin.permissionsTitle')}</h2>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          {t('admin.newRole')}
        </button>
      </div>

      <div className="liquid-glass-border rounded-xl p-5">
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.selectRole')}</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.module')}</th>
                {actions.map((a) => (
                  <th key={a} className="text-center px-3 py-3 font-medium text-gray-500">
                    {actionLabels[a]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {modules.map((mod) => (
                <tr key={mod} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{mod}</td>
                  {actions.map((action) => (
                    <td key={action} className="text-center px-3 py-2.5">
                      <button
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => togglePermission(mod, action)}
                        className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${
                          currentMatrix[mod][action]
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 hover:border-blue-400'
                        } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {currentMatrix[mod][action] && <Check className="w-3 h-3 text-white" />}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-5">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
