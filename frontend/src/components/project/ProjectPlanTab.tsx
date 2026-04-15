import { useState, useRef, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Upload, Diamond, Clock, ListTree, Download, Settings2, BarChart3 } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import type { Task } from '../../types';

// Full column definitions
const ALL_COLUMNS = [
  { key: 'wbs', label: 'WBS', default: true },
  { key: 'name', label: 'Tarea', default: true, required: true },
  { key: 'responsible_name', label: 'Responsable', default: true },
  { key: 'start_date', label: 'Inicio', default: true },
  { key: 'end_date', label: 'Fin', default: true },
  { key: 'duration_days', label: 'Días', default: true },
  { key: 'progress', label: 'Avance', default: true },
  { key: 'status', label: 'Estado', default: true },
  { key: 'was_delayed', label: 'Delay', default: true },
  { key: 'priority', label: 'Prioridad', default: false },
  { key: 'description', label: 'Descripción', default: false },
  { key: 'notes', label: 'Notas', default: false },
  { key: 'source', label: 'Origen', default: false },
  { key: 'outline_level', label: 'Nivel', default: false },
  { key: 'is_milestone', label: 'Hito', default: false },
  { key: 'original_end_date', label: 'Fin Original', default: false },
  { key: 'created_at', label: 'Fecha Creación', default: false },
] as const;

type ColumnKey = typeof ALL_COLUMNS[number]['key'];

