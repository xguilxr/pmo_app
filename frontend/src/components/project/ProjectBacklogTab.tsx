import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, Clock, ListTree } from 'lucide-react';

interface BacklogItem {
  id: number;
  code: string;
  title: string;
  description: string;
  area: string;
  responsible: string;
  startDate: string;
  endDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  priority: 'Alta' | 'Media' | 'Baja';
  progress: number;
  wasDelayed: boolean;
}

const mockBacklog: Record<number, BacklogItem[]> = {
  1: [
    { id: 1, code: 'BLG-001', title: 'Configuración de ambientes de prueba', description: 'Preparar entornos QA y staging', area: 'Infraestructura', responsible: 'Carlos López', startDate: '2026-02-01', endDate: '2026-02-28', status: 'completed', priority: 'Alta', progress: 100, wasDelayed: true },
    { id: 2, code: 'BLG-002', title: 'Documentación de APIs internas', description: 'Swagger/OpenAPI para microservicios', area: 'Desarrollo', responsible: 'Ana Torres', startDate: '2026-02-15', endDate: '2026-03-15', status: 'in_progress', priority: 'Media', progress: 60, wasDelayed: false },
    { id: 3, code: 'BLG-003', title: 'Migración de datos legacy', description: 'Exportar y transformar datos del sistema anterior', area: 'Datos', responsible: 'Juan García', startDate: '2026-03-01', endDate: '2026-03-20', status: 'in_progress', priority: 'Alta', progress: 30, wasDelayed: true },
    { id: 4, code: 'BLG-004', title: 'Capacitación usuarios finales', description: 'Preparar material y sesiones de entrenamiento', area: 'Change Management', responsible: 'María Rodríguez', startDate: '2026-04-01', endDate: '2026-04-30', status: 'not_started', priority: 'Media', progress: 0, wasDelayed: false },
    { id: 5, code: 'BLG-005', title: 'Auditoría de seguridad', description: 'Pen testing y revisión de vulnerabilidades', area: 'Seguridad', responsible: 'Roberto Sánchez', startDate: '2026-03-10', endDate: '2026-03-25', status: 'blocked', priority: 'Alta', progress: 15, wasDelayed: true },
    { id: 6, code: 'BLG-006', title: 'Integración con sistema contable', description: 'Conectar módulo de facturación con ERP', area: 'Desarrollo', responsible: 'Ana Torres', startDate: '2026-03-15', endDate: '2026-04-10', status: 'not_started', priority: 'Media', progress: 0, wasDelayed: false },
    { id: 7, code: 'BLG-007', title: 'Optimización de consultas BD', description: 'Mejorar performance de queries críticas', area: 'Datos', responsible: 'Juan García', startDate: '2026-02-20', endDate: '2026-03-10', status: 'completed', priority: 'Baja', progress: 100, wasDelayed: false },
    { id: 8, code: 'BLG-008', title: 'Diseño de dashboard ejecutivo', description: 'Mockups y prototipo del panel gerencial', area: 'UX/UI', responsible: 'Laura Méndez', startDate: '2026-03-01', endDate: '2026-03-18', status: 'in_progress', priority: 'Baja', progress: 45, wasDelayed: true },
  ],
};

const emptyForm = {
  title: '',
  description: '',
  area: '',
  responsible: '',
  startDate: '',
  endDate: '',
  status: 'not_started' as BacklogItem['status'],
  priority: 'Media' as BacklogItem['priority'],
  progress: 0,
  wasDelayed: false,
};

export default function ProjectBacklogTab({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<BacklogItem[]>(mockBacklog[projectId] || []);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BacklogItem | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [statusFilter, setStatusFilter] = useState('all');

  const today = new Date().toISOString().split('T')[0];

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (item: BacklogItem) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description,
      area: item.area,
      responsible: item.responsible,
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
      priority: item.priority,
      progress: item.progress,
      wasDelayed: item.wasDelayed,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editing) {
      setItems(items.map(i => i.id === editing.id ? { ...i, ...form } : i));
    } else {
      const nextCode = `BLG-${(items.length + 1).toString().padStart(3, '0')}`;
      setItems([...items, { id: Date.now(), code: nextCode, ...form }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => setItems(items.filter(i => i.id !== id));

  const isOverdue = (item: BacklogItem) => item.endDate < today && item.status !== 'completed';

  const statusBadge = (s: BacklogItem['status']) => {
    const config: Record<string, { color: string; label: string }> = {
      not_started: { color: 'bg-gray-100 text-gray-700', label: 'Sin Iniciar' },
      in_progress: { color: 'bg-blue-100 text-blue-700', label: 'En Progreso' },
      completed: { color: 'bg-green-100 text-green-700', label: 'Completado' },
      blocked: { color: 'bg-red-100 text-red-700', label: 'Bloqueado' },
    };
    const c = config[s] || { color: 'bg-gray-100 text-gray-700', label: s };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>;
  };

  const priorityBadge = (p: BacklogItem['priority']) => {
    const colors: Record<string, string> = { Alta: 'bg-red-100 text-red-700', Media: 'bg-amber-100 text-amber-700', Baja: 'bg-gray-100 text-gray-600' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[p] || 'bg-gray-100 text-gray-600'}`}>{p}</span>;
  };

  const progressBar = (value: number) => {
    const color = value >= 100 ? 'bg-green-500' : value >= 50 ? 'bg-blue-500' : value > 0 ? 'bg-amber-500' : 'bg-gray-300';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden w-20">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
        </div>
        <span className="text-xs font-medium text-gray-600 w-10 text-right">{value}%</span>
      </div>
    );
  };

  const filtered = statusFilter === 'all' ? items : items.filter(i => i.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Backlog</h3>
          <div className="flex gap-1">
            {(['all', 'not_started', 'in_progress', 'completed', 'blocked'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s === 'all' ? t('projects.all') : s === 'not_started' ? 'Sin Iniciar' : s === 'in_progress' ? 'En Progreso' : s === 'completed' ? 'Completado' : 'Bloqueado'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          {t('projectDetail.addBacklog')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <ListTree className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('projectDetail.noBacklog')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.riskTitle')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Area</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.responsible')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projects.startDate')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projects.endDate')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">{t('projects.progress')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">{t('projects.priority')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Delay</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50 ${isOverdue(item) ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.area}</td>
                  <td className="px-4 py-3 text-gray-600">{item.responsible}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.startDate}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.endDate}</td>
                  <td className="px-4 py-3">{progressBar(item.progress)}</td>
                  <td className="px-4 py-3 text-center">{priorityBadge(item.priority)}</td>
                  <td className="px-4 py-3">{statusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-center">
                    {item.wasDelayed && <Clock className="w-4 h-4 text-red-500 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(item)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>
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
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('projectDetail.editBacklog') : t('projectDetail.addBacklog')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.riskTitle')}</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.description')}</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                  <input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.responsible')}</label>
                  <input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.startDate')}</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.endDate')}</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.priority')}</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as BacklogItem['priority'] })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as BacklogItem['status'] })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="not_started">Sin Iniciar</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="completed">Completado</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.progress')}</label>
                  <input type="number" min={0} max={100} value={form.progress} onChange={e => setForm({ ...form, progress: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="wasDelayed" checked={form.wasDelayed} onChange={e => setForm({ ...form, wasDelayed: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="wasDelayed" className="text-sm text-gray-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-red-500" /> Fue retrasado (delay historico)
                </label>
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
