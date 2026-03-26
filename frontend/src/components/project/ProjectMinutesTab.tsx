import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, ClipboardList, Sparkles } from 'lucide-react';

interface Minute {
  id: number;
  folio: string;
  title: string;
  meetingDate: string;
  participants: string;
  topics: string;
  agreements: string;
  source: string;
  createdAt: string;
}

const mockMinutes: Record<number, Minute[]> = {
  1: [
    { id: 1, folio: 'MIN-2026-001', title: 'Kickoff Migración ERP', meetingDate: '2026-01-20', participants: 'Juan García, María Rodríguez, Admin PMO', topics: 'Definición de alcance, cronograma inicial, asignación de recursos', agreements: '1. Iniciar levantamiento de requerimientos en semana 4\n2. Definir equipo técnico antes del 31 enero\n3. Reunión semanal cada lunes 10am', source: 'manual', createdAt: '2026-01-20' },
    { id: 2, folio: 'MIN-2026-004', title: 'Revisión avance Sprint 3', meetingDate: '2026-03-15', participants: 'Juan García, Equipo Desarrollo', topics: 'Revisión de entregables, bloqueos, plan siguiente sprint', agreements: '1. Resolver integración API prioridad alta\n2. Escalar tema de licencias a dirección', source: 'ai_generated', createdAt: '2026-03-15' },
  ],
};

export default function ProjectMinutesTab({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  const [minutes, setMinutes] = useState<Minute[]>(mockMinutes[projectId] || []);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Minute | null>(null);
  const [form, setForm] = useState({ title: '', meetingDate: '', participants: '', topics: '', agreements: '' });
  const [viewDetail, setViewDetail] = useState<Minute | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', meetingDate: new Date().toISOString().split('T')[0], participants: '', topics: '', agreements: '' });
    setShowModal(true);
  };

  const openEdit = (m: Minute) => {
    setEditing(m);
    setForm({ title: m.title, meetingDate: m.meetingDate, participants: m.participants, topics: m.topics, agreements: m.agreements });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editing) {
      setMinutes(minutes.map(m => m.id === editing.id ? { ...m, ...form } : m));
    } else {
      setMinutes([...minutes, { id: Date.now(), folio: `MIN-2026-${(minutes.length + 1).toString().padStart(3, '0')}`, ...form, source: 'manual', createdAt: new Date().toISOString().split('T')[0] }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => setMinutes(minutes.filter(m => m.id !== id));

  const sourceBadge = (s: string) => {
    if (s === 'ai_generated') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700"><Sparkles className="w-3 h-3" />IA</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Manual</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">{t('nav.minutes')}</h3>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          {t('projectDetail.addMinute')}
        </button>
      </div>

      {minutes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('minutes.noMinutes')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Folio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.riskTitle')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('minutes.date')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('minutes.source')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {minutes.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewDetail(m)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.folio}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.title}</td>
                  <td className="px-4 py-3 text-gray-600">{m.meetingDate}</td>
                  <td className="px-4 py-3">{sourceBadge(m.source)}</td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(m)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                      <button onClick={() => handleDelete(m.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail view */}
      {viewDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-400">{viewDetail.folio}</span>
                  {sourceBadge(viewDetail.source)}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{viewDetail.title}</h3>
              </div>
              <button onClick={() => setViewDetail(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('minutes.date')}</p>
                <p className="text-sm text-gray-900">{viewDetail.meetingDate}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('projectDetail.participants')}</p>
                <p className="text-sm text-gray-900">{viewDetail.participants}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('projectDetail.topics')}</p>
                <p className="text-sm text-gray-900 whitespace-pre-line">{viewDetail.topics}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">{t('projectDetail.agreements')}</p>
                <p className="text-sm text-gray-900 whitespace-pre-line">{viewDetail.agreements}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('projectDetail.editMinute') : t('projectDetail.addMinute')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('minutes.meetingTitle')}</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('minutes.meetingDate')}</label>
                <input type="date" value={form.meetingDate} onChange={e => setForm({...form, meetingDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.participants')}</label>
                <input value={form.participants} onChange={e => setForm({...form, participants: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Nombre 1, Nombre 2, ..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.topics')}</label>
                <textarea value={form.topics} onChange={e => setForm({...form, topics: e.target.value})} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.agreements')}</label>
                <textarea value={form.agreements} onChange={e => setForm({...form, agreements: e.target.value})} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
