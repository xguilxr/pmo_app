import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, X, Eye, CheckCircle2, XCircle, Clock, AlertCircle, Ban } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { api } from '../services/api';
import { useApi, LoadingSpinner } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';

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

interface ApiRequestResponse {
  id: number;
  folio: string;
  title: string;
  description: string;
  objective: string;
  benefits: string;
  requester_name: string;
  organization_name?: string;
  budget: number | null;
  priority?: string;
  expected_start?: string;
  status: string;
  created_at: string;
  rejection_reason: string | null;
}

function mapApiRequest(raw: ApiRequestResponse): ProjectRequest {
  return {
    id: raw.id,
    folio: raw.folio || '',
    projectName: raw.title || '',
    description: raw.description || '',
    businessCase: raw.benefits || raw.objective || '',
    requestedBy: raw.requester_name || '',
    organization: raw.organization_name || '',
    estimatedBudget: raw.budget || 0,
    priority: raw.priority || 'Media',
    startDate: raw.expected_start || '',
    status: raw.status || 'in_review',
    createdAt: raw.created_at?.split('T')[0] || '',
    reviewNotes: raw.rejection_reason || '',
  };
}

export default function RequestsPage() {
  const { t } = useTranslation();
  const { toastError } = useToast();
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [viewDetail, setViewDetail] = useState<ProjectRequest | null>(null);
  const [form, setForm] = useState({ projectName: '', description: '', objective: '', businessCase: '', requestedBy: '', sponsorEmail: '', organization: '', organizationId: 0, estimatedBudget: 0, priority: 'Media', startDate: '', strategic_alignment: '', what_if_not_done: '', key_stakeholders: '', expected_deliverables: '' });
  const { data: orgs } = useApi(() => api.get<{id: number; name: string}[]>('/organizations').catch(() => []), []);

  // Fetch from API with fallback to mock
  const { data: apiRequests, loading, refetch } = useApi(async () => {
    try {
      const raw = await api.get<ApiRequestResponse[]>('/requests');
      return raw.map(mapApiRequest);
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (apiRequests) setRequests(apiRequests);
  }, [apiRequests]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
    in_review: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: t('requests.inReview') },
    approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: t('requests.approved') },
    rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: t('requests.rejected') },
    info_requested: { color: 'bg-blue-100 text-blue-700', icon: AlertCircle, label: t('requests.infoRequested') },
    cancelled: { color: 'bg-gray-700 text-white', icon: Ban, label: t('requests.cancelled') },
  };

  const handleCreate = async () => {
    if (!form.projectName.trim()) return;
    try {
      await api.post('/requests', {
        title: form.projectName,
        description: form.description,
        objective: form.objective || form.businessCase,
        benefits: form.businessCase,
        business_unit: form.organization,
        department: form.organization,
        sponsor_name: form.requestedBy,
        sponsor_email: form.sponsorEmail,
        strategic_alignment: form.strategic_alignment,
        what_if_not_done: form.what_if_not_done,
        key_stakeholders: form.key_stakeholders || form.requestedBy,
        expected_deliverables: form.expected_deliverables,
        budget: form.estimatedBudget,
        organization_id: form.organizationId || 1,
      });
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al crear solicitud');
    }
    setShowModal(false);
    setForm({ projectName: '', description: '', objective: '', businessCase: '', requestedBy: '', sponsorEmail: '', organization: '', organizationId: 0, estimatedBudget: 0, priority: 'Media', startDate: '', strategic_alignment: '', what_if_not_done: '', key_stakeholders: '', expected_deliverables: '' });
  };

  const handleStatusChange = async (id: number, newStatus: string, notes: string = '') => {
    if (newStatus === 'approved') {
      if (!window.confirm(t('requests.approveConfirm'))) {
        return;
      }
    }
    if (newStatus === 'cancelled') {
      if (!window.confirm(t('requests.cancelConfirm'))) {
        return;
      }
    }
    try {
      if (newStatus === 'approved') {
        await api.post(`/requests/${id}/approve`, {});
        window.alert(t('requests.projectCreated'));
      } else if (newStatus === 'rejected') {
        await api.post(`/requests/${id}/reject`, { reason: notes });
      } else if (newStatus === 'cancelled') {
        await api.post(`/requests/${id}/cancel`, {});
      } else {
        await api.patch(`/requests/${id}`, { status: newStatus });
      }
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al cambiar estado de solicitud');
    }
    setViewDetail(null);
  };

  if (loading) return <LoadingSpinner />;

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
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('requests.title') }]}
        title={t('requests.title')}
      >
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          {t('requests.newRequest')}
        </button>
      </PageHeader>

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
          <div className="text-center py-12 liquid-glass-border rounded-xl">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('requests.noRequests')}</p>
          </div>
        ) : (
          filtered.map(req => {
            const st = statusConfig[req.status] || statusConfig.in_review;
            const StatusIcon = st.icon;
            return (
              <div key={req.id} onClick={() => setViewDetail(req)} className="liquid-glass-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer">
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="liquid-modal rounded-2xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto">
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{t('requests.newRequest')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.projectName')} *</label>
                <input value={form.projectName} onChange={e => setForm({...form, projectName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.description')} *</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Describa el proyecto propuesto..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo *</label>
                <textarea value={form.objective} onChange={e => setForm({...form, objective: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="¿Qué se espera lograr?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.businessCase')} / Beneficios *</label>
                <textarea value={form.businessCase} onChange={e => setForm({...form, businessCase: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Beneficios esperados del proyecto..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alineación Estratégica</label>
                <input value={form.strategic_alignment} onChange={e => setForm({...form, strategic_alignment: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="¿Con qué objetivo estratégico se alinea?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">¿Qué pasa si no se hace?</label>
                <textarea value={form.what_if_not_done} onChange={e => setForm({...form, what_if_not_done: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Impacto de no realizar el proyecto..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.sponsor')} *</label>
                  <input value={form.requestedBy} onChange={e => setForm({...form, requestedBy: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Nombre del sponsor" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.sponsorEmail')}</label>
                  <input type="email" value={form.sponsorEmail} onChange={e => setForm({...form, sponsorEmail: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="sponsor@empresa.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.organization')} *</label>
                <select value={form.organizationId} onChange={e => { const orgId = Number(e.target.value); const org = (orgs || []).find(o => o.id === orgId); setForm({...form, organizationId: orgId, organization: org?.name || ''}); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value={0}>{t('requests.selectOrganization')}</option>
                  {(orgs || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interesados Clave</label>
                <input value={form.key_stakeholders} onChange={e => setForm({...form, key_stakeholders: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Nombres de los principales interesados..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entregables Esperados</label>
                <textarea value={form.expected_deliverables} onChange={e => setForm({...form, expected_deliverables: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Lista de entregables principales..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.estimatedBudget')}</label>
                  <input type="number" value={form.estimatedBudget} onChange={e => setForm({...form, estimatedBudget: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.priority')}</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option>
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
