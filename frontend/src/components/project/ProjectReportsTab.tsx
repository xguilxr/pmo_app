import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, BarChart3, Download, FileBarChart, Calendar, Trash2, Send, Eye, Sparkles, TrendingUp, FileCheck, ClipboardList } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import type { Report } from '../../types';

const REPORT_TYPES = [
  { id: 'avance', label: 'Avance', desc: 'Estado general, progreso de tareas, riesgos e issues', icon: FileBarChart, color: 'blue' },
  { id: 'seguimiento', label: 'Seguimiento', desc: 'Qué se hizo, qué se hará, impedimentos', icon: BarChart3, color: 'amber' },
  { id: 'ejecutivo', label: 'Ejecutivo', desc: 'Resumen de alto nivel para dirección con semáforos', icon: TrendingUp, color: 'indigo' },
  { id: 'cierre', label: 'Cierre', desc: 'Reporte final: resultados, lecciones, métricas', icon: FileCheck, color: 'emerald' },
] as const;

type ReportType = typeof REPORT_TYPES[number]['id'];

const TYPE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  avance: { bg: 'bg-blue-100 dark:bg-blue-950/50', text: 'text-blue-600', badge: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' },
  seguimiento: { bg: 'bg-amber-100 dark:bg-amber-950/50', text: 'text-amber-600', badge: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' },
  ejecutivo: { bg: 'bg-indigo-100 dark:bg-indigo-950/50', text: 'text-indigo-600', badge: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400' },
  cierre: { bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-600', badge: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' },
};

export default function ProjectReportsTab({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  const { toastSuccess, toastError } = useToast();
  const { data: reports, loading, refetch } = useApi<Report[]>(
    () => api.get(`/reports?project_id=${projectId}`),
    [projectId]
  );

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [formType, setFormType] = useState<ReportType>('avance');
  const [formPeriodStart, setFormPeriodStart] = useState('');
  const [formPeriodEnd, setFormPeriodEnd] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [generating, setGenerating] = useState(false);

  const resetForm = () => {
    setFormType('avance');
    setFormPeriodStart('');
    setFormPeriodEnd('');
    setUseAI(true);
  };

  const handleGenerate = async () => {
    if (!formPeriodStart || !formPeriodEnd) return;
    setGenerating(true);
    try {
      const typeLabel = REPORT_TYPES.find(r => r.id === formType)?.label || 'Avance';
      const title = `Reporte ${typeLabel} — ${formPeriodStart} a ${formPeriodEnd}`;
      await api.post(`/reports?project_id=${projectId}`, {
        title,
        report_type: formType,
        period_start: formPeriodStart,
        period_end: formPeriodEnd,
        status: 'draft',
        use_ai: useAI,
      });
      toastSuccess(useAI ? 'Reporte generado con IA' : 'Reporte generado');
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
    try { await api.delete(`/reports/${id}`); toastSuccess('Reporte eliminado'); refetch(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Error al eliminar reporte'); }
  };

  const handleMarkSent = async (id: number) => {
    try { await api.patch(`/reports/${id}`, { status: 'sent' }); toastSuccess('Reporte marcado como enviado'); refetch(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Error al actualizar reporte'); }
  };

  const handleDownload = (id: number) => {
    const token = localStorage.getItem('pmo_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/reports/${id}/download`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `reporte_${id}.html`; a.click(); })
      .catch(() => toastError('Error al descargar'));
  };

  const getReportType = (title: string): string => {
    if (title.toLowerCase().includes('seguimiento')) return 'seguimiento';
    if (title.toLowerCase().includes('ejecutivo')) return 'ejecutivo';
    if (title.toLowerCase().includes('cierre')) return 'cierre';
    return 'avance';
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
          className="inline-flex items-center gap-2 px-4 py-2 btn-glow text-white rounded-xl text-[12px] font-semibold"
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
            const colors = TYPE_COLORS[reportType] || TYPE_COLORS.avance;
            const TypeIcon = REPORT_TYPES.find(r => r.id === reportType)?.icon || FileBarChart;
            return (
              <div
                key={report.id}
                className="liquid-glass-border rounded-2xl p-5 flex items-center justify-between hover:bg-surface-hover transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} ${colors.text}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-text-primary mb-1">{report.title}</p>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors.badge}`}>
                        {REPORT_TYPES.find(r => r.id === reportType)?.label || 'Avance'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        report.status === 'sent' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-surface-tertiary text-text-secondary'
                      }`}>
                        {report.status === 'sent' ? t('reports.sent') : t('reports.draft')}
                      </span>
                      {report.ai_model_used && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400">
                          <Sparkles className="w-3 h-3" /> IA
                        </span>
                      )}
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
                    <button onClick={() => { setPreviewReport(report); setShowPreviewModal(true); }} className="p-2 hover:bg-surface-tertiary rounded-xl transition-colors" title="Vista previa">
                      <Eye className="w-4 h-4 text-text-tertiary" />
                    </button>
                  )}
                  <button onClick={() => handleDownload(report.id)} className="p-2 hover:bg-surface-tertiary rounded-xl transition-colors" title="Descargar">
                    <Download className="w-4 h-4 text-text-tertiary" />
                  </button>
                  {report.status === 'draft' && (
                    <button onClick={() => handleMarkSent(report.id)} className="p-2 hover:bg-surface-tertiary rounded-xl transition-colors" title="Marcar como enviado">
                      <Send className="w-4 h-4 text-text-tertiary" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(report.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors" title="Eliminar">
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
            <div className="p-6 space-y-5">
              {/* Report type selector */}
              <div>
                <label className={labelCls}>Tipo de Reporte *</label>
                <div className="grid grid-cols-2 gap-2">
                  {REPORT_TYPES.map(rt => {
                    const Icon = rt.icon;
                    const isSelected = formType === rt.id;
                    const colorMap: Record<string, string> = {
                      blue: isSelected ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400' : '',
                      amber: isSelected ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400' : '',
                      indigo: isSelected ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400' : '',
                      emerald: isSelected ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400' : '',
                    };
                    return (
                      <button
                        key={rt.id}
                        onClick={() => setFormType(rt.id)}
                        className={`flex items-start gap-2.5 px-3 py-3 rounded-xl text-left text-[12px] border transition-all ${
                          isSelected ? colorMap[rt.color] : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
                        }`}
                      >
                        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold">{rt.label}</p>
                          <p className={`text-[11px] mt-0.5 ${isSelected ? 'opacity-70' : 'text-text-tertiary'}`}>{rt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Period */}
              <div>
                <label className={labelCls}>Período *</label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={formPeriodStart} onChange={e => setFormPeriodStart(e.target.value)} className={inputCls} />
                  <input type="date" value={formPeriodEnd} onChange={e => setFormPeriodEnd(e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* AI toggle */}
              <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                useAI ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50' : 'bg-surface-tertiary border-border'
              }`}>
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${useAI ? 'text-purple-600 dark:text-purple-400' : 'text-text-tertiary'}`} />
                  <div>
                    <span className={`text-[12px] font-semibold ${useAI ? 'text-purple-700 dark:text-purple-400' : 'text-text-secondary'}`}>
                      Generar con IA (modelo local)
                    </span>
                    <p className={`text-[11px] ${useAI ? 'text-purple-600/70 dark:text-purple-400/70' : 'text-text-tertiary'}`}>
                      {useAI ? 'El contenido será generado por IA con análisis de datos del proyecto' : 'Se generará un reporte con plantilla estándar'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setUseAI(!useAI)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${useAI ? 'bg-purple-500' : 'bg-border'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${useAI ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => { setShowGenerateModal(false); resetForm(); }} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleGenerate}
                disabled={!formPeriodStart || !formPeriodEnd || generating}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-[13px] font-semibold shadow-sm transition-colors disabled:opacity-50 ${
                  useAI ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/25' : 'btn-glow'
                }`}
              >
                {useAI && <Sparkles className="w-3.5 h-3.5" />}
                {generating ? (useAI ? 'Generando con IA...' : 'Generando...') : t('reports.generate')}
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
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-text-primary">{previewReport.title}</h3>
                {previewReport.ai_model_used && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400">
                    <Sparkles className="w-3 h-3" /> {previewReport.ai_model_used}
                  </span>
                )}
              </div>
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
              <button onClick={() => handleDownload(previewReport.id)} className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-[13px] font-medium text-text-secondary hover:bg-surface-hover transition-all">
                <Download className="w-4 h-4" /> Descargar
              </button>
              <button onClick={() => setShowPreviewModal(false)} className="px-4 py-2.5 text-[13px] font-medium btn-glow text-white rounded-xl">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
