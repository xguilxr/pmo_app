import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, Upload, Diamond, Clock, ListTree, FileUp, History } from 'lucide-react';

interface CharterTask {
  id: number;
  wbs: string;
  name: string;
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
  responsible: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  outlineLevel: number;
  isMilestone: boolean;
  wasDelayed: boolean;
}

interface ImportChange {
  task: string;
  field: string;
  oldValue: string;
  newValue: string;
  action: 'modified' | 'added' | 'deleted';
}

interface ImportHistoryEntry {
  id: number;
  date: string;
  filename: string;
  changesCount: number;
}

const mockTasks: Record<number, CharterTask[]> = {
  1: [
    { id: 1, wbs: '1', name: 'Fase 1 - Planeación', startDate: '2026-01-15', endDate: '2026-02-28', duration: 45, progress: 100, responsible: 'Juan García', status: 'completed', outlineLevel: 1, isMilestone: false, wasDelayed: false },
    { id: 2, wbs: '1.1', name: 'Levantamiento de requerimientos', startDate: '2026-01-15', endDate: '2026-02-01', duration: 18, progress: 100, responsible: 'Ana Torres', status: 'completed', outlineLevel: 2, isMilestone: false, wasDelayed: true },
    { id: 3, wbs: '1.1.1', name: 'Entrevistas con stakeholders', startDate: '2026-01-15', endDate: '2026-01-25', duration: 11, progress: 100, responsible: 'Ana Torres', status: 'completed', outlineLevel: 3, isMilestone: false, wasDelayed: false },
    { id: 4, wbs: '1.1.2', name: 'Documento de requerimientos aprobado', startDate: '2026-02-01', endDate: '2026-02-01', duration: 0, progress: 100, responsible: 'Juan García', status: 'completed', outlineLevel: 3, isMilestone: true, wasDelayed: true },
    { id: 5, wbs: '1.2', name: 'Diseño de arquitectura', startDate: '2026-02-03', endDate: '2026-02-28', duration: 26, progress: 100, responsible: 'Carlos López', status: 'completed', outlineLevel: 2, isMilestone: false, wasDelayed: false },
    { id: 6, wbs: '2', name: 'Fase 2 - Desarrollo', startDate: '2026-03-01', endDate: '2026-05-30', duration: 91, progress: 40, responsible: 'Carlos López', status: 'in_progress', outlineLevel: 1, isMilestone: false, wasDelayed: false },
    { id: 7, wbs: '2.1', name: 'Módulo de autenticación', startDate: '2026-03-01', endDate: '2026-03-20', duration: 20, progress: 85, responsible: 'Roberto Sánchez', status: 'in_progress', outlineLevel: 2, isMilestone: false, wasDelayed: true },
    { id: 8, wbs: '2.2', name: 'Módulo de reportes', startDate: '2026-03-10', endDate: '2026-03-25', duration: 16, progress: 30, responsible: 'Ana Torres', status: 'delayed', outlineLevel: 2, isMilestone: false, wasDelayed: true },
    { id: 9, wbs: '2.3', name: 'Integración con ERP', startDate: '2026-04-01', endDate: '2026-05-15', duration: 45, progress: 0, responsible: 'Juan García', status: 'pending', outlineLevel: 2, isMilestone: false, wasDelayed: false },
    { id: 10, wbs: '2.3.1', name: 'Configuración de APIs', startDate: '2026-04-01', endDate: '2026-04-20', duration: 20, progress: 0, responsible: 'Roberto Sánchez', status: 'pending', outlineLevel: 3, isMilestone: false, wasDelayed: false },
    { id: 11, wbs: '3', name: 'Fase 3 - Pruebas y Go-Live', startDate: '2026-06-01', endDate: '2026-07-15', duration: 45, progress: 0, responsible: 'María Rodríguez', status: 'pending', outlineLevel: 1, isMilestone: false, wasDelayed: false },
    { id: 12, wbs: '3.1', name: 'Go-Live en producción', startDate: '2026-07-15', endDate: '2026-07-15', duration: 0, progress: 0, responsible: 'Juan García', status: 'pending', outlineLevel: 2, isMilestone: true, wasDelayed: false },
  ],
};

