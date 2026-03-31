import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, X, FolderKanban } from 'lucide-react';

interface ProjectType {
  id: number;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  projectsCount: number;
}

const colorOptions = [
  { label: 'Azul', value: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
  { label: 'Verde', value: 'green', bg: 'bg-green-100', text: 'text-green-700' },
  { label: 'Morado', value: 'purple', bg: 'bg-purple-100', text: 'text-purple-700' },
  { label: 'Naranja', value: 'orange', bg: 'bg-orange-100', text: 'text-orange-700' },
  { label: 'Rojo', value: 'red', bg: 'bg-red-100', text: 'text-red-700' },
  { label: 'Amarillo', value: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  { label: 'Cyan', value: 'cyan', bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { label: 'Rosa', value: 'pink', bg: 'bg-pink-100', text: 'text-pink-700' },
];

function getColorClasses(color: string) {
  return colorOptions.find((c) => c.value === color) || colorOptions[0];
}

const mockTypes: ProjectType[] = [
  { id: 1, name: 'Tecnología', description: 'Proyectos de desarrollo tecnológico y sistemas', color: 'blue', isActive: true, projectsCount: 4 },
  { id: 2, name: 'Digital', description: 'Transformación digital y canales digitales', color: 'purple', isActive: true, projectsCount: 3 },
  { id: 3, name: 'Procesos', description: 'Mejora y reingeniería de procesos', color: 'green', isActive: true, projectsCount: 2 },
  { id: 4, name: 'Infraestructura', description: 'Proyectos de infraestructura física y TI', color: 'orange', isActive: true, projectsCount: 1 },
  { id: 5, name: 'Regulatorio', description: 'Cumplimiento normativo y regulatorio', color: 'red', isActive: true, projectsCount: 1 },
];

export default function AdminProjectTypesPage() {
  const { t } = useTranslation();
  const [types, setTypes] = useState<ProjectType[]>(mockTypes);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProjectType | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: 'blue' });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', color: 'blue' });
    setShowModal(true);
  };

  const openEdit = (item: ProjectType) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description, color: item.color });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      setTypes(types.map((t) => (t.id === editing.id ? { ...t, name: form.name, description: form.description, color: form.color } : t)));
    } else {
      setTypes([...types, { id: Date.now(), name: form.name, description: form.description, color: form.color, isActive: true, projectsCount: 0 }]);
    }
    setShowModal(false);
  };

  const toggleActive = (id: number) => {
    setTypes(types.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('admin.projectTypesTitle')}</h2>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          {t('admin.newType')}
        </button>
      </div>

      <div className="liquid-glass-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.typeName')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.typeDescription')}</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">{t('admin.typeColor')}</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">{t('admin.active')}</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">{t('projects.title')}</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {types.map((item) => {
              const cc = getColorClasses(item.color);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-gray-400" />
                      {item.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.description}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${cc.bg} ${cc.text}`}>
                      {item.color}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(item.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${item.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${item.isActive ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.projectsCount}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openEdit(item)} className="p-1 hover:bg-gray-100 rounded">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="liquid-modal rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('admin.editType') : t('admin.newType')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.typeName')}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.typeDescription')}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.typeColor')}</label>
                <select
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {colorOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
