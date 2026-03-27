import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, BarChart3, Download, FileBarChart, Bot, Calendar } from 'lucide-react';

interface ProjectReport {
  id: number;
  type: 'avance' | 'seguimiento';
  date: string;
  status: 'draft' | 'sent';
  periodStart: string;
  periodEnd: string;
}

const mockProjectReports: Record<number, ProjectReport[]> = {
  1: [
    { id: 1, type: 'avance', date: '2026-03-20', status: 'sent', periodStart: '2026-03-14', periodEnd: '2026-03-20' },
    { id: 2, type: 'seguimiento', date: '2026-03-13', status: 'sent', periodStart: '2026-03-07', periodEnd: '2026-03-13' },
    { id: 3, type: 'avance', date: '2026-03-06', status: 'draft', periodStart: '2026-02-28', periodEnd: '2026-03-06' },
  ],
};

export default function ProjectReportsTab({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  const [reports, setReports] = useState<ProjectReport[]>(mockProjectReports[projectId] || [
    { id: 101, type: 'avance', date: '2026-03-15', status: 'sent', periodStart: '2026-03-09', periodEnd: '2026-03-15' },
    { id: 102, type: 'seguimiento', date: '2026-03-08', status: 'draft', periodStart: '2026-03-02', periodEnd: '2026-03-08' },
  ]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [formType, setFormType] = useState<'avance' | 'seguimiento'>('avance');
  const [formPeriodStart, setFormPeriodStart] = useState('');
  const [formPeriodEnd, setFormPeriodEnd] = useState('');
  const [formAIGenerate, setFormAIGenerate] = useState(false);

  const resetForm = () => {
    setFormType('avance');
    setFormPeriodStart('');
    setFormPeriodEnd('');
    setFormAIGenerate(false);
  };

  const handleGenerate = () => {
    if (!formPeriodStart || !formPeriodEnd) return;
    const newReport: ProjectReport = {
      id: Date.now(),
      type: formType,
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      periodStart: formPeriodStart,
      periodEnd: formPeriodEnd,
    };
    setReports(prev => [newReport, ...prev]);
    setShowGenerateModal(false);
    resetForm();
  };

  const handleDownload = (report: ProjectReport) => {
    console.log('Downloading report:', report.id, report.type, report.date);
    alert(`Descargando reporte ${report.type === 'avance' ? 'de Avance' : 'de Seguimiento'} del ${report.date}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">{t('nav.reports')}</h3>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('reports.generate')}
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FileBarChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('reports.noReports')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map(report => (
            <div
              key={report.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:shadow-sm transition-shadow"
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
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {report.date} &middot; {report.periodStart} a {report.periodEnd}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownload(report)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('reports.generate')}</h3>
              <button onClick={() => { setShowGenerateModal(false); resetForm(); }} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Report type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('reports.type')} *</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFormType('avance')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      formType === 'avance' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <FileBarChart className="w-4 h-4" />
                    {t('reports.avance')}
                  </button>
                  <button
                    onClick={() => setFormType('seguimiento')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      formType === 'seguimiento' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
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
                  <input type="date" value={formPeriodStart} onChange={e => setFormPeriodStart(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="date" value={formPeriodEnd} onChange={e => setFormPeriodEnd(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* AI toggle */}
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">{t('reports.generateWithAI')}</span>
                </div>
                <button
                  onClick={() => setFormAIGenerate(!formAIGenerate)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${formAIGenerate ? 'bg-purple-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formAIGenerate ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => { setShowGenerateModal(false); resetForm(); }} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">{t('common.cancel')}</button>
              <button
                onClick={handleGenerate}
                disabled={!formPeriodStart || !formPeriodEnd}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                {t('reports.generate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
