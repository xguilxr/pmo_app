import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';

interface Risk {
  id: number;
  folio: string;
  title: string;
  description: string;
  category: string;
  probability: number;
  impact: number;
  severity: number;
  mitigationStrategy: string;
  status: string;
  identificationDate: string;
  responsibleName: string;
}

const mockRisks: Record<number, Risk[]> = {
  1: [
    { id: 1, folio: 'RSK-2026-001', title: 'Retraso en entrega de licencias SAP', description: 'El proveedor puede no entregar a tiempo', category: 'Proveedor', probability: 4, impact: 5, severity: 20, mitigationStrategy: 'Contrato con penalización por retraso', status: 'open', identificationDate: '2026-01-20', responsibleName: 'Juan García' },
    { id: 2, folio: 'RSK-2026-002', title: 'Rotación de personal clave', description: 'Riesgo de salida del arquitecto principal', category: 'Recurso', probability: 3, impact: 4, severity: 12, mitigationStrategy: 'Plan de retención y documentación', status: 'open', identificationDate: '2026-02-05', responsibleName: 'Juan García' },
  ],
  10: [
    { id: 3, folio: 'RSK-2026-003', title: 'Cambio en regulación fiscal', description: 'Posibles cambios en la normativa de facturación', category: 'Externo', probability: 2, impact: 5, severity: 10, mitigationStrategy: 'Monitoreo constante del SAT', status: 'open', identificationDate: '2026-01-15', responsibleName: 'María Rodríguez' },
  ],
};

export default function ProjectRisksTab({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  const [risks, setRisks] = useState<Risk[]>(mockRisks[projectId] || []);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Risk | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', probability: 3, impact: 3, mitigationStrategy: '', status: 'open' });
  const [statusFilter, setStatusFilter] = useState('all');

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', category: '', probability: 3, impact: 3, mitigationStrategy: '', status: 'open' });
    setShowModal(true);
  };

  const openEdit = (r: Risk) => {
    setEditing(r);
    setForm({ title: r.title, description: r.description, category: r.category, probability: r.probability, impact: r.impact, mitigationStrategy: r.mitigationStrategy, status: r.status });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    const severity = form.probability * form.impact;
    if (editing) {
      setRisks(risks.map(r => r.id === editing.id ? { ...r, ...form, severity } : r));
    } else {
      setRisks([...risks, { id: Date.now(), folio: `RSK-2026-${(risks.length + 1).toString().padStart(3, '0')}`, ...form, severity, identificationDate: new Date().toISOString().split('T')[0], responsibleName: 'Sin asignar' }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => setRisks(risks.filter(r => r.id !== id));

  const severityColor = (s: number) => {
    if (s >= 15) return 'bg-red-100 text-red-700';
    if (s >= 8) return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { open: 'bg-red-100 text-red-700', mitigated: 'bg-blue-100 text-blue-700', closed: 'bg-gray-100 text-gray-700' };
    const labels: Record<string, string> = { open: 'Abierto', mitigated: 'Mitigado', closed: 'Cerrado' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || 'bg-gray-100 text-gray-700'}`}>{labels[s] || s}</span>;
  };

  const filtered = statusFilter === 'all' ? risks : risks.filter(r => r.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{t('nav.risks')}</h3>
          <div className="flex gap-1">
            {['all', 'open', 'mitigated', 'closed'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s === 'all' ? t('projects.all') : s === 'open' ? 'Abiertos' : s === 'mitigated' ? 'Mitigados' : 'Cerrados'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          {t('projectDetail.addRisk')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('projectDetail.noRisks')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Folio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.riskTitle')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.category')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">P</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">I</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">{t('projectDetail.severity')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.folio}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.description}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.category}</td>
                  <td className="px-4 py-3 text-center">{r.probability}</td>
                  <td className="px-4 py-3 text-center">{r.impact}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${severityColor(r.severity)}`}>{r.severity}</span></td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>
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
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('projectDetail.editRisk') : t('projectDetail.addRisk')}</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.category')}</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Seleccionar...</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Recurso">Recurso</option>
                    <option value="Proveedor">Proveedor</option>
                    <option value="Externo">Externo</option>
                    <option value="Financiero">Financiero</option>
                    <option value="Organizacional">Organizacional</option>
                  </select>
                </div>
                {editing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="open">Abierto</option>
                      <option value="mitigated">Mitigado</option>
                      <option value="closed">Cerrado</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.probability')} (1-5)</label>
                  <input type="number" min={1} max={5} value={form.probability} onChange={e => setForm({...form, probability: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.impact')} (1-5)</label>
                  <input type="number" min={1} max={5} value={form.impact} onChange={e => setForm({...form, impact: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <span className="text-sm text-gray-500">{t('projectDetail.severity')}: </span>
                <span className={`text-lg font-bold ${severityColor(form.probability * form.impact).replace('bg-', 'text-').replace('-100', '-700')}`}>{form.probability * form.impact}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.mitigation')}</label>
                <textarea value={form.mitigationStrategy} onChange={e => setForm({...form, mitigationStrategy: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
