import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, Bug } from 'lucide-react';

interface Issue {
  id: number;
  folio: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  resolution: string;
  reportDate: string;
  commitmentDate: string;
  responsibleName: string;
}

const mockIssues: Record<number, Issue[]> = {
  1: [
    { id: 1, folio: 'INC-2026-001', title: 'Integración API fallando en staging', description: 'Error 500 al conectar con ERP', type: 'issue', priority: 'Alta', status: 'open', resolution: '', reportDate: '2026-03-10', commitmentDate: '2026-03-20', responsibleName: 'Juan García' },
  ],
  2: [
    { id: 2, folio: 'INC-2026-002', title: 'Definir estándar de documentación', description: 'Equipo necesita alinearse en formato', type: 'decision', priority: 'Media', status: 'open', resolution: '', reportDate: '2026-03-05', commitmentDate: '', responsibleName: 'María Rodríguez' },
  ],
};

export default function ProjectIssuesTab({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  const [issues, setIssues] = useState<Issue[]>(mockIssues[projectId] || []);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [form, setForm] = useState({ title: '', description: '', type: 'issue', priority: 'Media', status: 'open', resolution: '', commitmentDate: '' });
  const [typeFilter, setTypeFilter] = useState('all');

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', type: 'issue', priority: 'Media', status: 'open', resolution: '', commitmentDate: '' });
    setShowModal(true);
  };

  const openEdit = (i: Issue) => {
    setEditing(i);
    setForm({ title: i.title, description: i.description, type: i.type, priority: i.priority, status: i.status, resolution: i.resolution, commitmentDate: i.commitmentDate });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editing) {
      setIssues(issues.map(i => i.id === editing.id ? { ...i, ...form } : i));
    } else {
      setIssues([...issues, { id: Date.now(), folio: `INC-2026-${(issues.length + 1).toString().padStart(3, '0')}`, ...form, reportDate: new Date().toISOString().split('T')[0], responsibleName: 'Sin asignar' }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => setIssues(issues.filter(i => i.id !== id));

  const typeBadge = (type: string) => {
    const config: Record<string, { color: string; label: string }> = {
      action: { color: 'bg-blue-100 text-blue-700', label: 'Acción' },
      issue: { color: 'bg-red-100 text-red-700', label: 'Incidencia' },
      decision: { color: 'bg-purple-100 text-purple-700', label: 'Decisión' },
    };
    const c = config[type] || { color: 'bg-gray-100 text-gray-700', label: type };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>;
  };

  const priorityBadge = (p: string) => {
    const colors: Record<string, string> = { Alta: 'text-red-600', Media: 'text-amber-600', Baja: 'text-green-600' };
    return <span className={`font-medium ${colors[p] || 'text-gray-600'}`}>{p}</span>;
  };

  const statusBadge = (s: string) => {
    const config: Record<string, { color: string; label: string }> = {
      open: { color: 'bg-red-100 text-red-700', label: 'Abierto' },
      in_progress: { color: 'bg-blue-100 text-blue-700', label: 'En Progreso' },
      resolved: { color: 'bg-green-100 text-green-700', label: 'Resuelto' },
      closed: { color: 'bg-gray-100 text-gray-700', label: 'Cerrado' },
    };
    const c = config[s] || { color: 'bg-gray-100 text-gray-700', label: s };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>;
  };

  const filtered = typeFilter === 'all' ? issues : issues.filter(i => i.type === typeFilter);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{t('nav.issues')} (AID)</h3>
          <div className="flex gap-1">
            {['all', 'action', 'issue', 'decision'].map(tp => (
              <button key={tp} onClick={() => setTypeFilter(tp)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${typeFilter === tp ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {tp === 'all' ? t('projects.all') : tp === 'action' ? 'Acciones' : tp === 'issue' ? 'Incidencias' : 'Decisiones'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          {t('projectDetail.addIssue')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Bug className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('projectDetail.noIssues')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Folio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.riskTitle')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projects.type')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projects.priority')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.commitDate')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(i => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{i.folio}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{i.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{i.description}</p>
                  </td>
                  <td className="px-4 py-3">{typeBadge(i.type)}</td>
                  <td className="px-4 py-3">{priorityBadge(i.priority)}</td>
                  <td className="px-4 py-3">{statusBadge(i.status)}</td>
                  <td className="px-4 py-3 text-gray-500">{i.commitmentDate || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(i)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                      <button onClick={() => handleDelete(i.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>
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
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('projectDetail.editIssue') : t('projectDetail.addIssue')}</h3>
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.type')}</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="action">Acción</option>
                    <option value="issue">Incidencia</option>
                    <option value="decision">Decisión</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.priority')}</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="open">Abierto</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.commitDate')}</label>
                <input type="date" value={form.commitmentDate} onChange={e => setForm({...form, commitmentDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              {(form.status === 'resolved' || form.status === 'closed') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.resolution')}</label>
                  <textarea value={form.resolution} onChange={e => setForm({...form, resolution: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              )}
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
