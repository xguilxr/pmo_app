import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Eye, Send, Trash2, X, FileBarChart, BarChart3, Bot, Calendar } from 'lucide-react';
import { projects } from '../data/mock';
import PageHeader from '../components/common/PageHeader';

interface Report {
  id: number;
  type: 'avance' | 'seguimiento';
  projectName: string;
  date: string;
  status: 'draft' | 'sent';
  periodStart: string;
  periodEnd: string;
  recipients: string;
  aiGenerated: boolean;
  htmlContent: string;
}

const sampleReports: Report[] = [
  {
    id: 1,
    type: 'avance',
    projectName: 'Migración ERP SAP',
    date: '2026-03-20',
    status: 'sent',
    periodStart: '2026-03-14',
    periodEnd: '2026-03-20',
    recipients: 'director@grupoalfa.com, pmo@grupoalfa.com',
    aiGenerated: true,
    htmlContent: `
      <h2 style="color:#1e3a5f;border-bottom:2px solid #3b82f6;padding-bottom:8px;">Reporte de Avance Semanal</h2>
      <p><strong>Proyecto:</strong> Migración ERP SAP &nbsp;|&nbsp; <strong>Periodo:</strong> 14 Mar - 20 Mar 2026</p>
      <h3 style="color:#1e3a5f;">KPIs del Periodo</h3>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;">
        <tr style="background:#f1f5f9;"><th style="text-align:left;padding:8px;border:1px solid #e2e8f0;">Indicador</th><th style="padding:8px;border:1px solid #e2e8f0;">Valor</th></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;">Avance Real</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">65%</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;">Avance Planificado</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">70%</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;">SPI</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">0.93</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;">CPI</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">1.02</td></tr>
      </table>
      <h3 style="color:#1e3a5f;">Avance por Área</h3>
      <ul><li>Infraestructura: 80%</li><li>Desarrollo: 60%</li><li>Migración de datos: 45%</li><li>Capacitación: 20%</li></ul>
      <h3 style="color:#1e3a5f;">RAID</h3>
      <p><strong>Riesgos:</strong> Retraso en entrega de servidores por proveedor (probabilidad: alta).</p>
      <p><strong>Acciones:</strong> Escalamiento a dirección de compras.</p>
      <p><strong>Issues:</strong> Incompatibilidad módulo FI con versión anterior.</p>
      <p><strong>Decisiones:</strong> Se aprueba extensión de 2 semanas para fase de migración de datos.</p>
      <h3 style="color:#1e3a5f;">Resumen de Minutas</h3>
      <p>Se realizaron 2 reuniones de seguimiento. Principales acuerdos: priorizar migración de datos maestros y validar interfaces con sistemas legados.</p>
    `,
  },
  {
    id: 2,
    type: 'seguimiento',
    projectName: 'Portal Clientes B2B',
    date: '2026-03-22',
    status: 'draft',
    periodStart: '2026-03-16',
    periodEnd: '2026-03-22',
    recipients: 'pm@technova.com',
    aiGenerated: false,
    htmlContent: `
      <h2 style="color:#1e3a5f;border-bottom:2px solid #f59e0b;padding-bottom:8px;">Reporte de Seguimiento de Actividades</h2>
      <p><strong>Proyecto:</strong> Portal Clientes B2B &nbsp;|&nbsp; <strong>Periodo:</strong> 16 Mar - 22 Mar 2026</p>
      <h3 style="color:#1e3a5f;">Tareas del Periodo</h3>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;">
        <tr style="background:#f1f5f9;"><th style="text-align:left;padding:8px;border:1px solid #e2e8f0;">Tarea</th><th style="padding:8px;border:1px solid #e2e8f0;">Responsable</th><th style="padding:8px;border:1px solid #e2e8f0;">Estado</th><th style="padding:8px;border:1px solid #e2e8f0;">Retraso</th></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;">Diseño UI catálogo</td><td style="padding:8px;border:1px solid #e2e8f0;">Ana López</td><td style="padding:8px;border:1px solid #e2e8f0;color:green;">Completada</td><td style="padding:8px;border:1px solid #e2e8f0;">-</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;">API de pedidos</td><td style="padding:8px;border:1px solid #e2e8f0;">Carlos Ruiz</td><td style="padding:8px;border:1px solid #e2e8f0;color:orange;">En progreso</td><td style="padding:8px;border:1px solid #e2e8f0;color:red;">+3 días</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;">Integración pasarela pago</td><td style="padding:8px;border:1px solid #e2e8f0;">María García</td><td style="padding:8px;border:1px solid #e2e8f0;color:gray;">Pendiente</td><td style="padding:8px;border:1px solid #e2e8f0;">-</td></tr>
      </table>
      <h3 style="color:#1e3a5f;">Actividades con Retraso</h3>
      <p><strong>API de pedidos:</strong> Retraso de 3 días debido a cambios en requerimientos del cliente. Se reprogramó entrega para el 25 de marzo.</p>
    `,
  },
  {
    id: 3,
    type: 'avance',
    projectName: 'Implementación CRM Salesforce',
    date: '2026-03-18',
    status: 'sent',
    periodStart: '2026-03-11',
    periodEnd: '2026-03-18',
    recipients: 'cto@serviciosglobal.com, pmo@serviciosglobal.com',
    aiGenerated: true,
    htmlContent: `
      <h2 style="color:#1e3a5f;border-bottom:2px solid #3b82f6;padding-bottom:8px;">Reporte de Avance Semanal</h2>
      <p><strong>Proyecto:</strong> Implementación CRM Salesforce &nbsp;|&nbsp; <strong>Periodo:</strong> 11 Mar - 18 Mar 2026</p>
      <h3 style="color:#1e3a5f;">KPIs del Periodo</h3>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;">
        <tr style="background:#f1f5f9;"><th style="text-align:left;padding:8px;border:1px solid #e2e8f0;">Indicador</th><th style="padding:8px;border:1px solid #e2e8f0;">Valor</th></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;">Avance Real</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">30%</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;">Avance Planificado</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">50%</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;">SPI</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;color:red;">0.60</td></tr>
      </table>
      <h3 style="color:#1e3a5f;">Estado: <span style="color:red;">EN RIESGO</span></h3>
      <p>El proyecto presenta un retraso significativo de 20 puntos porcentuales. Se requiere plan de acción inmediato.</p>
    `,
  },
  {
    id: 4,
    type: 'seguimiento',
    projectName: 'Automatización Nómina',
    date: '2026-03-25',
    status: 'draft',
    periodStart: '2026-03-19',
    periodEnd: '2026-03-25',
    recipients: 'rh@grupoalfa.com',
    aiGenerated: false,
    htmlContent: `
      <h2 style="color:#1e3a5f;border-bottom:2px solid #f59e0b;padding-bottom:8px;">Reporte de Seguimiento de Actividades</h2>
      <p><strong>Proyecto:</strong> Automatización Nómina &nbsp;|&nbsp; <strong>Periodo:</strong> 19 Mar - 25 Mar 2026</p>
      <h3 style="color:#1e3a5f;">Tareas del Periodo</h3>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;">
        <tr style="background:#f1f5f9;"><th style="text-align:left;padding:8px;border:1px solid #e2e8f0;">Tarea</th><th style="padding:8px;border:1px solid #e2e8f0;">Responsable</th><th style="padding:8px;border:1px solid #e2e8f0;">Estado</th><th style="padding:8px;border:1px solid #e2e8f0;">Retraso</th></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;">Levantamiento de requisitos</td><td style="padding:8px;border:1px solid #e2e8f0;">Pedro Sánchez</td><td style="padding:8px;border:1px solid #e2e8f0;color:green;">Completada</td><td style="padding:8px;border:1px solid #e2e8f0;">-</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;">Diseño de flujos</td><td style="padding:8px;border:1px solid #e2e8f0;">Laura Méndez</td><td style="padding:8px;border:1px solid #e2e8f0;color:orange;">En progreso</td><td style="padding:8px;border:1px solid #e2e8f0;">-</td></tr>
      </table>
      <p>Sin actividades con retraso en este periodo.</p>
    `,
  },
];

