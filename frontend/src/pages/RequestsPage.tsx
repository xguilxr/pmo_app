import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, X, Eye, CheckCircle2, XCircle, Clock, AlertCircle, Ban } from 'lucide-react';

interface ProjectRequest {
  id: number;
  folio: string;
  projectName: string;
  description: string;
  businessCase: string;
  requestedBy: string;
  organization: string;
  estimatedBudget: number;
  priority: string;
  startDate: string;
  status: string;
  createdAt: string;
  reviewNotes: string;
}

const mockRequests: ProjectRequest[] = [
  { id: 1, folio: 'REQ-2026-001', projectName: 'Implementación Business Intelligence', description: 'Dashboard gerencial con datos consolidados de ventas, finanzas y operaciones', businessCase: 'Reducir el tiempo de generación de reportes de 5 días a 2 horas', requestedBy: 'Director de Finanzas', organization: 'Grupo Alfa', estimatedBudget: 1500000, priority: 'Alta', startDate: '2026-05-01', status: 'in_review', createdAt: '2026-03-20', reviewNotes: '' },
  { id: 2, folio: 'REQ-2026-002', projectName: 'Automatización de Compras', description: 'Sistema de órdenes de compra con aprobaciones digitales y trazabilidad', businessCase: 'Eliminar procesos manuales de 200+ órdenes mensuales', requestedBy: 'Gerente de Operaciones', organization: 'Distribuidora MX', estimatedBudget: 800000, priority: 'Media', startDate: '2026-06-01', status: 'in_review', createdAt: '2026-03-18', reviewNotes: '' },
  { id: 3, folio: 'REQ-2026-003', projectName: 'Portal de Proveedores', description: 'Plataforma para gestión de proveedores, licitaciones y evaluaciones', businessCase: 'Centralizar la gestión de 150+ proveedores activos', requestedBy: 'Director de Compras', organization: 'TechNova', estimatedBudget: 650000, priority: 'Baja', startDate: '2026-07-01', status: 'approved', createdAt: '2026-03-10', reviewNotes: 'Aprobado con presupuesto ajustado a $600,000' },
  { id: 4, folio: 'REQ-2026-004', projectName: 'Sistema de Tickets Soporte', description: 'Help desk interno con SLAs y escalamientos automáticos', businessCase: 'Tiempo promedio de resolución actual: 48hrs, objetivo: 8hrs', requestedBy: 'Gerente de TI', organization: 'Servicios Global', estimatedBudget: 400000, priority: 'Media', startDate: '2026-04-15', status: 'rejected', createdAt: '2026-03-05', reviewNotes: 'Se sugiere evaluar soluciones SaaS existentes antes de desarrollo custom' },
  { id: 5, folio: 'REQ-2026-005', projectName: 'Migración Cloud AWS', description: 'Migrar infraestructura on-premise a servicios cloud de AWS', businessCase: 'Reducir costos de infraestructura en 40% y mejorar disponibilidad a 99.9%', requestedBy: 'CTO', organization: 'TechNova', estimatedBudget: 2200000, priority: 'Alta', startDate: '2026-05-15', status: 'in_review', createdAt: '2026-03-22', reviewNotes: '' },
  { id: 6, folio: 'REQ-2026-006', projectName: 'App de Inventarios', description: 'Aplicación móvil para control de inventario en tiempo real con código de barras', businessCase: 'Reducir diferencias de inventario del 8% al 1%', requestedBy: 'Gerente de Almacén', organization: 'Distribuidora MX', estimatedBudget: 550000, priority: 'Alta', startDate: '2026-06-15', status: 'info_requested', createdAt: '2026-03-15', reviewNotes: 'Se requiere especificación técnica del hardware de escaneo' },
];

