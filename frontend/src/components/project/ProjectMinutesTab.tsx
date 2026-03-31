import { useState, useRef } from 'react';
import { Plus, Edit2, Trash2, X, ClipboardList, Sparkles, FileText, Upload, AlertTriangle, Target, Bug, CheckCircle2, Copy, ClipboardCheck } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

interface Minute {
  id: number;
  folio: string;
  title: string;
  meeting_date: string | null;
  topics: string | null;
  agreements: string | null;
  participants: string | null;
  source: string;
  ai_model_used: string | null;
  project_id: number;
  created_at: string;
  raid?: {
    risks: string[];
    actions: string[];
    issues: string[];
    decisions: string[];
  };
}

export default function ProjectMinutesTab({ projectId }: { projectId: number }) {
  const { toastSuccess, toastError } = useToast();
  const { data: minutes, loading, refetch } = useApi(() => api.get<Minute[]>(`/minutes?project_id=${projectId}`), [projectId]);
  const [showModal, setShowModal] = useState(false);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [editing, setEditing] = useState<Minute | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ title: '', meeting_date: '', participants: '', topics: '', agreements: '' });
  const [viewDetail, setViewDetail] = useState<Minute | null>(null);

  // Transcript form state
  const [transcriptText, setTranscriptText] = useState('');
  const [transcriptTitle, setTranscriptTitle] = useState('');
  const [transcriptDate, setTranscriptDate] = useState(new Date().toISOString().split('T')[0]);
  const [transcriptFileName, setTranscriptFileName] = useState('');
  const transcriptFileRef = useRef<HTMLInputElement>(null);

  // LLM Prompt generator state
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [promptTranscript, setPromptTranscript] = useState('');
  const [promptLang, setPromptLang] = useState<'es' | 'en'>('es');
  const promptFileRef = useRef<HTMLInputElement>(null);
  const [promptFileName, setPromptFileName] = useState('');

  const handlePromptFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPromptFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === 'string') setPromptTranscript(text.substring(0, 10000));
      };
      reader.readAsText(file);
    }
  };

  const generatePrompt = () => {
    const template = promptLang === 'es'
      ? `Eres un asistente de PMO experto. A partir de la siguiente transcripción de reunión, genera una minuta estructurada en español con el siguiente formato exacto:

## Minuta de Reunión

### Resumen Ejecutivo
[2-3 párrafos resumiendo los puntos más importantes de la reunión]

### Participantes Detectados
[Lista de nombres mencionados en la transcripción, uno por línea con viñeta]

### Temas Tratados
1. [Tema] - [Resumen breve de lo discutido]
2. ...

### Acuerdos y Compromisos
| # | Acuerdo/Compromiso | Responsable | Fecha Compromiso |
|---|-------------------|-------------|------------------|
| 1 | ... | ... | ... |

### Decisiones Tomadas
- [Decisión 1]
- [Decisión 2]
- ...

### Próximos Pasos
- [Paso] - [Responsable] - [Fecha tentativa]
- ...

### Riesgos o Bloqueos Mencionados
- [Riesgo/bloqueo 1] - [Impacto potencial]
- ...

### Elementos RAID Identificados
**Riesgos:** Listar riesgos identificados durante la reunión
**Acciones:** Listar acciones pendientes con responsable
**Issues/Problemas:** Listar problemas reportados
**Decisiones:** Listar decisiones finales tomadas

---
TRANSCRIPCIÓN:
${promptTranscript}

Genera la minuta completa ahora:`
      : `You are an expert PMO assistant. From the following meeting transcript, generate a structured meeting minutes in English with this exact format:

## Meeting Minutes

### Executive Summary
[2-3 paragraphs summarizing the key points of the meeting]

### Detected Participants
[List of names mentioned in the transcript, one per line with bullet]

### Topics Discussed
1. [Topic] - [Brief summary of what was discussed]
2. ...

### Agreements and Commitments
| # | Agreement/Commitment | Responsible | Due Date |
|---|---------------------|-------------|----------|
| 1 | ... | ... | ... |

### Decisions Made
- [Decision 1]
- [Decision 2]
- ...

### Next Steps
- [Step] - [Responsible] - [Tentative date]
- ...

### Risks or Blockers Mentioned
- [Risk/blocker 1] - [Potential impact]
- ...

### RAID Items Identified
**Risks:** List risks identified during the meeting
**Actions:** List pending actions with responsible party
**Issues:** List reported problems
**Decisions:** List final decisions made

---
TRANSCRIPT:
${promptTranscript}

Generate the complete minutes now:`;
    return template;
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatePrompt());
    setPromptCopied(true);
    toastSuccess('Prompt copiado al portapapeles');
    setTimeout(() => setPromptCopied(false), 3000);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', meeting_date: new Date().toISOString().split('T')[0], participants: '', topics: '', agreements: '' });
    setShowModal(true);
  };

  const openEdit = (m: Minute) => {
    setEditing(m);
    setForm({ title: m.title, meeting_date: m.meeting_date || '', participants: m.participants || '', topics: m.topics || '', agreements: m.agreements || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        meeting_date: form.meeting_date || null,
        participants: form.participants || null,
        topics: form.topics || null,
        agreements: form.agreements || null,
      };
      if (editing) {
        await api.patch(`/minutes/${editing.id}`, payload);
        toastSuccess('Minuta actualizada');
      } else {
        await api.post(`/minutes?project_id=${projectId}`, payload);
        toastSuccess('Minuta creada');
      }
      setShowModal(false);
      refetch();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta minuta?')) return;
    try { await api.delete(`/minutes/${id}`); toastSuccess('Minuta eliminada'); refetch(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
  };

  const openTranscriptModal = () => {
    setTranscriptText('');
    setTranscriptTitle('');
    setTranscriptDate(new Date().toISOString().split('T')[0]);
    setTranscriptFileName('');
    setShowTranscriptModal(true);
  };

  const handleTranscriptFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTranscriptFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === 'string') {
          setTranscriptText(text.substring(0, 5000));
        }
      };
      reader.readAsText(file);
    }
  };

  const handleGenerateFromTranscript = async () => {
    if (!transcriptTitle.trim() || !transcriptText.trim()) return;
    setGenerating(true);
    try {
      const result = await api.post<Minute>('/minutes/generate', {
        transcript: transcriptText,
        project_id: projectId,
        title: transcriptTitle,
        meeting_date: transcriptDate || null,
      });
      toastSuccess('Minuta generada con IA');
      setShowTranscriptModal(false);
      refetch();
      // Show the generated minute detail
      setViewDetail(result);
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error al generar minuta'); }
    setGenerating(false);
  };

  const sourceBadge = (s: string) => {
    if (s === 'ai_generated') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400"><Sparkles className="w-3 h-3" />IA</span>;
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-tertiary text-text-secondary">Manual</span>;
  };

  if (loading) return <LoadingSpinner />;

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-text-secondary">
          {(minutes || []).length} {(minutes || []).length === 1 ? 'minuta' : 'minutas'}
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setPromptTranscript(''); setPromptFileName(''); setPromptCopied(false); setShowPromptModal(true); }} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all">
            <Copy className="w-3.5 h-3.5" /> Prompt LLM
          </button>
          <button onClick={openTranscriptModal} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-xl text-[12px] font-semibold hover:bg-purple-700 dark:hover:bg-purple-600 shadow-sm shadow-purple-600/25">
            <FileText className="w-3.5 h-3.5" /> Generar con IA
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25">
            <Plus className="w-3.5 h-3.5" /> Nueva Minuta
          </button>
        </div>
      </div>

      {(minutes || []).length === 0 ? (
        <div className="text-center py-12 liquid-glass-border rounded-2xl">
          <ClipboardList className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-40" />
          <p className="text-[13px] text-text-tertiary">Sin minutas registradas</p>
        </div>
      ) : (
        <div className="liquid-glass-border rounded-2xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface-tertiary border-b border-border">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Folio</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Titulo</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Fuente</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(minutes || []).map(m => (
                <tr key={m.id} className="border-b border-border-light hover:bg-surface-hover transition-colors cursor-pointer" onClick={() => setViewDetail(m)}>
                  <td className="px-4 py-3 text-text-tertiary font-mono text-[11px]">{m.folio}</td>
                  <td className="px-4 py-3 text-text-primary font-medium">{m.title}</td>
                  <td className="px-4 py-3 text-text-secondary">{m.meeting_date || '-'}</td>
                  <td className="px-4 py-3">{sourceBadge(m.source)}</td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(m)} className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5 text-text-tertiary" /></button>
                    <button onClick={() => handleDelete(m.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors ml-1"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail view */}
      {viewDetail && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-2xl animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[11px] text-text-tertiary">{viewDetail.folio}</span>
                  {sourceBadge(viewDetail.source)}
                </div>
                <h3 className="text-[15px] font-bold text-text-primary">{viewDetail.title}</h3>
              </div>
              <button onClick={() => setViewDetail(null)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1">Fecha</p>
                <p className="text-[13px] text-text-primary">{viewDetail.meeting_date || '-'}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1">Participantes</p>
                <p className="text-[13px] text-text-primary">{viewDetail.participants || '-'}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1">Temas</p>
                <p className="text-[13px] text-text-primary whitespace-pre-line">{viewDetail.topics || '-'}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1">Acuerdos</p>
                <p className="text-[13px] text-text-primary whitespace-pre-line">{viewDetail.agreements || '-'}</p>
              </div>
              {viewDetail.raid && (
                <div>
                  <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-2">RAID</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Risks */}
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400" />
                        <h4 className="text-[12px] font-semibold text-red-700 dark:text-red-400">Riesgos</h4>
                      </div>
                      <ul className="space-y-1">
                        {viewDetail.raid.risks.map((item, i) => (
                          <li key={i} className="text-[11px] text-text-secondary flex items-start gap-1.5">
                            <span className="mt-1 w-1 h-1 rounded-full bg-red-400 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Actions */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Target className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                        <h4 className="text-[12px] font-semibold text-blue-700 dark:text-blue-400">Acciones</h4>
                      </div>
                      <ul className="space-y-1">
                        {viewDetail.raid.actions.map((item, i) => (
                          <li key={i} className="text-[11px] text-text-secondary flex items-start gap-1.5">
                            <span className="mt-1 w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Issues */}
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bug className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                        <h4 className="text-[12px] font-semibold text-amber-700 dark:text-amber-400">Problemas</h4>
                      </div>
                      <ul className="space-y-1">
                        {viewDetail.raid.issues.map((item, i) => (
                          <li key={i} className="text-[11px] text-text-secondary flex items-start gap-1.5">
                            <span className="mt-1 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Decisions */}
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                        <h4 className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">Decisiones</h4>
                      </div>
                      <ul className="space-y-1">
                        {viewDetail.raid.decisions.map((item, i) => (
                          <li key={i} className="text-[11px] text-text-secondary flex items-start gap-1.5">
                            <span className="mt-1 w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate from Transcript Modal */}
      {showTranscriptModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">Generar Minuta con IA</h3>
              <button onClick={() => setShowTranscriptModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div><label className={labelCls}>Titulo de la Reunion *</label><input value={transcriptTitle} onChange={e => setTranscriptTitle(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Fecha</label><input type="date" value={transcriptDate} onChange={e => setTranscriptDate(e.target.value)} className={inputCls} /></div>
              <div>
                <label className={labelCls}>Transcripcion *</label>
                <textarea value={transcriptText} onChange={e => setTranscriptText(e.target.value)} rows={5} placeholder="Pega aqui la transcripcion de la reunion..." className={inputCls} />
              </div>
              <div>
                <p className="text-[12px] text-text-tertiary mb-2">O sube un archivo de texto</p>
                <input ref={transcriptFileRef} type="file" accept=".txt,.srt,.docx" className="hidden" onChange={handleTranscriptFileSelect} />
                <button onClick={() => transcriptFileRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  {transcriptFileName || 'Seleccionar archivo'}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-[12px] font-semibold text-purple-700 dark:text-purple-400">Generacion con IA habilitada</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button onClick={() => setShowTranscriptModal(false)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">Cancelar</button>
              <button onClick={handleGenerateFromTranscript} disabled={generating || !transcriptTitle.trim() || !transcriptText.trim()} className="px-5 py-2.5 text-[13px] font-semibold bg-purple-600 dark:bg-purple-500 text-white rounded-xl hover:bg-purple-700 dark:hover:bg-purple-600 shadow-sm shadow-purple-600/25 disabled:opacity-50">
                {generating ? 'Generando...' : 'Generar Minuta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LLM Prompt Generator Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <div>
                <h3 className="text-[15px] font-bold text-text-primary">Generador de Prompt para Minutas</h3>
                <p className="text-[11px] text-text-tertiary mt-0.5">Pega tu transcripción, genera el prompt y cópialo a tu LLM favorito</p>
              </div>
              <button onClick={() => setShowPromptModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className={labelCls}>Idioma del Prompt</label>
                <div className="flex gap-2">
                  <button onClick={() => setPromptLang('es')} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${promptLang === 'es' ? 'bg-accent text-white shadow-sm' : 'bg-surface-tertiary text-text-secondary hover:text-text-primary'}`}>Español</button>
                  <button onClick={() => setPromptLang('en')} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${promptLang === 'en' ? 'bg-accent text-white shadow-sm' : 'bg-surface-tertiary text-text-secondary hover:text-text-primary'}`}>English</button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Transcripción de la Reunión *</label>
                <textarea value={promptTranscript} onChange={e => setPromptTranscript(e.target.value)} rows={8} placeholder="Pega aquí la transcripción de la reunión..." className={inputCls} />
              </div>
              <div>
                <p className="text-[12px] text-text-tertiary mb-2">O sube un archivo de texto</p>
                <input ref={promptFileRef} type="file" accept=".txt,.srt,.docx" className="hidden" onChange={handlePromptFileSelect} />
                <button onClick={() => promptFileRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  {promptFileName || 'Seleccionar archivo'}
                </button>
              </div>
              {promptTranscript.trim() && (
                <div className="p-3 bg-surface-tertiary rounded-xl border border-border-light">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Vista previa del prompt</span>
                    <span className="text-[11px] text-text-tertiary">{generatePrompt().length.toLocaleString()} caracteres</span>
                  </div>
                  <pre className="text-[11px] text-text-tertiary max-h-32 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">{generatePrompt().substring(0, 500)}...</pre>
                </div>
              )}
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div className="text-[12px] text-blue-700 dark:text-blue-300">
                  <p className="font-semibold mb-1">¿Cómo usar?</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-blue-600 dark:text-blue-400">
                    <li>Pega la transcripción de tu reunión arriba</li>
                    <li>Haz clic en "Copiar Prompt"</li>
                    <li>Pégalo en ChatGPT, Claude, Gemini o tu LLM favorito</li>
                    <li>Copia el resultado y créalo como nueva minuta aquí</li>
                  </ol>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button onClick={() => setShowPromptModal(false)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">Cerrar</button>
              <button onClick={handleCopyPrompt} disabled={!promptTranscript.trim()} className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold btn-glow text-white rounded-xl disabled:opacity-50">
                {promptCopied ? <><ClipboardCheck className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar Prompt</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">{editing ? 'Editar Minuta' : 'Nueva Minuta'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div><label className={labelCls}>Titulo *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Fecha</label><input type="date" value={form.meeting_date} onChange={e => setForm({...form, meeting_date: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Participantes</label><input value={form.participants} onChange={e => setForm({...form, participants: e.target.value})} className={inputCls} placeholder="Nombre 1, Nombre 2, ..." /></div>
              <div><label className={labelCls}>Temas</label><textarea value={form.topics} onChange={e => setForm({...form, topics: e.target.value})} rows={3} className={inputCls} /></div>
              <div><label className={labelCls}>Acuerdos</label><textarea value={form.agreements} onChange={e => setForm({...form, agreements: e.target.value})} rows={3} className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-[13px] font-semibold btn-glow text-white rounded-xl shadow-sm shadow-accent/25 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
