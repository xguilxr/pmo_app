import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, User, X } from 'lucide-react';

interface Area {
  id: number;
  name: string;
  description: string;
  roleInProject: string;
  responsibleName: string;
}

const mockAreas: Record<number, Area[]> = {
  1: [
    { id: 1, name: 'Direcci\u00f3n de Proyecto', description: 'Gesti\u00f3n y seguimiento del proyecto', roleInProject: 'Sponsor', responsibleName: 'Administrador PMO' },
    { id: 2, name: 'Desarrollo', description: 'Equipo de desarrollo t\u00e9cnico', roleInProject: 'L\u00edder T\u00e9cnico', responsibleName: 'Juan Garc\u00eda L\u00f3pez' },
    { id: 3, name: 'QA / Pruebas', description: 'Control de calidad y testing', roleInProject: 'QA Lead', responsibleName: 'Mar\u00eda Rodr\u00edguez S\u00e1nchez' },
    { id: 4, name: 'Infraestructura', description: 'Servidores, redes y ambientes', roleInProject: 'Arquitecto', responsibleName: 'Juan Garc\u00eda L\u00f3pez' },
    { id: 5, name: 'Negocio', description: 'An\u00e1lisis de requerimientos y validaci\u00f3n', roleInProject: 'Analista de Negocio', responsibleName: 'Mar\u00eda Rodr\u00edguez S\u00e1nchez' },
  ],
  2: [
    { id: 6, name: 'Dise\u00f1o UX/UI', description: 'Dise\u00f1o de experiencia de usuario', roleInProject: 'Dise\u00f1ador Lead', responsibleName: 'Mar\u00eda Rodr\u00edguez S\u00e1nchez' },
    { id: 7, name: 'Backend', description: 'Desarrollo de servicios y APIs', roleInProject: 'Desarrollador Sr.', responsibleName: 'Juan Garc\u00eda L\u00f3pez' },
    { id: 8, name: 'Frontend', description: 'Desarrollo de interfaz de usuario', roleInProject: 'Desarrollador Frontend', responsibleName: 'Mar\u00eda Rodr\u00edguez S\u00e1nchez' },
  ],
};

const defaultAreas: Area[] = [
  { id: 100, name: 'Direcci\u00f3n de Proyecto', description: 'Gesti\u00f3n general', roleInProject: 'Project Manager', responsibleName: 'Sin asignar' },
];

export default function ProjectAreasTab({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  const [areas, setAreas] = useState<Area[]>(mockAreas[projectId] || defaultAreas);
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [form, setForm] = useState({ name: '', description: '', roleInProject: '', responsibleName: '' });

  const openCreate = () => {
    setEditingArea(null);
    setForm({ name: '', description: '', roleInProject: '', responsibleName: '' });
    setShowModal(true);
  };

  const openEdit = (area: Area) => {
    setEditingArea(area);
    setForm({ name: area.name, description: area.description, roleInProject: area.roleInProject, responsibleName: area.responsibleName });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingArea) {
      setAreas(areas.map(a => a.id === editingArea.id ? { ...a, ...form } : a));
    } else {
      setAreas([...areas, { id: Date.now(), ...form }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    setAreas(areas.filter(a => a.id !== id));
  };

  const roleColors: Record<string, string> = {
    'Sponsor': 'bg-purple-100 text-purple-700 border-purple-200',
    'L\u00edder T\u00e9cnico': 'bg-blue-100 text-blue-700 border-blue-200',
    'QA Lead': 'bg-green-100 text-green-700 border-green-200',
    'Arquitecto': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Analista de Negocio': 'bg-amber-100 text-amber-700 border-amber-200',
    'Dise\u00f1ador Lead': 'bg-pink-100 text-pink-700 border-pink-200',
    'Desarrollador Sr.': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'Desarrollador Frontend': 'bg-teal-100 text-teal-700 border-teal-200',
    'Project Manager': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">{t('projectDetail.orgChart')}</h3>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          {t('projectDetail.addArea')}
        </button>
      </div>

      {/* Org chart visual */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas.map(area => (
          <div key={area.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-semibold text-gray-900">{area.name}</h4>
              <div className="flex gap-1">
                <button onClick={() => openEdit(area)} className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button onClick={() => handleDelete(area.id)} className="p-1 hover:bg-red-50 rounded transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3">{area.description}</p>
            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${roleColors[area.roleInProject] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
              {area.roleInProject}
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">{area.responsibleName}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingArea ? t('projectDetail.editArea') : t('projectDetail.addArea')}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.areaName')}</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: Desarrollo, QA, Infraestructura..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.areaDescription')}</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.roleInProject')}</label>
                <input value={form.roleInProject} onChange={e => setForm({...form, roleInProject: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: L\u00edder T\u00e9cnico, Sponsor, QA Lead..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.responsible')}</label>
                <input value={form.responsibleName} onChange={e => setForm({...form, responsibleName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Nombre del responsable" />
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
