import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react';

interface Change {
  id: number;
  folio: string;
  title: string;
  description: string;
  changeType: string;
  impact: string;
  requestedBy: string;
  requestDate: string;
  status: string;
  comments: string;
}

const mockChanges: Record<number, Change[]> = {
  6: [
    { id: 1, folio: 'CHG-2026-001', title: 'Ampliar alcance módulo de reportes', description: 'Incluir reportes ejecutivos adicionales', changeType: 'scope', impact: '2 semanas adicionales', requestedBy: 'Director Comercial', requestDate: '2026-03-01', status: 'in_review', comments: '' },
  ],
};

export default function ProjectChangesTab({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  const [changes, setChanges] = useState<Change[]>(mockChanges[projectId] || []);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Change | null>(null);
  const [form, setForm] = useState({ title: '', description: '', changeType: 'scope', impact: '', requestedBy: '', status: 'in_review', comments: '' });

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', changeType: 'scope', impact: '', requestedBy: '', status: 'in_review', comments: '' });
    setShowModal(true);
  };

  const openEdit = (c: Change) => {
    setEditing(c);
    setForm({ title: c.title, description: c.description, changeType: c.changeType, impact: c.impact, requestedBy: c.requestedBy, status: c.status, comments: c.comments });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editing) {
      setChanges(changes.map(c => c.id === editing.id ? { ...c, ...form } : c));
    } else {
      setChanges([...changes, { id: Date.now(), folio: `CHG-2026-${(changes.length + 1).toString().padStart(3, '0')}`, ...form, requestDate: new Date().toISOString().split('T')[0] }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => setChanges(changes.filter(c => c.id !== id));

  const typeBadge = (type: string) => {
    const config: Record<string, { color: string; label: string }> = {
      scope: { color: 'bg-purple-100 text-purple-700', label: 'Alcance' },
      time: { color: 'bg-blue-100 text-blue-700', label: 'Tiempo' },
      cost: { color: 'bg-green-100 text-green-700', label: 'Costo' },
      resource: { color: 'bg-amber-100 text-amber-700', label: 'Recurso' },
    };
    const c = config[type] || { color: 'bg-gray-100 text-gray-700', label: type };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>;
  };

  const statusBadge = (s: string) => {
    const config: Record<string, { color: string; label: string }> = {
      in_review: { color: 'bg-amber-100 text-amber-700', label: 'En Revisión' },
      approved: { color: 'bg-green-100 text-green-700', label: 'Aprobado' },
      rejected: { color: 'bg-red-100 text-red-700', label: 'Rechazado' },
      implemented: { color: 'bg-blue-100 text-blue-700', label: 'Implementado' },
    };
    const c = config[s] || { color: 'bg-gray-100 text-gray-700', label: s };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">{t('nav.changes')}</h3>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          {t('projectDetail.addChange')}
        </button>
      </div>

      {changes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('projectDetail.noChanges')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Folio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.riskTitle')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projects.type')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.requestedBy')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.impact')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {changes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.folio}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{c.description}</p>
                  </td>
                  <td className="px-4 py-3">{typeBadge(c.changeType)}</td>
                  <td className="px-4 py-3 text-gray-600">{c.requestedBy}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{c.impact}</td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('projectDetail.editChange') : t('projectDetail.addChange')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.riskTitle')}</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.description')}</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.type')}</label>
                  <select value={form.changeType} onChange={e => setForm({...form, changeType: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="scope">Alcance</option>
                    <option value="time">Tiempo</option>
                    <option value="cost">Costo</option>
                    <option value="resource">Recurso</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="in_review">En Revisión</option>
                    <option value="approved">Aprobado</option>
                    <option value="rejected">Rechazado</option>
                    <option value="implemented">Implementado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.requestedBy')}</label>
                <input value={form.requestedBy} onChange={e => setForm({...form, requestedBy: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.impact')}</label>
                <textarea value={form.impact} onChange={e => setForm({...form, impact: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Describe el impacto del cambio..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.comments')}</label>
                <textarea value={form.comments} onChange={e => setForm({...form, comments: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