const mockImportHistory: ImportHistoryEntry[] = [
  { id: 1, date: '2026-02-10', filename: 'Plan_ERP_v2.xlsx', changesCount: 5 },
  { id: 2, date: '2026-03-01', filename: 'Cronograma_Sprint3.mpp', changesCount: 8 },
];

const emptyForm = {
  wbs: '',
  name: '',
  responsible: '',
  startDate: '',
  endDate: '',
  progress: 0,
  isMilestone: false,
};

export default function ProjectCharterTab({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<CharterTask[]>(mockTasks[projectId] || []);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<CharterTask | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>(mockImportHistory);
  const [pendingChanges, setPendingChanges] = useState<ImportChange[] | null>(null);
  const [pendingFilename, setPendingFilename] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split('T')[0];

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (task: CharterTask) => {
    setEditing(task);
    setForm({
      wbs: task.wbs,
      name: task.name,
      responsible: task.responsible,
      startDate: task.startDate,
      endDate: task.endDate,
      progress: task.progress,
      isMilestone: task.isMilestone,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const startD = new Date(form.startDate);
    const endD = new Date(form.endDate);
    const duration = form.isMilestone ? 0 : Math.max(0, Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
    const outlineLevel = (form.wbs.match(/\./g) || []).length + 1;
    const status: CharterTask['status'] = form.progress >= 100 ? 'completed' : form.progress > 0 ? 'in_progress' : 'pending';

    if (editing) {
      setTasks(tasks.map(t => t.id === editing.id ? {
        ...t,
        wbs: form.wbs,
        name: form.name,
        responsible: form.responsible,
        startDate: form.startDate,
        endDate: form.endDate,
        progress: form.progress,
        isMilestone: form.isMilestone,
        duration,
        outlineLevel,
        status,
      } : t));
    } else {
      setTasks([...tasks, {
        id: Date.now(),
        wbs: form.wbs,
        name: form.name,
        responsible: form.responsible,
        startDate: form.startDate,
        endDate: form.endDate,
        progress: form.progress,
        isMilestone: form.isMilestone,
        duration,
        outlineLevel,
        status,
        wasDelayed: false,
      }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => setTasks(tasks.filter(t => t.id !== id));

  const isPastDue = (task: CharterTask) => task.endDate < today && task.progress < 100;

  // --- Import logic ---
  const generateMockChanges = (_filename: string): ImportChange[] => [
    { task: 'Módulo de autenticación', field: 'Fecha Fin', oldValue: '2026-03-20', newValue: '2026-03-25', action: 'modified' },
    { task: 'Módulo de reportes', field: 'Avance', oldValue: '30%', newValue: '45%', action: 'modified' },
    { task: 'Integración con ERP', field: 'Responsable', oldValue: 'Juan García', newValue: 'Carlos López', action: 'modified' },
    { task: 'Configuración de APIs', field: 'Fecha Inicio', oldValue: '2026-04-01', newValue: '2026-04-05', action: 'modified' },
    { task: 'Pruebas de integración', field: 'Nueva tarea', oldValue: '', newValue: 'WBS 2.3.2 | 2026-05-01 → 2026-05-20 | Roberto Sánchez', action: 'added' },
    { task: 'Capacitación usuarios', field: 'Nueva tarea', oldValue: '', newValue: 'WBS 3.2 | 2026-06-15 → 2026-07-01 | María Rodríguez', action: 'added' },
  ];

  const processFile = useCallback((file: File) => {
    const validExtensions = ['.xlsx', '.mpp', '.csv', '.xml'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) return;

    const changes = generateMockChanges(file.name);
    setPendingFilename(file.name);
    setPendingChanges(changes);
    setShowImport(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const fieldMap: Record<string, keyof CharterTask> = {
    'Fecha Fin': 'endDate',
    'Fecha Inicio': 'startDate',
    'Avance': 'progress',
    'Responsable': 'responsible',
    'Duración': 'duration',
  };

  const calcDuration = (start: string, end: string): number => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(0, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const handleApplyChanges = () => {
    if (!pendingChanges) return;

    setTasks(prevTasks => {
      let updatedTasks = [...prevTasks];

      for (const change of pendingChanges) {
        if (change.action === 'added') {
          // Parse new task info from newValue format: "WBS X | startDate → endDate | responsible"
          const parts = change.newValue.split(' | ');
          const wbs = parts[0]?.replace('WBS ', '') || '';
          const dates = parts[1]?.split(' → ') || ['', ''];
          const responsible = parts[2] || '';
          const startDate = dates[0] || '';
          const endDate = dates[1] || '';
          const duration = calcDuration(startDate, endDate);
          const outlineLevel = (wbs.match(/\./g) || []).length + 1;

          updatedTasks.push({
            id: Date.now() + Math.random(),
            wbs,
            name: change.task,
            startDate,
            endDate,
            duration,
            progress: 0,
            responsible,
            status: 'pending',
            outlineLevel,
            isMilestone: false,
            wasDelayed: false,
          });
          continue;
        }

        if (change.action === 'deleted') {
          updatedTasks = updatedTasks.filter(t => t.name !== change.task);
          continue;
        }

        // action === 'modified'
        const prop = fieldMap[change.field];
        if (!prop) continue;

        const taskIndex = updatedTasks.findIndex(t => t.name === change.task);
        if (taskIndex === -1) continue;

        const task = { ...updatedTasks[taskIndex] };

        if (prop === 'progress') {
          task.progress = parseInt(change.newValue.replace('%', ''), 10);
        } else if (prop === 'endDate') {
          const oldEnd = task.endDate;
          task.endDate = change.newValue;
          task.duration = calcDuration(task.startDate, task.endDate);
          if (change.newValue > oldEnd) {
            task.wasDelayed = true;
            if (task.progress < 100) {
              task.status = 'delayed';
            }
          }
        } else if (prop === 'startDate') {
          task.startDate = change.newValue;
          task.duration = calcDuration(task.startDate, task.endDate);
        } else if (prop === 'responsible') {
          task.responsible = change.newValue;
        } else if (prop === 'duration') {
          task.duration = parseInt(change.newValue.replace('d', ''), 10);
        }

        // Recalculate status based on progress
        if (task.progress >= 100) {
          task.status = 'completed';
        } else if (!task.wasDelayed && task.progress > 0) {
          task.status = 'in_progress';
        } else if (task.progress === 0 && !task.wasDelayed) {
          task.status = 'pending';
        }

        updatedTasks[taskIndex] = task;
      }

      return updatedTasks;
    });

    setImportHistory(prev => [
      { id: Date.now(), date: new Date().toISOString().split('T')[0], filename: pendingFilename, changesCount: pendingChanges.length },
      ...prev,
    ]);
    setPendingChanges(null);
    setPendingFilename('');
  };

  const handleCancelChanges = () => {
    setPendingChanges(null);
    setPendingFilename('');
  };

  const statusBadge = (s: CharterTask['status']) => {
    const config: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-gray-100 text-gray-700', label: 'Pendiente' },
      in_progress: { color: 'bg-blue-100 text-blue-700', label: 'En Progreso' },
      completed: { color: 'bg-green-100 text-green-700', label: 'Completado' },
      delayed: { color: 'bg-red-100 text-red-700', label: 'Retrasado' },
    };
    const c = config[s] || { color: 'bg-gray-100 text-gray-700', label: s };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>;
  };

  const progressBar = (value: number) => {
    const color = value >= 100 ? 'bg-green-500' : value >= 50 ? 'bg-blue-500' : value > 0 ? 'bg-amber-500' : 'bg-gray-300';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden w-20">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
        </div>
        <span className="text-xs font-medium text-gray-600 w-10 text-right">{value}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">{t('projectDetail.charter')}</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors">
            <Upload className="w-4 h-4" />
            {t('projectDetail.importPlan')}
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            {t('projectDetail.addTask')}
          </button>
        </div>
      </div>

      {/* Change History Panel */}
      {importHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-700">{t('projectDetail.changeHistory')}</h4>
          </div>
          <div className="space-y-2">
            {importHistory.map(entry => (
              <div key={entry.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center gap-3">
                  <FileUp className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-gray-800">{entry.filename}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{entry.changesCount} {t('projectDetail.changesDetected')}</span>
                  <span>{entry.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <ListTree className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('projectDetail.noTasks')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.wbs')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tarea</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.responsible')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projects.startDate')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projects.endDate')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">{t('projectDetail.duration')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">{t('projects.progress')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Delay</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map(task => (
                <tr key={task.id} className={`hover:bg-gray-50 ${isPastDue(task) ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{task.wbs}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" style={{ paddingLeft: `${(task.outlineLevel - 1) * 20}px` }}>
                      {task.isMilestone ? (
                        <Diamond className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      ) : null}
                      <span className={`font-medium ${task.outlineLevel === 1 ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
                        {task.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{task.responsible}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{task.startDate}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{task.endDate}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{task.duration > 0 ? `${task.duration}d` : '-'}</td>
                  <td className="px-4 py-3">{progressBar(task.progress)}</td>
                  <td className="px-4 py-3">{statusBadge(task.status)}</td>
                  <td className="px-4 py-3 text-center">
                    {task.wasDelayed && <Clock className="w-4 h-4 text-red-500 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(task)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                      <button onClick={() => handleDelete(task.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Import Plan Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{t('projectDetail.importPlan')}</h3>
              <button onClick={() => setShowImport(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-1">Arrastra un archivo .mpp, .xlsx o .csv</p>
              <p className="text-xs text-gray-400">o haz clic para seleccionar</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".mpp,.xlsx,.csv,.xml"
                onChange={handleFileSelect}
              />
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
              >
                Seleccionar archivo
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">Formatos soportados: MS Project (.mpp), Excel (.xlsx), CSV (.csv)</p>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Changes Diff Modal */}
      {pendingChanges && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Se detectaron {pendingChanges.length} {t('projectDetail.changesDetected')}
                </h3>
                <p className="text-sm text-gray-500 mt-1">Archivo: {pendingFilename}</p>
              </div>
              <button onClick={handleCancelChanges} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Acción</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.task')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Campo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.oldValue')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('projectDetail.newValue')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingChanges.map((change, idx) => {
                    const rowStyle = change.action === 'added'
                      ? 'bg-green-50 hover:bg-green-100'
                      : change.action === 'deleted'
                        ? 'bg-red-50 hover:bg-red-100'
                        : 'hover:bg-gray-50';
                    const actionBadge = change.action === 'added'
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Nueva</span>
                      : change.action === 'deleted'
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Eliminada</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Modificada</span>;
                    return (
                      <tr key={idx} className={rowStyle}>
                        <td className="px-4 py-3">{actionBadge}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{change.task}</td>
                        <td className="px-4 py-3 text-gray-600">{change.field}</td>
                        <td className="px-4 py-3 text-red-600 bg-red-50">{change.oldValue || '-'}</td>
                        <td className="px-4 py-3 text-green-600 bg-green-50">{change.newValue}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={handleCancelChanges} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">{t('common.cancel')}</button>
              <button onClick={handleApplyChanges} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">{t('projectDetail.applyChanges')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('projectDetail.editTask') : t('projectDetail.addTask')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.wbs')}</label>
                  <input value={form.wbs} onChange={e => setForm({ ...form, wbs: e.target.value })} placeholder="ej. 2.1.3" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.riskTitle')}</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.responsible')}</label>
                <input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.startDate')}</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.endDate')}</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.progress')} (%)</label>
                  <input type="number" min={0} max={100} value={form.progress} onChange={e => setForm({ ...form, progress: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isMilestone" checked={form.isMilestone} onChange={e => setForm({ ...form, isMilestone: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <label htmlFor="isMilestone" className="text-sm text-gray-700 flex items-center gap-1">
                      <Diamond className="w-3.5 h-3.5 text-purple-500" /> Es hito (milestone)
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">{t('common.cancel')}</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
