import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, Lightbulb, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';

interface Lesson {
  id: number;
  folio: string;
  title: string;
  description: string;
  category: string;
  projectPhase: string;
  recommendation: string;
  recordedBy: string;
  createdAt: string;
}

const mockLessons: Record<number, Lesson[]> = {
  1: [
    { id: 1, folio: 'LEC-2026-001', title: 'Importancia del change management temprano', description: 'El equipo de usuarios no fue involucrado desde el inicio, lo que causó resistencia al cambio', category: 'improvement', projectPhase: 'Ejecución', recommendation: 'Involucrar a key users desde la fase de planificación', recordedBy: 'Juan García', createdAt: '2026-03-15' },
  ],
  2: [
    { id: 2, folio: 'LEC-2026-002', title: 'Automatización de pruebas acelera entregas', description: 'La implementación de pruebas automatizadas redujo el ciclo de QA en 40%', category: 'success', projectPhase: 'Ejecución', recommendation: 'Incluir automatización de pruebas desde sprint 1', recordedBy: 'María Rodríguez', createdAt: '2026-03-10' },
  ],
};

export default function ProjectLessonsTab({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  const [lessons, setLessons] = useState<Lesson[]>(mockLessons[projectId] || []);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'improvement', projectPhase: '', recommendation: '' });

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', category: 'improvement', projectPhase: '', recommendation: '' });
    setShowModal(true);
  };

  const openEdit = (l: Lesson) => {
    setEditing(l);
    setForm({ title: l.title, description: l.description, category: l.category, projectPhase: l.projectPhase, recommendation: l.recommendation });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editing) {
      setLessons(lessons.map(l => l.id === editing.id ? { ...l, ...form } : l));
    } else {
      setLessons([...lessons, { id: Date.now(), folio: `LEC-2026-${(lessons.length + 1).toString().padStart(3, '0')}`, ...form, recordedBy: 'Usuario', createdAt: new Date().toISOString().split('T')[0] }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => setLessons(lessons.filter(l => l.id !== id));

  const categoryConfig: Record<string, { icon: typeof CheckCircle2; color: string; bgColor: string; label: string }> = {
    success: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', label: 'Éxito' },
    improvement: { icon: TrendingUp, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', label: 'Mejora' },
    error: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', label: 'Error' },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">{t('nav.lessons')}</h3>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          {t('projectDetail.addLesson')}
        </button>
      </div>

      {lessons.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('projectDetail.noLessons')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lessons.map(l => {
            const cat = categoryConfig[l.category] || categoryConfig.improvement;
            const Icon = cat.icon;
            return (
              <div key={l.id} className={`bg-white rounded-xl border p-5 ${cat.bgColor} hover:shadow-md transition-shadow`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`w-5 h-5 mt-0.5 ${cat.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-gray-400">{l.folio}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.color} bg-white/60`}>{cat.label}</span>
                        {l.projectPhase && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{l.projectPhase}</span>}
                      </div>
                      <h4 className="font-semibold text-gray-900">{l.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{l.description}</p>
                      {l.recommendation && (
                        <div className="mt-3 p-3 bg-white/60 rounded-lg">
                          <p className="text-xs font-medium text-gray-500 mb-1">{t('projectDetail.recommendation')}</p>
                          <p className="text-sm text-gray-700">{l.recommendation}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                        <span>{l.recordedBy}</span>
                        <span>{l.createdAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-3">
                    <button onClick={() => openEdit(l)} className="p-1 hover:bg-white/80 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                    <button onClick={() => handleDelete(l.id)} className="p-1 hover:bg-white/80 rounded"><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('projectDetail.editLesson') : t('projectDetail.addLesson')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.riskTitle')}</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.description')}</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.category')}</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="success">Éxito</option>
                    <option value="improvement">Mejora</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.phase')}</label>
                  <select value={form.projectPhase} onChange={e => setForm({...form, projectPhase: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Seleccionar...</option>
                    <option value="Planificación">Planificación</option>
                    <option value="Ejecución">Ejecución</option>
                    <option value="Soporte">Soporte</option>
                    <option value="Cerrado">Cerrado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.recommendation')}</label>
                <textarea value={form.recommendation} onChange={e => setForm({...form, recommendation: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
