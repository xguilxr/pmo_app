import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, BarChart3, Download, FileBarChart, Calendar, Trash2, Send, Eye } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

interface Report {
  id: number;
  title: string;
  content_html: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string;
  recipients: string | null;
  sent_date: string | null;
  ai_model_used: string | null;
  project_id: number;
  created_at: string;
}

export default function ProjectReportsTab({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  const { toastSuccess, toastError } = useToast();
  const { data: reports, loading, refetch } = useApi<Report[]>(
    () => api.get(`/reports?project_id=${projectId}`),
    [projectId]   );

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [formType, setFormType] = useState<'avance' | 'seguimiento'>('avance');
  const [formPeriodStart, setFormPeriodStart] = useState('');
  const [formPeriodEnd, setFormPeriodEnd] = useState('');
  const [generating, setGenerating] = useState(false);

  const resetForm = () => {
    setFormType('avance');
    setFormPeriodStart('');
    setFormPeriodEnd('');
  };

  const handleGenerate = async () => {
    if (!formPeriodStart || !formPeriodEnd) return;
    setGenerating(true);
    try {
      const title = formType === 'avance'
        ? `Reporte de Avance - ${formPeriodStart} a ${formPeriodEnd}`
        : `Reporte de Seguimiento - ${formPeriodStart} a ${formPeriodEnd}`;
      await api.post(`/reports?project_id=${projectId}`, {
        title,
        period_start: formPeriodStart,
        period_end: formPeriodEnd,
        status: 'draft',
      });
      toastSuccess('Reporte generado exitosamente');
      setShowGenerateModal(false);
      resetForm();
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al generar reporte');
    }
    setGenerating(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este reporte?')) return;
    try {
      await api.delete(`/reports/${id}`);
      toastSuccess('Reporte eliminado');
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al eliminar reporte');
    }
  };

  const handleMarkSent = async (id: number) => {
    try {
      await api.patch(`/reports/${id}`, { status: 'sent' });
      toastSuccess('Reporte marcado como enviado');
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al actualizar reporte');
    }
  };

  const handleDownload = (id: number) => {
    const token = localStorage.getItem('pmo_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/reports/${id}/download`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `reporte_${id}.html`;
        a.click();
      })
      .catch(() => toastError('Error al descargar'));
  };

  const handlePreview = (report: Report) => {
    setPreviewReport(report);
    setShowPreviewModal(true);
  };

  const getReportType = (title: string): 'avance' | 'seguimiento' => {
    return title.toLowerCase().includes('seguimiento') ? 'seguimiento' : 'avance';
  };

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-text-primary">{t('nav.reports')}</h3>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('reports.generate')}
        </button>
      </div>

      {!reports || reports.length === 0 ? (
        <div className="text-center py-12 liquid-glass-border rounded-2xl">
          <FileBarChart className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-30" />
          <p className="text-[13px] text-text-tertiary">{t('reports.noReports')}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {reports.map(report => {
            const reportType = getReportType(report.title);
            return (
              <div
                key={report.id}
                className="liquid-glass-border rounded-2xl p-5 flex items-center justify-between hover:bg-surface-hover transition-all animate-fade-in"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    reportType === 'avance' ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-600' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600'
                  }`}>
                    {reportType === 'avance' ? <FileBarChart className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-text-primary mb-1">{report.title}</p>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        reportType === 'avance' ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                      }`}>
                        {reportType === 'avance' ? t('reports.avance') : t('reports.seguimiento')}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        report.status === 'sent' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-surface-tertiary text-text-secondary'
                      }`}>
                        {report.status === 'sent' ? t('reports.sent') : t('reports.draft')}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-tertiary flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {report.created_at?.slice(0, 10)}
                      {report.period_start && report.period_end && (
                        <> &middot; {report.period_start} a {report.period_end}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {report.content_html && (
                    <button
                      onClick={() => handlePreview(report)}
                      className="p-2 hover:bg-surface-tertiary rounded-xl transition-colors"
                      title="Vista previa"
                    >
                      <Eye className="w-4 h-4 text-text-tertiary" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(report.id)}
                    className="p-2 hover:bg-surface-tertiary rounded-xl transition-colors"
                    title="Descargar"
                  >
                    <Download className="w-4 h-4 text-text-tertiary" />
                  </button>
                  {report.status === 'draft' && (
                    <button
                      onClick={() => handleMarkSent(report.id)}
                      className="p-2 hover:bg-surface-tertiary rounded-xl transition-colors"
                      title="Marcar como enviado"
                    >
                      <Send className="w-4 h-4 text-text-tertiary" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-[15px] font-bold text-text-primary">{t('reports.generate')}</h3>
              <button onClick={() => { setShowGenerateModal(false); resetForm(); }} className="p-1.5 hover:bg-surface-hover rounded-xl">
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Report type */}
              <div>
                <label className={labelCls}>{t('reports.type')} *</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFormType('avance')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
                      formType === 'avance' ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400' : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    <FileBarChart className="w-4 h-4" />
                    {t('reports.avance')}
                  </button>
                  <button
                    onClick={() => setFormType('seguimiento')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
                      formType === 'seguimiento' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400' : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    {t('reports.seguimiento')}
                  </button>
                </div>
              </div>

              {/* Period */}
              <div>
                <label className={labelCls}>{t('reports.period')} *</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={formPeriodStart}
                    onChange={e => setFormPeriodStart(e.target.value)}
                    className={inputCls}
                  />
                  <input
                    type="date"
                    value={formPeriodEnd}
                    onChange={e => setFormPeriodEnd(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => { setShowGenerateModal(false); resetForm(); }}
                className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleGenerate}
                disabled={!formPeriodStart || !formPeriodEnd || generating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-[13px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                {generating ? 'Generando...' : t('reports.generate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewReport && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-3xl animate-fade-in max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="text-[15px] font-bold text-text-primary">{previewReport.title}</h3>
              <button onClick={() => setShowPreviewModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl">
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div
                className="prose dark:prose-invert max-w-none text-[13px] text-text-primary"
                dangerouslySetInnerHTML={{ __html: previewReport.content_html || '<p>Sin contenido</p>' }}
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
              <button
                onClick={() => handleDownload(previewReport.id)}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-[13px] font-medium text-text-secondary hover:bg-surface-hover transition-all"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2.5 text-[13px] font-medium btn-glow text-white rounded-xl shadow-sm shadow-accent/25"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