export default function ReportsPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>(sampleReports);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Generate form state
  const [formProjectId, setFormProjectId] = useState('');
  const [formType, setFormType] = useState<'avance' | 'seguimiento'>('avance');
  const [formPeriodStart, setFormPeriodStart] = useState('');
  const [formPeriodEnd, setFormPeriodEnd] = useState('');
  const [formRecipients, setFormRecipients] = useState('');
  const [formAIGenerate, setFormAIGenerate] = useState(false);

  const activeProjects = projects.filter(p => p.phase !== 'Cerrado');

  const resetForm = () => {
    setFormProjectId('');
    setFormType('avance');
    setFormPeriodStart('');
    setFormPeriodEnd('');
    setFormRecipients('');
    setFormAIGenerate(false);
  };

  const handleGenerate = () => {
    const project = projects.find(p => p.id === parseInt(formProjectId));
    if (!project || !formPeriodStart || !formPeriodEnd) return;

    const newReport: Report = {
      id: Date.now(),
      type: formType,
      projectName: project.name,
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      periodStart: formPeriodStart,
      periodEnd: formPeriodEnd,
      recipients: formRecipients,
      aiGenerated: formAIGenerate,
      htmlContent: formType === 'avance'
        ? `
          <h2 style="color:#1e3a5f;border-bottom:2px solid #3b82f6;padding-bottom:8px;">Reporte de Avance Semanal</h2>
          <p><strong>Proyecto:</strong> ${project.name} &nbsp;|&nbsp; <strong>Periodo:</strong> ${formPeriodStart} - ${formPeriodEnd}</p>
          <h3 style="color:#1e3a5f;">KPIs del Periodo</h3>
          <table style="width:100%;border-collapse:collapse;margin:12px 0;">
            <tr style="background:#f1f5f9;"><th style="text-align:left;padding:8px;border:1px solid #e2e8f0;">Indicador</th><th style="padding:8px;border:1px solid #e2e8f0;">Valor</th></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0;">Avance Real</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${project.progress}%</td></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0;">Avance Planificado</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${project.plannedProgress}%</td></tr>
          </table>
          ${formAIGenerate ? '<p style="color:#7c3aed;font-style:italic;">* Resumen generado automáticamente con Qwen AI</p>' : ''}
        `
        : `
          <h2 style="color:#1e3a5f;border-bottom:2px solid #f59e0b;padding-bottom:8px;">Reporte de Seguimiento de Actividades</h2>
          <p><strong>Proyecto:</strong> ${project.name} &nbsp;|&nbsp; <strong>Periodo:</strong> ${formPeriodStart} - ${formPeriodEnd}</p>
          <h3 style="color:#1e3a5f;">Tareas del Periodo</h3>
          <p style="color:#6b7280;">No hay tareas registradas para este periodo aún. Agregue actividades desde el módulo de proyectos.</p>
          ${formAIGenerate ? '<p style="color:#7c3aed;font-style:italic;">* Resumen generado automáticamente con Qwen AI</p>' : ''}
        `,
    };

    setReports(prev => [newReport, ...prev]);
    setShowGenerateModal(false);
    resetForm();
  };

  const handleView = (report: Report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const handleSend = (reportId: number) => {
    setReports(prev =>
      prev.map(r => r.id === reportId ? { ...r, status: 'sent' as const } : r)
    );
  };

  const handleDelete = (reportId: number) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

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

      {/* Reports list */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileBarChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{t('reports.noReports')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map(report => (
            <div
              key={report.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4">
                {/* Type icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  report.type === 'avance'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-amber-50 text-amber-600'
                }`}>
                  {report.type === 'avance'
                    ? <FileBarChart className="w-5 h-5" />
                    : <BarChart3 className="w-5 h-5" />
                  }
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.type === 'avance'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {report.type === 'avance' ? t('reports.avance') : t('reports.seguimiento')}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.status === 'sent'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {report.status === 'sent' ? t('reports.sent') : t('reports.draft')}
                    </span>
                    {report.aiGenerated && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        <Bot className="w-3 h-3" />
                        AI
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

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleView(report)}
                  title={t('reports.view')}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSend(report.id)}
                  title={t('reports.send')}
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(report.id)}
                  title={t('reports.delete')}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('reports.generate')}</h3>
              <button
                onClick={() => { setShowGenerateModal(false); resetForm(); }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {/* Project selector */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('reports.project')} *</label>
                <select
                  value={formProjectId}
                  onChange={e => setFormProjectId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Seleccionar proyecto...</option>
                  {activeProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Report type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('reports.type')} *</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFormType('avance')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      formType === 'avance'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <FileBarChart className="w-4 h-4" />
                    {t('reports.avance')}
                  </button>
                  <button
                    onClick={() => setFormType('seguimiento')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      formType === 'seguimiento'
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    {t('reports.seguimiento')}
                  </button>
                </div>
              </div>

              {/* Period */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('reports.period')} *</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={formPeriodStart}
                    onChange={e => setFormPeriodStart(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={formPeriodEnd}
                    onChange={e => setFormPeriodEnd(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Recipients */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('reports.recipients')}</label>
                <input
                  type="text"
                  value={formRecipients}
                  onChange={e => setFormRecipients(e.target.value)}
                  placeholder="correo1@empresa.com, correo2@empresa.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* AI toggle */}
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">{t('reports.generateWithAI')}</span>
                </div>
                <button
                  onClick={() => setFormAIGenerate(!formAIGenerate)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    formAIGenerate ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      formAIGenerate ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => { setShowGenerateModal(false); resetForm(); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleGenerate}
                disabled={!formProjectId || !formPeriodStart || !formPeriodEnd}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                {t('reports.generate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{selectedReport.projectName}</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedReport.type === 'avance'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {selectedReport.type === 'avance' ? t('reports.avance') : t('reports.seguimiento')}
                </span>
              </div>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedReport(null); }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body - report preview */}
            <div className="px-6 py-5 overflow-y-auto flex-1">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedReport.htmlContent }}
              />
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedReport(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  handleSend(selectedReport.id);
                  setShowDetailModal(false);
                  setSelectedReport(null);
                }}
                className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                {t('reports.send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
