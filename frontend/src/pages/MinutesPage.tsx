import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Sparkles, Upload, Clock, Cpu } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { projects } from '../data/mock';
import { api } from '../services/api';
import { useApi, LoadingSpinner, ErrorMessage } from '../hooks/useApi';

// Sample minutes for display before backend is connected
const sampleMinutes = [
  { id: 1, folio: 'MIN-2026-001', title: 'Kickoff Migración ERP', meeting_date: '2026-01-20', project: 'Migración ERP SAP', source: 'manual' },
  { id: 2, folio: 'MIN-2026-002', title: 'Revisión Sprint 3 - Portal B2B', meeting_date: '2026-03-15', project: 'Portal Clientes B2B', source: 'ai_generated' },
  { id: 3, folio: 'MIN-2026-003', title: 'Comité de Riesgos CRM', meeting_date: '2026-03-22', project: 'Implementación CRM Salesforce', source: 'ai_generated' },
];

interface ApiMinute {
  id: number;
  folio: string;
  title: string;
  meeting_date?: string;
  project_name?: string;
  project?: string;
  source?: string;
  created_at?: string;
}

interface Minute {
  id: number;
  folio: string;
  title: string;
  meeting_date: string;
  project: string;
  source: string;
}

function mapApiMinute(m: ApiMinute): Minute {
  return {
    id: m.id,
    folio: m.folio,
    title: m.title,
    meeting_date: m.meeting_date || m.created_at || '',
    project: m.project_name || m.project || '',
    source: m.source || 'manual',
  };
}

