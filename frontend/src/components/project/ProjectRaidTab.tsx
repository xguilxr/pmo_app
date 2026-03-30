import { useState } from 'react';
import { Plus, X, Download, Edit2, Trash2, AlertTriangle, Zap, Bug, Scale, FileSpreadsheet } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

interface Risk {
  id: number; folio: string; title: string; description: string | null;
  category: string | null; probability: number; impact: number; severity: number;
  mitigation_strategy: string | null; status: string;
  identification_date: string | null; deadline: string | null;
}

interface Issue {
  id: number; folio: string; title: string; description: string | null;
  type: string; priority: string; status: string;
  resolution: string | null; report_date: string | null; commitment_date: string | null;
}

type RaidSection = 'all' | 'risks' | 'actions' | 'issues' | 'decisions';

const sectionConfig = {
  all: { label: 'Todos', icon: null, color: '' },
  risks: { label: 'Riesgos', icon: AlertTriangle, color: 'text-red-500' },
  actions: { label: 'Acciones', icon: Zap, color: 'text-blue-500' },
  issues: { label: 'Incidencias', icon: Bug, color: 'text-amber-500' },
  decisions: { label: 'Decisiones', icon: Scale, color: 'text-purple-500' },
};

const severityColor = (s: number) =>
  s >= 15 ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
  : s >= 8 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
  : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400';

const typeLabel: Record<string, string> = { action: 'Accion', issue: 'Incidencia', decision: 'Decision' };
const typeColor: Record<string, string> = {
  action: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
  issue: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
  decision: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400',
};
const priorityColor: Record<string, string> = {
  Alta: 'text-red-600 dark:text-red-400', Media: 'text-amber-600 dark:text-amber-400', Baja: 'text-emerald-600 dark:text-emerald-400',
};

