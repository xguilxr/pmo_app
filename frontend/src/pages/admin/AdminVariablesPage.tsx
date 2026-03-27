import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, X, Sliders, GripVertical } from 'lucide-react';

interface VariableValue {
  id: number;
  name: string;
  description: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

interface VariableCategory {
  key: string;
  label: string;
  values: VariableValue[];
}

const colorOptions = [
  { label: 'Azul', value: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
  { label: 'Verde', value: 'green', bg: 'bg-green-100', text: 'text-green-700' },
  { label: 'Morado', value: 'purple', bg: 'bg-purple-100', text: 'text-purple-700' },
  { label: 'Naranja', value: 'orange', bg: 'bg-orange-100', text: 'text-orange-700' },
  { label: 'Rojo', value: 'red', bg: 'bg-red-100', text: 'text-red-700' },
  { label: 'Amarillo', value: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  { label: 'Gris', value: 'gray', bg: 'bg-gray-100', text: 'text-gray-700' },
  { label: 'Cyan', value: 'cyan', bg: 'bg-cyan-100', text: 'text-cyan-700' },
];

function getColorClasses(color: string) {
  return colorOptions.find((c) => c.value === color) || colorOptions[0];
}

const mockCategories: VariableCategory[] = [
  {
    key: 'priorities',
    label: 'Prioridades',
    values: [
      { id: 1, name: 'Alta', description: 'Urgente, requiere atención inmediata', color: 'red', sortOrder: 1, isActive: true },
      { id: 2, name: 'Media', description: 'Importante pero no urgente', color: 'yellow', sortOrder: 2, isActive: true },
      { id: 3, name: 'Baja', description: 'Puede esperar', color: 'green', sortOrder: 3, isActive: true },
    ],
  },
  {
    key: 'projectStatuses',
    label: 'Estados de Proyecto',
    values: [
      { id: 10, name: 'En Planificación', description: 'Proyecto en fase de planificación', color: 'blue', sortOrder: 1, isActive: true },
      { id: 11, name: 'En Ejecución', description: 'Proyecto en ejecución activa', color: 'green', sortOrder: 2, isActive: true },
      { id: 12, name: 'En Soporte', description: 'Proyecto en fase de soporte', color: 'purple', sortOrder: 3, isActive: true },
      { id: 13, name: 'Cerrado', description: 'Proyecto finalizado', color: 'gray', sortOrder: 4, isActive: true },
      { id: 14, name: 'Suspendido', description: 'Proyecto suspendido temporalmente', color: 'red', sortOrder: 5, isActive: true },
    ],
  },
  {
    key: 'phases',
    label: 'Fases',
    values: [
      { id: 20, name: 'Inicio', description: 'Fase de inicio del proyecto', color: 'blue', sortOrder: 1, isActive: true },
      { id: 21, name: 'Planificación', description: 'Fase de planificación detallada', color: 'cyan', sortOrder: 2, isActive: true },
      { id: 22, name: 'Ejecución', description: 'Fase de ejecución', color: 'green', sortOrder: 3, isActive: true },
      { id: 23, name: 'Monitoreo y Control', description: 'Seguimiento y control', color: 'yellow', sortOrder: 4, isActive: true },
      { id: 24, name: 'Cierre', description: 'Fase de cierre formal', color: 'gray', sortOrder: 5, isActive: true },
    ],
  },
  {
    key: 'riskCategories',
    label: 'Categorías de Riesgo',
    values: [
      { id: 30, name: 'Técnico', description: 'Riesgos tecnológicos', color: 'blue', sortOrder: 1, isActive: true },
      { id: 31, name: 'Organizacional', description: 'Riesgos de la organización', color: 'purple', sortOrder: 2, isActive: true },
      { id: 32, name: 'Externo', description: 'Riesgos externos', color: 'orange', sortOrder: 3, isActive: true },
      { id: 33, name: 'Gestión de Proyecto', description: 'Riesgos de gestión', color: 'yellow', sortOrder: 4, isActive: true },
    ],
  },
  {
    key: 'changeTypes',
    label: 'Tipos de Cambio',
    values: [
      { id: 40, name: 'Alcance', description: 'Cambio en el alcance del proyecto', color: 'blue', sortOrder: 1, isActive: true },
      { id: 41, name: 'Costo', description: 'Cambio en presupuesto', color: 'red', sortOrder: 2, isActive: true },
      { id: 42, name: 'Cronograma', description: 'Cambio en fechas', color: 'orange', sortOrder: 3, isActive: true },
      { id: 43, name: 'Recurso', description: 'Cambio en recursos asignados', color: 'green', sortOrder: 4, isActive: true },
    ],
  },
  {
    key: 'documentCategories',
    label: 'Categorías de Documento',
    values: [
      { id: 50, name: 'Plan de Proyecto', description: 'Documentos de planificación', color: 'blue', sortOrder: 1, isActive: true },
      { id: 51, name: 'Acta', description: 'Actas y minutas', color: 'green', sortOrder: 2, isActive: true },
      { id: 52, name: 'Reporte', description: 'Reportes de seguimiento', color: 'purple', sortOrder: 3, isActive: true },
      { id: 53, name: 'Contrato', description: 'Documentos contractuales', color: 'gray', sortOrder: 4, isActive: true },
    ],
  },
  {
    key: 'lessonCategories',
    label: 'Categorías de Lección',
    values: [
      { id: 60, name: 'Buena Práctica', description: 'Prácticas exitosas a replicar', color: 'green', sortOrder: 1, isActive: true },
      { id: 61, name: 'Oportunidad de Mejora', description: 'Áreas que pueden mejorarse', color: 'yellow', sortOrder: 2, isActive: true },
      { id: 62, name: 'Error Evitable', description: 'Errores que deben prevenirse', color: 'red', sortOrder: 3, isActive: true },
    ],
  },
];

export default function AdminVariablesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<VariableCategory[]>(mockCategories);
  const [selectedKey, setSelectedKey] = useState(mockCategories[0].key);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<VariableValue | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: 'blue', sortOrder: 1 });