export default function RequestsPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<ProjectRequest[]>(mockRequests);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [viewDetail, setViewDetail] = useState<ProjectRequest | null>(null);
  const [form, setForm] = useState({ projectName: '', description: '', businessCase: '', requestedBy: '', organization: '', estimatedBudget: 0, priority: 'Media', startDate: '' });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
    in_review: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: t('requests.inReview') },
    approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: t('requests.approved') },
    rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: t('requests.rejected') },
    info_requested: { color: 'bg-blue-100 text-blue-700', icon: AlertCircle, label: t('requests.infoRequested') },
    cancelled: { color: 'bg-gray-700 text-white', icon: Ban, label: t('requests.cancelled') },
  };

  const handleCreate = () => {
    if (!form.projectName.trim()) return;
    const newReq: ProjectRequest = {
      id: Date.now(),
      folio: `REQ-2026-${(requests.length + 1).toString().padStart(3, '0')}`,
      ...form,
      status: 'in_review',
      createdAt: new Date().toISOString().split('T')[0],
      reviewNotes: '',
    };
    setRequests([newReq, ...requests]);
    setShowModal(false);
    setForm({ projectName: '', description: '', businessCase: '', requestedBy: '', organization: '', estimatedBudget: 0, priority: 'Media', startDate: '' });
  };

  const handleStatusChange = (id: number, newStatus: string, notes: string = '') => {
    if (newStatus === 'approved') {
      const req = requests.find(r => r.id === id);
      if (req && !window.confirm(`El proyecto "${req.projectName}" sera creado en la organizacion "${req.organization}". ¿Desea continuar?`)) {
        return;
      }
    }
    setRequests(requests.map(r => r.id === id ? { ...r, status: newStatus, reviewNotes: notes || r.reviewNotes } : r));
    setViewDetail(null);
  };

  const filtered = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter);

  const counts = {
    all: requests.length,
    in_review: requests.filter(r => r.status === 'in_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('requests.title')}</h2>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          {t('requests.newRequest')}
        </button>
      </div>

      {/* Status filter buttons */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: t('projects.all') },
          { key: 'in_review', label: t('requests.inReview') },
          { key: 'approved', label: t('requests.approved') },
          { key: 'rejected', label: t('requests.rejected') },
          { key: 'cancelled', label: t('requests.cancelled') },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s.label} ({counts[s.key as keyof typeof counts] || 0})
          </button>
        ))}
      </div>

      {/* Requests list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('requests.noRequests')}</p>
          </div>
        ) : (
          filtered.map(req => {
            const st = statusConfig[req.status] || statusConfig.in_review;
            const StatusIcon = st.icon;
            return (
              <div key={req.id} onClick={() => setViewDetail(req)} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-gray-400">{req.folio}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        <StatusIcon className="w-3 h-3" />{st.label}
                      </span>
                      <span className={`text-xs font-medium ${req.priority === 'Alta' ? 'text-red-600' : req.priority === 'Media' ? 'text-amber-600' : 'text-green-600'}`}>{req.priority}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{req.projectName}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{req.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{req.organization}</span>
                      <span>{t('requests.requestedBy')}: {req.requestedBy}</span>
                      <span>{formatCurrency(req.estimatedBudget)}</span>
                      <span>{req.createdAt}</span>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-gray-400 mt-1" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail/Review Modal */}
      {viewDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-400">{viewDetail.folio}</span>
                  {(() => { const st = statusConfig[viewDetail.status]; const Icon = st.icon; return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}><Icon className="w-3 h-3" />{st.label}</span>; })()}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{viewDetail.projectName}</h3>
              </div>
              <button onClick={() => setViewDetail(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><p className="text-xs font-medium text-gray-500 mb-1">{t('requests.organization')}</p><p className="text-sm text-gray-900">{viewDetail.organization}</p></div>
              <div><p className="text-xs font-medium text-gray-500 mb-1">{t('requests.requestedBy')}</p><p className="text-sm text-gray-900">{viewDetail.requestedBy}</p></div>
              <div><p className="text-xs font-medium text-gray-500 mb-1">{t('requests.estimatedBudget')}</p><p className="text-sm text-gray-900">{formatCurrency(viewDetail.estimatedBudget)}</p></div>
              <div><p className="text-xs font-medium text-gray-500 mb-1">{t('requests.desiredStart')}</p><p className="text-sm text-gray-900">{viewDetail.startDate}</p></div>
            </div>

            <div className="space-y-4">
              <div><p className="text-xs font-medium text-gray-500 mb-1">{t('projectDetail.description')}</p><p className="text-sm text-gray-900">{viewDetail.description}</p></div>
              <div><p className="text-xs font-medium text-gray-500 mb-1">{t('requests.businessCase')}</p><p className="text-sm text-gray-900">{viewDetail.businessCase}</p></div>
              {viewDetail.reviewNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3"><p className="text-xs font-medium text-amber-700 mb-1">{t('requests.reviewNotes')}</p><p className="text-sm text-amber-900">{viewDetail.reviewNotes}</p></div>
              )}
            </div>

            {(viewDetail.status === 'in_review' || viewDetail.status === 'info_requested') && (
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => handleStatusChange(viewDetail.id, 'cancelled', 'Solicitud cancelada')} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium">{t('requests.cancelRequest')}</button>
                <button onClick={() => handleStatusChange(viewDetail.id, 'rejected', 'Solicitud rechazada')} className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium">{t('requests.reject')}</button>
                <button onClick={() => handleStatusChange(viewDetail.id, 'info_requested')} className="px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-medium">{t('requests.requestInfo')}</button>
                <button onClick={() => handleStatusChange(viewDetail.id, 'approved', 'Solicitud aprobada')} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">{t('requests.approve')}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{t('requests.newRequest')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.projectName')}</label>
                <input value={form.projectName} onChange={e => setForm({...form, projectName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.description')}</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.businessCase')}</label>
                <textarea value={form.businessCase} onChange={e => setForm({...form, businessCase: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.requestedBy')}</label>
                  <input value={form.requestedBy} onChange={e => setForm({...form, requestedBy: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.organization')}</label>
                  <select value={form.organization} onChange={e => setForm({...form, organization: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Seleccionar...</option>
                    <option value="Grupo Alfa">Grupo Alfa</option>
                    <option value="TechNova">TechNova</option>
                    <option value="Distribuidora MX">Distribuidora MX</option>
                    <option value="Servicios Global">Servicios Global</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.estimatedBudget')}</label>
                  <input type="number" value={form.estimatedBudget} onChange={e => setForm({...form, estimatedBudget: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.desiredStart')}</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">{t('common.cancel')}</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">{t('requests.submit')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