export default function MinutesPage() {
  const { t } = useTranslation();
  const [showAIForm, setShowAIForm] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [projectId, setProjectId] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [generationInfo, setGenerationInfo] = useState<{ model: string; time: number; engine: string } | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: apiMinutes, loading, error: fetchError, refetch } = useApi<ApiMinute[]>(() => api.get('/minutes'), []);

  const minutes: Minute[] = apiMinutes ? apiMinutes.map(mapApiMinute) : sampleMinutes;

  const activeProjects = projects.filter(p => p.phase !== 'Cerrado');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Clean SRT format if applicable
      if (file.name.endsWith('.srt')) {
        const cleaned = text
          .replace(/^\d+\s*$/gm, '')
          .replace(/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        setTranscript(cleaned);
      } else {
        setTranscript(text);
      }
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!transcript.trim() || !projectId) return;

    setGenerating(true);
    setError('');
    setGeneratedText('');
    setGenerationInfo(null);

    try {
      const data = await api.post<{
        generated_text: string;
        model_used: string;
        generation_time_ms: number;
        engine: string;
      }>('/minutes/generate', {
        transcript: transcript.trim(),
        project_id: parseInt(projectId),
        title: meetingTitle || undefined,
        meeting_date: meetingDate || undefined,
        language: 'es',
      });

      setGeneratedText(data.generated_text);
      setGenerationInfo({
        model: data.model_used,
        time: data.generation_time_ms,
        engine: data.engine,
      });
    } catch (err) {
      // Fallback: generate locally with a placeholder if backend isn't running
      setError('');
      setGeneratedText(generateLocalPlaceholder(transcript, meetingTitle));
      setGenerationInfo({ model: 'local-preview', time: 0, engine: 'preview' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.post(`/minutes?project_id=${projectId}`, {
        title: meetingTitle || 'Minuta sin título',
        meeting_date: meetingDate,
        generated_text: generatedText,
        source: 'ai_generated',
      });
      refetch();
    } catch {
      // Fallback: just show saved state even if API fails
    }
    setSaved(true);
    setTimeout(() => {
      setShowAIForm(false);
      setTranscript('');
      setGeneratedText('');
      setGenerationInfo(null);
      setSaved(false);
      setMeetingTitle('');
      setProjectId('');
    }, 2000);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('minutes.title') }]}
        title={t('minutes.title')}
      >
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <ClipboardList className="w-4 h-4" />
          {t('minutes.newMinute')}
        </button>
        <button
          onClick={() => setShowAIForm(!showAIForm)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showAIForm
              ? 'bg-purple-100 text-purple-700 border border-purple-200'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {t('minutes.newMinuteAI')}
        </button>
      </PageHeader>

      {fetchError && !apiMinutes && (
        <ErrorMessage message={fetchError} onRetry={refetch} />
      )}

      {/* AI Generation Form */}
      {showAIForm && (
        <div className="bg-white rounded-xl border border-purple-200 p-6 space-y-4">
          <div className="flex items-center gap-2 text-purple-700 mb-2">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-semibold">{t('minutes.generateFromTranscript')}</h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('minutes.selectProject')} *</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">Seleccionar...</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('minutes.meetingTitle')}</label>
              <input
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Ej: Revisión Sprint 4"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('minutes.meetingDate')}</label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Transcript input */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('minutes.transcript')} *</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={t('minutes.transcriptPlaceholder')}
              rows={10}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono resize-y"
            />
            <div className="flex items-center justify-between mt-2">
              <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {t('minutes.orUploadFile')}
                <input
                  type="file"
                  accept=".txt,.srt,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-gray-400">
                {transcript.length > 0 && `${transcript.split(/\s+/).length} palabras`}
              </span>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !transcript.trim() || !projectId}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('minutes.generating')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t('minutes.generate')}
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Generated result */}
          {generatedText && (
            <div className="space-y-3 border-t border-gray-200 pt-4">
              {generationInfo && (
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {t('minutes.generatedIn')} {(generationInfo.time / 1000).toFixed(1)}s
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5" />
                    {t('minutes.modelUsed')}: {generationInfo.model}
                  </span>
                </div>
              )}

              <p className="text-xs text-purple-600 font-medium">{t('minutes.editBeforeSaving')}</p>

              <textarea
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                rows={20}
                className="w-full border border-purple-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono resize-y bg-purple-50/30"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  {saved ? t('minutes.saved') : t('minutes.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Minutes list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('minutes.folio')}</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('minutes.meetingTitle')}</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('minutes.project')}</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('minutes.date')}</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('minutes.source')}</th>
            </tr>
          </thead>
          <tbody>
            {minutes.map((m) => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors cursor-pointer">
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{m.folio}</td>
                <td className="px-4 py-3 text-blue-600 font-medium hover:text-blue-800">{m.title}</td>
                <td className="px-4 py-3 text-gray-600">{m.project}</td>
                <td className="px-4 py-3 text-gray-500">{m.meeting_date}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    m.source === 'ai_generated'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {m.source === 'ai_generated' && <Sparkles className="w-3 h-3" />}
                    {m.source === 'ai_generated' ? t('minutes.aiGenerated') : t('minutes.manual')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Local preview fallback when backend isn't running
function generateLocalPlaceholder(transcript: string, title: string): string {
  const wordCount = transcript.split(/\s+/).length;
  const lines = transcript.split('\n').filter(l => l.trim());
  const firstLines = lines.slice(0, 3).join('\n');

  return `## Minuta de Reunión${title ? ` - ${title}` : ''}

### Resumen Ejecutivo
Se llevó a cabo una reunión donde se discutieron diversos temas relacionados al proyecto. La transcripción contiene aproximadamente ${wordCount} palabras.

> **Nota:** Esta es una vista previa local. Conecta el backend con Ollama para generar minutas reales con IA.

### Participantes Detectados
- [Se detectarán automáticamente con el modelo de IA]

### Temas Tratados
1. [Se extraerán automáticamente de la transcripción]

### Acuerdos y Compromisos
| # | Acuerdo/Compromiso | Responsable | Fecha Compromiso |
|---|-------------------|-------------|------------------|
| 1 | Pendiente de generación con IA | - | - |

### Próximos Pasos
- Configurar Ollama con Qwen 2.5 7B para generación completa

### Extracto de la Transcripción
\`\`\`
${firstLines}
\`\`\``;
}