  const selectedCategory = categories.find((c) => c.key === selectedKey)!;

  const openCreate = () => {
    setEditing(null);
    const nextOrder = selectedCategory.values.length > 0 ? Math.max(...selectedCategory.values.map((v) => v.sortOrder)) + 1 : 1;
    setForm({ name: '', description: '', color: 'blue', sortOrder: nextOrder });
    setShowModal(true);
  };

  const openEdit = (item: VariableValue) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description, color: item.color, sortOrder: item.sortOrder });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.key !== selectedKey) return cat;
        if (editing) {
          return {
            ...cat,
            values: cat.values.map((v) =>
              v.id === editing.id ? { ...v, name: form.name, description: form.description, color: form.color, sortOrder: form.sortOrder } : v
            ),
          };
        } else {
          return {
            ...cat,
            values: [...cat.values, { id: Date.now(), name: form.name, description: form.description, color: form.color, sortOrder: form.sortOrder, isActive: true }],
          };
        }
      })
    );
    setShowModal(false);
  };

  const toggleActive = (valueId: number) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.key !== selectedKey) return cat;
        return { ...cat, values: cat.values.map((v) => (v.id === valueId ? { ...v, isActive: !v.isActive } : v)) };
      })
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('admin.variablesTitle')}</h2>
      </div>

      <div className="flex gap-5">
        {/* Left sidebar - categories */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">{t('admin.variableCategory')}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedKey(cat.key)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                    selectedKey === cat.key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="text-xs text-gray-400">{cat.values.length}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel - values */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                {selectedCategory.label} ({selectedCategory.values.length})
              </h3>
              <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                {t('admin.newValue')}
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">{t('admin.variableSort')}</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">{t('admin.variableValue')}</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">{t('admin.typeDescription')}</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-500">{t('admin.typeColor')}</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-500">{t('admin.active')}</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedCategory.values
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((val) => {
                    const cc = getColorClasses(val.color);
                    return (
                      <tr key={val.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-400">
                          <div className="flex items-center gap-1">
                            <GripVertical className="w-3.5 h-3.5" />
                            {val.sortOrder}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{val.name}</td>
                        <td className="px-4 py-2.5 text-gray-600">{val.description}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${cc.bg} ${cc.text}`}>{val.color}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => toggleActive(val.id)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${val.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${val.isActive ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => openEdit(val)} className="p-1 hover:bg-gray-100 rounded">
                            <Edit2 className="w-4 h-4 text-gray-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('admin.editValue') : t('admin.newValue')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.variableValue')}</label>
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
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.variableSort')}</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
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
