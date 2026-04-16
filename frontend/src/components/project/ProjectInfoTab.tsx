import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Calendar, DollarSign, TrendingUp, CheckCircle2, Clock, AlertCircle, Plus, X, Edit2, Trash2, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import type { ProjectView } from '../../types';
import type { Objective } from '../../types';
import type { Task } from '../../types';

export default function ProjectInfoTab({ project }: { project: ProjectView }) {
  const { t } = useTranslation();
  const { toastSuccess, toastError } = useToast();
  const { data: objectives, loading, refetch } = useApi<Objective[]>(
    () => api.get(`/projects/${project.id}/objectives`),
    [project.id]   );

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Objective | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingWBS, setGeneratingWBS] = useState(false);
  const [form, setForm] = useState({
    description: '',
    type: 'general' as 'general' | 'specific' | 'kpi',
    target_value: '',
    current_value: '',
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  const budgetDeviation = project.budget > 0
    ? ((project.realBudget - project.budget) / project.budget * 100).toFixed(1)
    : '0';
  const budgetDeviationNum = parseFloat(budgetDeviation);

  const progressDeviation = project.progress - project.plannedProgress;

  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  const now = Date.now();
  const timelineProgress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));

  const statusIcon = (status: string) => {
    switch (status) {
      case 'achieved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'not_achieved': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-text-tertiary" />;
    }
  };

  const typeLabel = (type: string) => {
    const colors: Record<string, string> = {
      general: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
      specific: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400',
      kpi: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-surface-tertiary text-text-secondary'}`}>{type.toUpperCase()}</span>;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ description: '', type: 'general', target_value: '', current_value: '' });
    setShowModal(true);
  };

  const openEdit = (obj: Objective) => {
    setEditing(obj);
    setForm({
      description: obj.description,
      type: obj.type as 'general' | 'specific' | 'kpi',
      target_value: obj.target_value || '',
      current_value: obj.current_value || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      const payload = {
        description: form.description,
        type: form.type,
        target_value: form.target_value || null,
        current_value: form.current_value || null,
      };
      if (editing) {
        await api.patch(`/projects/${project.id}/objectives/${editing.id}`, payload);
        toastSuccess('Objetivo actualizado');
      } else {
        await api.post(`/projects/${project.id}/objectives`, payload);
        toastSuccess('Objetivo creado');
      }
      setShowModal(false);
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al guardar objetivo');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este objetivo?')) return;
    try {
      await api.delete(`/projects/${project.id}/objectives/${id}`);
      toastSuccess('Objetivo eliminado');
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al eliminar objetivo');
    }
  };

  const handleGenerateFromWBS = async () => {
    setGeneratingWBS(true);
    try {
      const tasks = await api.get<Task[]>(`/tasks?project_id=${project.id}`);
      const topLevel = tasks.filter(t => t.outline_level === 1);
      if (topLevel.length === 0) {
        toastError('No se encontraron tareas de nivel 1 en el WBS');
        setGeneratingWBS(false);
        return;
      }
      let created = 0;
      for (const task of topLevel) {
        await api.post(`/projects/${project.id}/objectives`, {
          description: task.name,
          type: 'general',
        });
        created++;
      }
      toastSuccess(`${created} objetivo(s) creado(s) desde el WBS`);
      refetch();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al generar desde WBS');
    }
    setGeneratingWBS(false);
  };

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6">
      {/* Project Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* General Info */}
        <div className="liquid-glass-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            {t('projectDetail.generalInfo')}
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-secondary">{t('projects.type')}</dt>
              <dd className="font-medium text-text-primary">{project.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">{t('projects.priority')}</dt>
              <dd className={`font-medium ${project.priority === 'Alta' ? 'text-red-600' : project.priority === 'Media' ? 'text-amber-600' : 'text-green-600'}`}>{project.priority}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">{t('projects.phase')}</dt>
              <dd className="font-medium text-text-primary">{project.phase}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Organización</dt>
              <dd className="font-medium text-text-primary">{project.company || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Programa</dt>
              <dd className="font-medium text-text-primary">{project.programName || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Cost Breakdown */}
        <div className="liquid-glass-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            {t('projectDetail.costs')}
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-secondary">{t('dashboard.planBudget')}</dt>
              <dd className="font-medium text-text-primary">{formatCurrency(project.budget)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">{t('dashboard.realBudget')}</dt>
              <dd className="font-medium text-text-primary">{formatCurrency(project.realBudget)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">{t('projectDetail.deviation')}</dt>
              <dd className={`font-medium ${budgetDeviationNum > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {budgetDeviationNum > 0 ? '+' : ''}{budgetDeviation}%
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">{t('projectDetail.remaining')}</dt>
              <dd className="font-medium text-text-primary">{formatCurrency(project.budget - project.realBudget)}</dd>
            </div>
          </dl>
          {/* Budget bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-text-tertiary mb-1">
              <span>{t('projectDetail.spent')}</span>
              <span>{((project.realBudget / project.budget) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-surface-tertiary rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${
                  project.realBudget > project.budget ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (project.realBudget / project.budget) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Progress & Timeline */}
        <div className="liquid-glass-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            {t('projectDetail.progressTimeline')}
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-secondary">{t('dashboard.progress')}</dt>
              <dd className="font-medium text-text-primary">{project.progress}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">{t('dashboard.plannedProgress')}</dt>
              <dd className="font-medium text-text-primary">{project.plannedProgress}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">{t('projectDetail.deviation')}</dt>
              <dd className={`font-medium ${progressDeviation < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {progressDeviation > 0 ? '+' : ''}{progressDeviation}%
              </dd>
            </div>
          </dl>
          {/* Timeline bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-text-tertiary mb-1">
              <span>{t('projectDetail.timeElapsed')}</span>
              <span>{timelineProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-surface-tertiary rounded-full h-2.5">
              <div className="h-2.5 rounded-full bg-blue-500" style={{ width: `${timelineProgress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-text-tertiary mt-1">
              <span>{project.startDate}</span>
              <span>{project.endDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Objectives */}
      <div className="liquid-glass-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            {t('projectDetail.objectives')}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleGenerateFromWBS}
              disabled={generatingWBS}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generatingWBS ? 'Generando...' : 'Generar desde WBS'}
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Objetivo
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : !objectives || objectives.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-30" />
            <p className="text-[13px] text-text-tertiary">Sin objetivos registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {objectives.map(obj => (
              <div key={obj.id} className="flex items-start gap-3 p-3 bg-surface-tertiary rounded-xl animate-fade-in">
                {statusIcon(obj.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {typeLabel(obj.type)}
                  </div>
                  <p className="text-sm text-text-primary">{obj.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
                    {obj.target_value && (
                      <span>{t('projectDetail.target')}: <span className="font-medium text-text-secondary">{obj.target_value}</span></span>
                    )}
                    {obj.current_value && (
                      <span>{t('projectDetail.current')}: <span className="font-medium text-text-secondary">{obj.current_value}</span></span>
                    )}
                  </div>
                </div>
                <div className="w-24 text-right">
                  <span className="text-sm font-semibold text-text-primary">{obj.progress}%</span>
                  <div className="w-full bg-surface rounded-full h-1.5 mt-1">
                    <div
                      className={`h-1.5 rounded-full ${obj.progress >= 80 ? 'bg-green-500' : obj.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                      style={{ width: `${obj.progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-0.5 ml-2">
                  <button onClick={() => openEdit(obj)} className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors">
                    <Edit2 className="w-3.5 h-3.5 text-text-tertiary" />
                  </button>
                  <button onClick={() => handleDelete(obj.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Objective Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-[15px] font-bold text-text-primary">{editing ? 'Editar Objetivo' : 'Nuevo Objetivo'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl">
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Descripcion *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className={inputCls}
                  placeholder="Describe el objetivo..."
                />
              </div>
              <div>
                <label className={labelCls}>Tipo</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value as 'general' | 'specific' | 'kpi' })}
                  className={inputCls}
                >
                  <option value="general">General</option>
                  <option value="specific">Especifico</option>
                  <option value="kpi">KPI</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Valor Meta</label>
                  <input
                    value={form.target_value}
                    onChange={e => setForm({ ...form, target_value: e.target.value })}
                    className={inputCls}
                    placeholder="Ej: 100%"
                  />
                </div>
                <div>
                  <label className={labelCls}>Valor Actual</label>
                  <input
                    value={form.current_value}
                    onChange={e => setForm({ ...form, current_value: e.target.value })}
                    className={inputCls}
                    placeholder="Ej: 65%"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.description.trim()}
                className="px-5 py-2.5 text-[13px] font-semibold btn-glow text-white rounded-xl shadow-sm shadow-accent/25 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