export default function ProjectRaidTab({ projectId }: { projectId: number }) {
  const { toastSuccess, toastError } = useToast();
  const { data: risks, loading: loadingR, refetch: refetchR } = useApi(() => api.get<Risk[]>(`/risks?project_id=${projectId}`), [projectId]);
  const { data: allIssues, loading: loadingI, refetch: refetchI } = useApi(() => api.get<Issue[]>(`/issues?project_id=${projectId}`), [projectId]);

  const [section, setSection] = useState<RaidSection>('all');
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [saving, setSaving] = useState(false);

  const [riskForm, setRiskForm] = useState({ title: '', description: '', category: 'Tecnico', probability: 3, impact: 3, mitigation_strategy: '', status: 'Abierto', identification_date: '', deadline: '' });
  const [issueForm, setIssueForm] = useState({ title: '', description: '', type: 'issue', priority: 'Media', status: 'Abierto', resolution: '', report_date: '', commitment_date: '' });

  const actions = (allIssues || []).filter(i => i.type === 'action');
  const issues = (allIssues || []).filter(i => i.type === 'issue');
  const decisions = (allIssues || []).filter(i => i.type === 'decision');

  const counts = {
    all: (risks || []).length + (allIssues || []).length,
    risks: (risks || []).length,
    actions: actions.length,
    issues: issues.length,
    decisions: decisions.length,
  };

  // Risk CRUD
  const openCreateRisk = () => {
    setEditingRisk(null);
    setRiskForm({ title: '', description: '', category: 'Tecnico', probability: 3, impact: 3, mitigation_strategy: '', status: 'Abierto', identification_date: new Date().toISOString().slice(0, 10), deadline: '' });
    setShowRiskModal(true);
  };
  const openEditRisk = (r: Risk) => {
    setEditingRisk(r);
    setRiskForm({ title: r.title, description: r.description || '', category: r.category || 'Tecnico', probability: r.probability, impact: r.impact, mitigation_strategy: r.mitigation_strategy || '', status: r.status, identification_date: r.identification_date || '', deadline: r.deadline || '' });
    setShowRiskModal(true);
  };
  const handleSaveRisk = async () => {
    if (!riskForm.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...riskForm, identification_date: riskForm.identification_date || null, deadline: riskForm.deadline || null };
      if (editingRisk) { await api.patch(`/risks/${editingRisk.id}`, payload); toastSuccess('Riesgo actualizado'); }
      else { await api.post(`/risks?project_id=${projectId}`, payload); toastSuccess('Riesgo creado'); }
      setShowRiskModal(false); refetchR();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  };
  const handleDeleteRisk = async (id: number) => {
    if (!confirm('¿Eliminar este riesgo?')) return;
    try { await api.delete(`/risks/${id}`); toastSuccess('Riesgo eliminado'); refetchR(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
  };

  // Issue/Action/Decision CRUD
  const openCreateIssue = (type: string) => {
    setEditingIssue(null);
    setIssueForm({ title: '', description: '', type, priority: 'Media', status: 'Abierto', resolution: '', report_date: new Date().toISOString().slice(0, 10), commitment_date: '' });
    setShowIssueModal(true);
  };
  const openEditIssue = (i: Issue) => {
    setEditingIssue(i);
    setIssueForm({ title: i.title, description: i.description || '', type: i.type, priority: i.priority, status: i.status, resolution: i.resolution || '', report_date: i.report_date || '', commitment_date: i.commitment_date || '' });
    setShowIssueModal(true);
  };
  const handleSaveIssue = async () => {
    if (!issueForm.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...issueForm, report_date: issueForm.report_date || null, commitment_date: issueForm.commitment_date || null };
      if (editingIssue) { await api.patch(`/issues/${editingIssue.id}`, payload); toastSuccess('Actualizado'); }
      else { await api.post(`/issues?project_id=${projectId}`, payload); toastSuccess('Creado'); }
      setShowIssueModal(false); refetchI();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  };
  const handleDeleteIssue = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try { await api.delete(`/issues/${id}`); toastSuccess('Eliminado'); refetchI(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
  };

  // Download XLSX
  const handleDownloadXlsx = () => {
    const token = localStorage.getItem('pmo_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/exports/project-xlsx?project_id=${projectId}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `proyecto_raid_${projectId}.xlsx`; a.click(); })
      .catch(() => toastError('Error al descargar'));
  };

  const handleCreate = () => {
    if (section === 'risks') openCreateRisk();
    else if (section === 'actions') openCreateIssue('action');
    else if (section === 'issues') openCreateIssue('issue');
    else if (section === 'decisions') openCreateIssue('decision');
    else openCreateRisk(); // default to risk in "all" view
  };

  if (loadingR || loadingI) return <LoadingSpinner />;

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  const createLabel = section === 'risks' ? 'Nuevo Riesgo' : section === 'actions' ? 'Nueva Accion' : section === 'issues' ? 'Nueva Incidencia' : section === 'decisions' ? 'Nueva Decision' : 'Nuevo';

  const renderRisksTable = (items: Risk[]) => items.length === 0 ? null : (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-red-50 dark:bg-red-950/30 border-b border-border">
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider" colSpan={8}>
              <div className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Riesgos ({items.length})</div>
            </th>
          </tr>
          <tr className="bg-surface-tertiary border-b border-border">
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Folio</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Titulo</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Categoria</th>
            <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">P</th>
            <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">I</th>
            <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Severidad</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Estado</th>
            <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map(r => (
            <tr key={`r-${r.id}`} className="border-b border-border-light hover:bg-surface-hover transition-colors">
              <td className="px-4 py-3 text-text-tertiary font-mono text-[11px]">{r.folio}</td>
              <td className="px-4 py-3 text-text-primary font-medium">{r.title}</td>
              <td className="px-4 py-3 text-text-secondary">{r.category || '-'}</td>
              <td className="px-4 py-3 text-center text-text-secondary">{r.probability}</td>
              <td className="px-4 py-3 text-center text-text-secondary">{r.impact}</td>
              <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${severityColor(r.severity)}`}>{r.severity}</span></td>
              <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${r.status === 'Abierto' ? 'bg-red-100 dark:bg-red-950/50 text-red-600' : r.status === 'Mitigado' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600'}`}>{r.status}</span></td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => openEditRisk(r)} className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5 text-text-tertiary" /></button>
                <button onClick={() => handleDeleteRisk(r.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors ml-1"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderIssuesTable = (items: Issue[], sectionKey: string, sectionLabel: string, Icon: typeof Bug, headerBg: string, headerColor: string) => items.length === 0 ? null : (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className={`${headerBg} border-b border-border`}>
            <th className={`text-left px-4 py-3 text-[11px] font-semibold ${headerColor} uppercase tracking-wider`} colSpan={7}>
              <div className="flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {sectionLabel} ({items.length})</div>
            </th>
          </tr>
          <tr className="bg-surface-tertiary border-b border-border">
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Folio</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Titulo</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Prioridad</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Estado</th>
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">F. Compromiso</th>
            <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={`${sectionKey}-${i.id}`} className="border-b border-border-light hover:bg-surface-hover transition-colors">
              <td className="px-4 py-3 text-text-tertiary font-mono text-[11px]">{i.folio}</td>
              <td className="px-4 py-3">
                <p className="text-text-primary font-medium">{i.title}</p>
                {i.description && <p className="text-[11px] text-text-tertiary mt-0.5 line-clamp-1">{i.description}</p>}
              </td>
              <td className="px-4 py-3"><span className={`font-semibold text-[12px] ${priorityColor[i.priority] || 'text-text-secondary'}`}>{i.priority}</span></td>
              <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${i.status === 'Abierto' ? 'bg-red-100 dark:bg-red-950/50 text-red-600' : i.status === 'En Progreso' ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-600' : i.status === 'Resuelto' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600' : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400'}`}>{i.status}</span></td>
              <td className="px-4 py-3 text-text-secondary text-[12px]">{i.commitment_date || '-'}</td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => openEditIssue(i)} className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5 text-text-tertiary" /></button>
                <button onClick={() => handleDeleteIssue(i.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors ml-1"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const showRisks = section === 'all' || section === 'risks';
  const showActions = section === 'all' || section === 'actions';
  const showIssues = section === 'all' || section === 'issues';
  const showDecisions = section === 'all' || section === 'decisions';

  const noItems = counts.all === 0;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5 bg-surface-tertiary p-1 rounded-xl">
          {(Object.keys(sectionConfig) as RaidSection[]).map(key => {
            const cfg = sectionConfig[key];
            return (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${section === key ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {cfg.label} ({counts[key]})
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadXlsx} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Descargar XLSX
          </button>
          {section !== 'all' && (
            <button onClick={handleCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25">
              <Plus className="w-3.5 h-3.5" /> {createLabel}
            </button>
          )}
        </div>
      </div>

      {noItems ? (
        <div className="text-center py-12 bg-surface rounded-2xl border border-border">
          <p className="text-[13px] text-text-tertiary">Sin elementos RAID registrados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {showRisks && renderRisksTable(risks || [])}
          {showActions && renderIssuesTable(actions, 'a', 'Acciones', Zap, 'bg-blue-50 dark:bg-blue-950/30', 'text-blue-600 dark:text-blue-400')}
          {showIssues && renderIssuesTable(issues, 'i', 'Incidencias', Bug, 'bg-amber-50 dark:bg-amber-950/30', 'text-amber-600 dark:text-amber-400')}
          {showDecisions && renderIssuesTable(decisions, 'd', 'Decisiones', Scale, 'bg-purple-50 dark:bg-purple-950/30', 'text-purple-600 dark:text-purple-400')}
        </div>
      )}

      {/* Risk Modal */}
      {showRiskModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-2xl w-full max-w-lg border border-border shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">{editingRisk ? 'Editar Riesgo' : 'Nuevo Riesgo'}</h3>
              <button onClick={() => setShowRiskModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div><label className={labelCls}>Titulo *</label><input value={riskForm.title} onChange={e => setRiskForm({ ...riskForm, title: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Descripcion</label><textarea value={riskForm.description} onChange={e => setRiskForm({ ...riskForm, description: e.target.value })} rows={2} className={inputCls} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Categoria</label>
                  <select value={riskForm.category} onChange={e => setRiskForm({ ...riskForm, category: e.target.value })} className={inputCls}>
                    {['Tecnico', 'Financiero', 'Organizacional', 'Externo', 'Legal'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Probabilidad (1-5)</label><input type="number" min={1} max={5} value={riskForm.probability} onChange={e => setRiskForm({ ...riskForm, probability: Number(e.target.value) })} className={inputCls} /></div>
                <div><label className={labelCls}>Impacto (1-5)</label><input type="number" min={1} max={5} value={riskForm.impact} onChange={e => setRiskForm({ ...riskForm, impact: Number(e.target.value) })} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Estrategia de Mitigacion</label><textarea value={riskForm.mitigation_strategy} onChange={e => setRiskForm({ ...riskForm, mitigation_strategy: e.target.value })} rows={2} className={inputCls} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Estado</label>
                  <select value={riskForm.status} onChange={e => setRiskForm({ ...riskForm, status: e.target.value })} className={inputCls}>
                    {['Abierto', 'Mitigado', 'Cerrado'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>F. Identificacion</label><input type="date" value={riskForm.identification_date} onChange={e => setRiskForm({ ...riskForm, identification_date: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>F. Limite</label><input type="date" value={riskForm.deadline} onChange={e => setRiskForm({ ...riskForm, deadline: e.target.value })} className={inputCls} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button onClick={() => setShowRiskModal(false)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">Cancelar</button>
              <button onClick={handleSaveRisk} disabled={saving} className="px-5 py-2.5 text-[13px] font-semibold bg-accent text-white rounded-xl hover:bg-accent-hover shadow-sm shadow-accent/25 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Issue/Action/Decision Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-2xl w-full max-w-lg border border-border shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">{editingIssue ? `Editar ${typeLabel[issueForm.type] || 'Elemento'}` : `Nuevo: ${typeLabel[issueForm.type] || 'Elemento'}`}</h3>
              <button onClick={() => setShowIssueModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div><label className={labelCls}>Titulo *</label><input value={issueForm.title} onChange={e => setIssueForm({ ...issueForm, title: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Descripcion</label><textarea value={issueForm.description} onChange={e => setIssueForm({ ...issueForm, description: e.target.value })} rows={2} className={inputCls} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Tipo</label>
                  <select value={issueForm.type} onChange={e => setIssueForm({ ...issueForm, type: e.target.value })} className={inputCls}>
                    <option value="action">Accion</option>
                    <option value="issue">Incidencia</option>
                    <option value="decision">Decision</option>
                  </select>
                </div>
                <div><label className={labelCls}>Prioridad</label>
                  <select value={issueForm.priority} onChange={e => setIssueForm({ ...issueForm, priority: e.target.value })} className={inputCls}>
                    <option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option>
                  </select>
                </div>
                <div><label className={labelCls}>Estado</label>
                  <select value={issueForm.status} onChange={e => setIssueForm({ ...issueForm, status: e.target.value })} className={inputCls}>
                    <option value="Abierto">Abierto</option><option value="En Progreso">En Progreso</option><option value="Resuelto">Resuelto</option><option value="Cerrado">Cerrado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>F. Reporte</label><input type="date" value={issueForm.report_date} onChange={e => setIssueForm({ ...issueForm, report_date: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>F. Compromiso</label><input type="date" value={issueForm.commitment_date} onChange={e => setIssueForm({ ...issueForm, commitment_date: e.target.value })} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Resolucion</label><textarea value={issueForm.resolution} onChange={e => setIssueForm({ ...issueForm, resolution: e.target.value })} rows={2} className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button onClick={() => setShowIssueModal(false)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">Cancelar</button>
              <button onClick={handleSaveIssue} disabled={saving} className="px-5 py-2.5 text-[13px] font-semibold bg-accent text-white rounded-xl hover:bg-accent-hover shadow-sm shadow-accent/25 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