export default function ProjectPlanTab({ projectId }: { projectId: number }) {
  const { toastSuccess, toastError } = useToast();
  const { data: tasks, loading, refetch } = useApi(() => api.get<Task[]>(`/tasks?project_id=${projectId}`), [projectId]);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [showGantt, setShowGantt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column visibility — persist per project
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    try {
      const saved = localStorage.getItem(`plan_cols_${projectId}`);
      if (saved) return new Set(JSON.parse(saved));
    } catch { /* ignore */ }
    return new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.key));
  });

  const toggleColumn = (key: ColumnKey) => {
    const col = ALL_COLUMNS.find(c => c.key === key);
    if (col && 'required' in col && col.required) return;
    const next = new Set(visibleColumns);
    if (next.has(key)) next.delete(key); else next.add(key);
    setVisibleColumns(next);
    localStorage.setItem(`plan_cols_${projectId}`, JSON.stringify([...next]));
  };

  const emptyForm = { wbs: '', name: '', start_date: '', end_date: '', progress: 0, is_milestone: false, status: 'pending', notes: '', responsible_name: '' };
  const [form, setForm] = useState({ ...emptyForm });

  const today = new Date().toISOString().split('T')[0];

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({ wbs: task.wbs || '', name: task.name, start_date: task.start_date || '', end_date: task.end_date || '', progress: task.progress, is_milestone: task.is_milestone, status: task.status, notes: task.notes || '', responsible_name: task.responsible_name || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const startD = form.start_date ? new Date(form.start_date) : null;
      const endD = form.end_date ? new Date(form.end_date) : null;
      const duration_days = (startD && endD && !form.is_milestone) ? Math.max(0, Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24))) : form.is_milestone ? 0 : null;
      const outline_level = form.wbs ? (form.wbs.match(/\./g) || []).length + 1 : 1;
      const payload = { name: form.name, wbs: form.wbs || null, start_date: form.start_date || null, end_date: form.end_date || null, duration_days, progress: form.progress, status: form.status, is_milestone: form.is_milestone, outline_level, notes: form.notes || null, responsible_name: form.responsible_name || null };
      if (editing) { await api.patch(`/tasks/${editing.id}`, payload); toastSuccess('Tarea actualizada'); }
      else { await api.post(`/tasks?project_id=${projectId}`, payload); toastSuccess('Tarea creada'); }
      setShowModal(false); refetch();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try { await api.delete(`/tasks/${id}`); toastSuccess('Tarea eliminada'); refetch(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleExport = () => {
    const token = localStorage.getItem('pmo_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/exports/tasks?project_id=${projectId}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.blob()).then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tareas_${projectId}.csv`; a.click(); }).catch(() => toastError('Error al exportar'));
  };

  const handleDownloadTemplate = () => {
    const token = localStorage.getItem('pmo_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/exports/task-template`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.blob()).then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'plantilla_plan_proyecto.xlsx'; a.click(); }).catch(() => toastError('Error al descargar plantilla'));
  };

  const isPastDue = (task: Task) => task.end_date && task.end_date < today && task.progress < 100;

  // Import logic
  const [importing, setImporting] = useState(false);
  const processFile = useCallback(async (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.csv', '.mpp', '.mpx'].includes(ext)) { toastError('Solo se aceptan archivos .mpp, .xlsx o .csv'); return; }
    setImporting(true);
    try {
      const token = localStorage.getItem('pmo_token');
      const formData = new FormData(); formData.append('file', file);
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/tasks/import-file?project_id=${projectId}`;
      const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!res.ok) { const err = await res.json().catch(() => ({ detail: 'Error al importar' })); throw new Error(err.detail || `Error ${res.status}`); }
      const imported = await res.json();
      toastSuccess(`${imported.length} tareas importadas de ${file.name} (plan reemplazado)`);
      setShowImport(false); refetch();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error al importar'); }
    setImporting(false);
  }, [projectId, toastSuccess, toastError, refetch]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) processFile(file); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) processFile(file); }, [processFile]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback(() => { setIsDragOver(false); }, []);

  const statusBadge = (s: string) => {
    const config: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-surface-tertiary text-text-secondary', label: 'Pendiente' },
      in_progress: { color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400', label: 'En Progreso' },
      completed: { color: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400', label: 'Completado' },
      delayed: { color: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400', label: 'Retrasado' },
    };
    const c = config[s] || { color: 'bg-surface-tertiary text-text-secondary', label: s };
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.color}`}>{c.label}</span>;
  };

  const progressBar = (value: number) => {
    const color = value >= 100 ? 'bg-emerald-500' : value >= 50 ? 'bg-blue-500' : value > 0 ? 'bg-amber-500' : 'bg-surface-tertiary';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden w-20">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
        </div>
        <span className="text-[11px] font-medium text-text-secondary w-10 text-right">{value}%</span>
      </div>
    );
  };

  // Gantt helpers
  const ganttData = useMemo(() => {
    if (!tasks || tasks.length === 0) return null;
    const tasksWithDates = tasks.filter(t => t.start_date && t.end_date);
    if (tasksWithDates.length === 0) return null;
    const allStarts = tasksWithDates.map(t => new Date(t.start_date!).getTime());
    const allEnds = tasksWithDates.map(t => new Date(t.end_date!).getTime());
    const minDate = Math.min(...allStarts);
    const maxDate = Math.max(...allEnds);
    const range = maxDate - minDate || 1;
    return { minDate, maxDate, range, tasks: tasksWithDates };
  }, [tasks]);

  const formatDate = (d: string) => {
    const parts = d.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
  };

  // Render cell value
  const renderCell = (task: Task, col: ColumnKey) => {
    switch (col) {
      case 'wbs': return <span className="text-text-tertiary font-mono text-[11px]">{task.wbs || '-'}</span>;
      case 'name': return (
        <div className="flex items-center gap-1" style={{ paddingLeft: `${((task.outline_level || 1) - 1) * 20}px` }}>
          {task.is_milestone ? <Diamond className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0" /> : null}
          <span className={`font-medium ${(task.outline_level || 1) === 1 ? 'text-text-primary font-semibold' : 'text-text-secondary'}`}>{task.name}</span>
        </div>
      );
      case 'responsible_name': return <span className="text-text-secondary text-[12px]">{task.responsible_name || '-'}</span>;
      case 'start_date': return <span className="text-text-tertiary text-[11px]">{task.start_date || '-'}</span>;
      case 'end_date': return <span className="text-text-tertiary text-[11px]">{task.end_date || '-'}</span>;
      case 'duration_days': return <span className="text-text-secondary text-center">{task.duration_days != null && task.duration_days > 0 ? `${task.duration_days}d` : '-'}</span>;
      case 'progress': return progressBar(task.progress);
      case 'status': return statusBadge(task.status);
      case 'was_delayed': return task.was_delayed ? <Clock className="w-4 h-4 text-red-500 dark:text-red-400 mx-auto" /> : null;
      case 'priority': return <span className="text-text-secondary text-[12px]">{task.priority || '-'}</span>;
      case 'description': return <span className="text-text-secondary text-[12px] truncate max-w-[200px] block">{task.description || '-'}</span>;
      case 'notes': return <span className="text-text-secondary text-[12px] truncate max-w-[200px] block">{task.notes || '-'}</span>;
      case 'source': return <span className="text-text-tertiary text-[11px]">{task.source || '-'}</span>;
      case 'outline_level': return <span className="text-text-secondary">{task.outline_level || 1}</span>;
      case 'is_milestone': return task.is_milestone ? <Diamond className="w-3.5 h-3.5 text-purple-500 mx-auto" /> : null;
      case 'original_end_date': return <span className="text-text-tertiary text-[11px]">{task.original_end_date || '-'}</span>;
      case 'created_at': return <span className="text-text-tertiary text-[11px]">{task.created_at?.split('T')[0] || '-'}</span>;
      default: return '-';
    }
  };

  if (loading) return <LoadingSpinner />;

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";
  const cols = ALL_COLUMNS.filter(c => visibleColumns.has(c.key));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[13px] text-text-secondary">
            {(tasks || []).length} {(tasks || []).length === 1 ? 'tarea' : 'tareas'}
          </div>
          <button onClick={() => setShowGantt(!showGantt)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${showGantt ? 'bg-accent text-white' : 'border border-border text-text-secondary hover:bg-surface-hover'}`}>
            <BarChart3 className="w-3.5 h-3.5" /> Gantt
          </button>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button onClick={() => setShowColumns(!showColumns)} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all">
              <Settings2 className="w-3.5 h-3.5" /> Columnas
            </button>
            {showColumns && (
              <div className="absolute right-0 top-full mt-1 bg-surface-elevated border border-border rounded-xl shadow-2xl z-30 w-56 p-2 animate-fade-in">
                <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider px-2 py-1">Columnas Visibles</p>
                {ALL_COLUMNS.map(col => (
                  <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-hover cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      disabled={'required' in col && col.required}
                      className="rounded border-border text-accent focus:ring-accent/30"
                    />
                    <span className="text-[12px] text-text-secondary">{col.label}</span>
                  </label>
                ))}
                <button onClick={() => setShowColumns(false)} className="w-full mt-1 px-2 py-1.5 text-[12px] text-accent font-medium hover:bg-surface-hover rounded-lg">Cerrar</button>
              </div>
            )}
          </div>
          <button onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all">
            <Download className="w-3.5 h-3.5" /> Plantilla
          </button>
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
          <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all">
            <Upload className="w-3.5 h-3.5" /> Importar
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-semibold hover:bg-accent-hover shadow-sm shadow-accent/25">
            <Plus className="w-3.5 h-3.5" /> Nueva Tarea
          </button>
        </div>
      </div>

      {(tasks || []).length === 0 ? (
        <div className="text-center py-12 liquid-glass-border rounded-2xl">
          <ListTree className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-40" />
          <p className="text-[13px] text-text-tertiary mb-3">Sin tareas registradas</p>
          <button onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover">
            <Download className="w-3.5 h-3.5" /> Descargar Plantilla XLSX
          </button>
        </div>
      ) : (
        <>
          {/* Task Table */}
          <div className="liquid-glass-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-surface-tertiary border-b border-border">
                    {cols.map(col => (
                      <th key={col.key} className={`px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider ${col.key === 'duration_days' || col.key === 'was_delayed' || col.key === 'is_milestone' ? 'text-center' : 'text-left'} ${col.key === 'progress' ? 'w-32' : ''}`}>
                        {col.label}
                      </th>
                    ))}
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(tasks || []).map(task => (
                    <tr key={task.id} className={`border-b border-border-light hover:bg-surface-hover transition-colors ${isPastDue(task) ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                      {cols.map(col => (
                        <td key={col.key} className={`px-4 py-3 ${col.key === 'duration_days' || col.key === 'was_delayed' || col.key === 'is_milestone' ? 'text-center' : ''}`}>
                          {renderCell(task, col.key)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(task)} className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5 text-text-tertiary" /></button>
                        <button onClick={() => handleDelete(task.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors ml-1"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gantt Chart */}
          {showGantt && ganttData && (
            <div className="liquid-glass-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-surface-tertiary">
                <h4 className="text-[12px] font-semibold text-text-primary uppercase tracking-wider">Diagrama de Gantt</h4>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[800px] p-4">
                  {/* Date header */}
                  <div className="flex items-center mb-2 pl-[200px]">
                    <span className="text-[10px] text-text-tertiary">{formatDate(new Date(ganttData.minDate).toISOString().split('T')[0])}</span>
                    <div className="flex-1" />
                    <span className="text-[10px] text-text-tertiary">{formatDate(new Date(ganttData.maxDate).toISOString().split('T')[0])}</span>
                  </div>
                  {/* Today line marker */}
                  <div className="relative">
                    {(() => {
                      const todayMs = Date.now();
                      if (todayMs >= ganttData.minDate && todayMs <= ganttData.maxDate) {
                        const pos = ((todayMs - ganttData.minDate) / ganttData.range) * 100;
                        return <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" style={{ left: `calc(200px + ${pos}% * (100% - 200px) / 100)` }} />;
                      }
                      return null;
                    })()}
                  </div>
                  {/* Task bars */}
                  {ganttData.tasks.map(task => {
                    const s = new Date(task.start_date!).getTime();
                    const e = new Date(task.end_date!).getTime();
                    const left = ((s - ganttData.minDate) / ganttData.range) * 100;
                    const width = Math.max(0.5, ((e - s) / ganttData.range) * 100);
                    const isLevel1 = (task.outline_level || 1) === 1;
                    const barColor = task.status === 'completed' ? 'bg-emerald-500' : task.status === 'delayed' ? 'bg-red-500' : isLevel1 ? 'bg-accent' : 'bg-blue-400';
                    const progressColor = task.status === 'completed' ? 'bg-emerald-700' : 'bg-accent/70';

                    return (
                      <div key={task.id} className="flex items-center h-8 mb-1 group">
                        <div className="w-[200px] flex-shrink-0 pr-3 truncate" style={{ paddingLeft: `${((task.outline_level || 1) - 1) * 12}px` }}>
                          {task.is_milestone ? (
                            <span className="flex items-center gap-1 text-[11px] text-purple-500 font-medium"><Diamond className="w-3 h-3" />{task.name}</span>
                          ) : (
                            <span className={`text-[11px] ${isLevel1 ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>{task.name}</span>
                          )}
                        </div>
                        <div className="flex-1 relative h-full flex items-center">
                          {task.is_milestone ? (
                            <div className="absolute" style={{ left: `${left}%` }}>
                              <Diamond className="w-4 h-4 text-purple-500 fill-purple-500" />
                            </div>
                          ) : (
                            <div
                              className={`absolute h-5 rounded-sm ${barColor} opacity-80 group-hover:opacity-100 transition-opacity`}
                              style={{ left: `${left}%`, width: `${width}%`, minWidth: '4px' }}
                              title={`${task.name}: ${task.start_date} → ${task.end_date} (${task.progress}%)`}
                            >
                              {task.progress > 0 && (
                                <div className={`h-full rounded-sm ${progressColor}`} style={{ width: `${Math.min(task.progress, 100)}%` }} />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Import Plan Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">Importar Plan</h3>
              <button onClick={() => setShowImport(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6">
              <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragOver ? 'border-accent bg-accent/5' : 'border-border'}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()}>
                {importing ? (
                  <div className="py-4"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-[13px] text-text-secondary">Importando tareas...</p></div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-text-tertiary mx-auto mb-3 opacity-40" />
                    <p className="text-[13px] text-text-secondary mb-1">Arrastra un archivo .mpp, .xlsx o .csv</p>
                    <p className="text-[11px] text-text-tertiary">o haz clic para seleccionar</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept=".mpp,.mpx,.xlsx,.csv" onChange={handleFileSelect} />
                <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="mt-4 inline-flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-[12px] font-medium text-text-secondary hover:bg-surface-hover transition-all">Seleccionar archivo</button>
              </div>
              <p className="text-[11px] text-text-tertiary mt-3 text-center">
                Tareas existentes se actualizarán (no se duplicarán). Columnas: WBS, Nombre, Inicio, Fin, Duración, Avance, Responsable
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button onClick={() => setShowImport(false)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">{editing ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>WBS</label><input value={form.wbs} onChange={e => setForm({...form, wbs: e.target.value})} placeholder="ej. 2.1.3" className={inputCls} /></div>
                <div className="col-span-2"><label className={labelCls}>Nombre *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Responsable</label><input value={form.responsible_name} onChange={e => setForm({...form, responsible_name: e.target.value})} className={inputCls} placeholder="Ej: Desarrollo, Juan García, QA..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Fecha Inicio</label><input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Fecha Fin</label><input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Avance (%)</label><input type="number" min={0} max={100} value={form.progress} onChange={e => setForm({...form, progress: Number(e.target.value)})} className={inputCls} /></div>
                <div><label className={labelCls}>Estado</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}>
                    {[['pending','Pendiente'],['in_progress','En Progreso'],['completed','Completado'],['delayed','Retrasado']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isMilestone" checked={form.is_milestone} onChange={e => setForm({...form, is_milestone: e.target.checked})} className="rounded border-border text-accent focus:ring-accent/30" />
                    <label htmlFor="isMilestone" className="text-[12px] text-text-secondary flex items-center gap-1"><Diamond className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" /> Es hito</label>
                  </div>
                </div>
              </div>
              <div><label className={labelCls}>Notas</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={inputCls} /></div>
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
