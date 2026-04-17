import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Eye, Download, Trash2, X, FileBarChart, BarChart3, Bot, Calendar, Send } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { api, API_BASE_URL } from '../services/api';
import { useApi, LoadingSpinner, ErrorMessage } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';

interface ApiReport {
  id: number;
  title: string;
  content_html: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  recipients: string | null;
  sent_date: string | null;
  project_id: number;
  created_at: string;
}

interface Report {
  id: number;
  type: 'avance' | 'seguimiento';
  projectId: number;
  projectName: string;
  date: string;
  status: 'draft' | 'sent';
  periodStart: string;
  periodEnd: string;
  recipients: string;
  aiGenerated: boolean;
  htmlContent: string;
}

function mapApiReport(raw: ApiReport): Report {
  const isAvance = (raw.title || '').toLowerCase().includes('avance');
  return {
    id: raw.id,
    type: isAvance ? 'avance' : 'seguimiento',
    projectId: raw.project_id,
    projectName: raw.title || '',
    date: raw.created_at?.split('T')[0] || '',
    status: raw.status === 'sent' ? 'sent' : 'draft',
    periodStart: raw.period_start || '',
    periodEnd: raw.period_end || '',
    recipients: raw.recipients || '',
    aiGenerated: raw.title?.includes('AI') || false,
    htmlContent: raw.content_html || '',
  };
}

interface ProjectOption {
  id: number;
  name: string;
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const { toastError } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [sortBy, setSortBy] = useState<'project' | 'date'>('date');
  const [generating, setGenerating] = useState(false);

  // Generate form state
  const [formProjectId, setFormProjectId] = useState('');
  const [formPeriodStart, setFormPeriodStart] = useState('');
  const [formPeriodEnd, setFormPeriodEnd] = useState('');
  const [formRecipients, setFormRecipients] = useState('');

  // Fetch projects for selector
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  useEffect(() => {
    api.get<ProjectOption[]>('/projects').then(p => setProjectOptions(p)).catch(() => {});
  }, []);

  // Fetch reports from API
  const { data: apiReports, loading, error, refetch } = useApi<Report[]>(async () => {
    const raw = await api.get<ApiReport[]>('/reports');
    return raw.map(mapApiReport);
  }, []);

  useEffect(() => {
    if (apiReports) setReports(apiReports);
  }, [apiReports]);

  const resetForm = () => {
    setFormProjectId('');
    setFormPeriodStart('');
    setFormPeriodEnd('');
    setFormRecipients('');
  };

  const handleGenerate = async () => {
    if (!formProjectId || !formPeriodStart || !formPeriodEnd) return;
    setGenerating(true);
    try {
      await api.post(`/reports?project_id=${formProjectId}`, {
        period_start: formPeriodStart,
        period_end: formPeriodEnd,
        recipients: formRecipients || null,
      });
      refetch();
      setShowGenerateModal(false);
      resetForm();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al generar reporte');
    }
    setGenerating(false);
  };

  const handleDownload = async (report: Report) => {
    try {
      const token = localStorage.getItem('pmo_token');
      const url = `${API_BASE_URL}/reports/${report.id}/download`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `reporte_${report.id}.html`;
      a.click();
    } catch {
      toastError('Error al descargar reporte');
    }
  };

  const sortedReports = [...reports].sort((a, b) => {
    if (sortBy === 'project') return a.projectName.localeCompare(b.projectName);
    return b.date.localeCompare(a.date);
  });

  const handleView = (report: Report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const handleSend = async (reportId: number) => {
    try {
      await api.patch(`/reports/${reportId}`, { status: 'sent' });
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al enviar reporte');
    }
  };

  const handleDelete = async (reportId: number) => {
    try {
      await api.delete(`/reports/${reportId}`);
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al eliminar reporte');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error && reports.length === 0) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('reports.title') }]}
        title={t('reports.title')}
      >
        <button
          onClick={() => setShowGenerateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('reports.generate')}
        </button>
      </PageHeader>

      {/* Sort Panel */}
      <div className="liquid-glass-border rounded-xl p-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ordenar por</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as 'project' | 'date')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="date">Fecha</option>
              <option value="project">Proyecto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports list */}
      {sortedReports.length === 0 ? (
        <div className="liquid-glass-border rounded-xl p-12 text-center">
          <FileBarChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{t('reports.noReports')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedReports.map(report => (
            <div
              key={report.id}
              className="liquid-glass-border rounded-xl p-5 flex items-center justify-between hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  report.type === 'avance' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {report.type === 'avance' ? <FileBarChart className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.type === 'avance' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {report.type === 'avance' ? t('reports.avance') : t('reports.seguimiento')}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {report.status === 'sent' ? t('reports.sent') : t('reports.draft')}
                    </span>
                    {report.aiGenerated && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        <Bot className="w-3 h-3" /> AI
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{report.projectName}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {report.date} &middot; {report.periodStart} a {report.periodEnd}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleView(report)} title={t('reports.view')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => handleDownload(report)} title={t('reports.download')} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(report.id)} title={t('reports.delete')} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="liquid-modal rounded-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('reports.generate')}</h3>
              <button onClick={() => { setShowGenerateModal(false); resetForm(); }} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('reports.project')} *</label>
                <select value={formProjectId} onChange={e => setFormProjectId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Seleccionar proyecto...</option>
                  {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('reports.period')} *</label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={formPeriodStart} onChange={e => setFormPeriodStart(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="date" value={formPeriodEnd} onChange={e => setFormPeriodEnd(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('reports.recipients')}</label>
                <input type="text" value={formRecipients} onChange={e => setFormRecipients(e.target.value)} placeholder="correo1@empresa.com, correo2@empresa.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => { setShowGenerateModal(false); resetForm(); }} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleGenerate} disabled={!formProjectId || !formPeriodStart || !formPeriodEnd || generating} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generando...</>
                ) : (
                  <><Plus className="w-4 h-4" /> {t('reports.generate')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="liquid-modal rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{selectedReport.projectName}</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedReport.type === 'avance' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {selectedReport.type === 'avance' ? t('reports.avance') : t('reports.seguimiento')}
                </span>
              </div>
              <button onClick={() => { setShowDetailModal(false); setSelectedReport(null); }} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1">
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedReport.htmlContent }} />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
              <button onClick={() => { setShowDetailModal(false); setSelectedReport(null); }} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                {t('common.cancel')}
              </button>
              {selectedReport.status === 'draft' && (
                <button onClick={() => { handleSend(selectedReport.id); setShowDetailModal(false); setSelectedReport(null); }} className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                  <Send className="w-4 h-4" /> {t('reports.send')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
