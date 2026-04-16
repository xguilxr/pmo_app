import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, FolderKanban, AlertTriangle, TrendingUp, Plus, X, Layers } from 'lucide-react';
import { api } from '../services/api';
import { LoadingSpinner } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import PhaseBadge from '../components/common/PhaseBadge';
import HealthBadge from '../components/common/HealthBadge';
import ProgressBar from '../components/common/ProgressBar';
import PageHeader from '../components/common/PageHeader';

interface ApiOrg {
  id: number; name: string; legal_name: string | null; industry: string | null;
  country: string | null; contact_email: string | null; is_active: boolean;
}

interface ApiProject {
  id: number; folio: string; name: string; type: string; priority: string;
  phase: string; progress: number; planned_progress: number; budget: number; health: string; company?: string;
}

interface ApiProgram {
  id: number; name: string; description: string | null; status: string;
  start_date: string | null; end_date: string | null; organization_id: number;
  project_count: number; created_at: string;
}

function formatMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

export default function OrganizationDetailPage() {
  const { orgName } = useParams<{ orgName: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toastSuccess, toastError } = useToast();
  const decodedName = decodeURIComponent(orgName || '');

  const [org, setOrg] = useState<ApiOrg | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [programs, setPrograms] = useState<ApiProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [programForm, setProgramForm] = useState({ name: '', description: '', startDate: '', endDate: '' });
  const [projectForm, setProjectForm] = useState({ name: '', type: 'Tecnología', priority: 'Media', programId: 0, startDate: '', endDate: '', budget: 0 });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const orgs = await api.get<ApiOrg[]>('/organizations');
      const found = orgs.find(o => o.name === decodedName);
      if (!found) { setLoading(false); return; }
      setOrg(found);

      const [projs, progs] = await Promise.all([
        api.get<ApiProject[]>(`/projects?company=${encodeURIComponent(decodedName)}`).catch(() => [] as ApiProject[]),
        api.get<ApiProgram[]>(`/programs?organization_id=${found.id}`).catch(() => [] as ApiProgram[]),
      ]);
      setProjects(projs);
      setPrograms(progs);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al cargar datos de la organización');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [decodedName]);

  const handleCreateProgram = async () => {
    if (!programForm.name.trim() || !org) return;
    setSaving(true);
    try {
      await api.post('/programs', {
        name: programForm.name, description: programForm.description || null,
        organization_id: org.id,
        start_date: programForm.startDate || null, end_date: programForm.endDate || null,
      });
      toastSuccess(`Programa "${programForm.name}" creado`);
      setShowProgramModal(false);
      setProgramForm({ name: '', description: '', startDate: '', endDate: '' });
      fetchData();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error al crear programa'); }
    setSaving(false);
  };

  const handleCreateProject = async () => {
    if (!projectForm.name.trim() || !org) return;
    setSaving(true);
    try {
      await api.post('/projects', {
        name: projectForm.name, type: projectForm.type, priority: projectForm.priority,
        organization_id: org.id,
        program_id: projectForm.programId || null,
        start_date: projectForm.startDate || null, end_date: projectForm.endDate || null,
        budget: projectForm.budget,
      });
      toastSuccess(`Proyecto "${projectForm.name}" creado`);
      setShowProjectModal(false);
      setProjectForm({ name: '', type: 'Tecnología', priority: 'Media', programId: 0, startDate: '', endDate: '', budget: 0 });
      fetchData();
    } catch (err) { toastError(err instanceof Error ? err.message : 'Error al crear proyecto'); }
    setSaving(false);
  };

  const stats = {
    total: projects.length,
    inExecution: projects.filter(p => p.phase === 'Ejecución').length,
    avgProgress: projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0,
    totalBudget: projects.reduce((s, p) => s + p.budget, 0),
  };

  if (loading) return <LoadingSpinner />;

  if (!org) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('nav.organizations'), href: '/organizations' }, { label: decodedName }]} title={decodedName} />
        <div className="text-center py-16 liquid-glass-border rounded-2xl">
          <Building2 className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">No se encontró la organización "{decodedName}"</p>
        </div>
      </div>
    );
  }

  const inputCls = "w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";
  const labelCls = "block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('nav.organizations'), href: '/organizations' }, { label: org.name }]}
        title={org.name}
        subtitle={[org.legal_name, org.industry, org.country].filter(Boolean).join(' · ')}
      >
        <div className="flex items-center gap-2">
          <button onClick={() => setShowProgramModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-[13px] font-semibold text-text-secondary hover:bg-surface-hover transition-all">
            <Layers className="w-4 h-4" /> Nuevo Programa
          </button>
          <button onClick={() => setShowProjectModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-[13px] font-semibold hover:bg-accent-hover transition-all shadow-sm shadow-accent/25">
            <Plus className="w-4 h-4" /> Nuevo Proyecto
          </button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: t('dashboard.activeProjects'), value: stats.total, icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/50' },
          { label: t('projects.execution'), value: stats.inExecution, icon: FolderKanban, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/50' },
          { label: t('projects.progress'), value: `${stats.avgProgress}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
          { label: t('projects.budget'), value: formatMXN(stats.totalBudget), icon: AlertTriangle, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/50' },
        ].map((kpi, i) => (
          <div key={i} className="liquid-glass-border rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">{kpi.label}</p>
                <p className="text-xl font-bold text-text-primary">{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Programs Section */}
      {programs.length > 0 && (
        <div className="liquid-glass-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <h3 className="text-[15px] font-bold text-text-primary">Programas</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {programs.map(prog => (
              <Link key={prog.id} to={`/programs/${prog.id}`}
                className="group bg-surface-secondary rounded-xl border border-border-light p-4 hover:border-accent/30 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-[14px] font-semibold text-text-primary group-hover:text-accent transition-colors">{prog.name}</h4>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${prog.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 text-gray-500'}`}>
                    {prog.status === 'active' ? 'Activo' : prog.status}
                  </span>
                </div>
                {prog.description && <p className="text-[12px] text-text-tertiary mb-2 line-clamp-2">{prog.description}</p>}
                <p className="text-[12px] text-text-secondary font-medium">{prog.project_count} proyecto{prog.project_count !== 1 ? 's' : ''}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Projects Table */}
      <div className="liquid-glass-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-light">
          <h3 className="text-[15px] font-bold text-text-primary">{t('nav.projects')}</h3>
        </div>
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <p className="text-[13px] text-text-secondary">Sin proyectos. Crea el primero.</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface-tertiary border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">{t('projects.folio')}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">{t('projects.name')}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">{t('projects.phase')}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">{t('projects.health', 'Salud')}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider w-40">{t('projects.progress')}</th>
                <th className="text-right px-4 py-3 font-semibold text-text-tertiary text-[11px] uppercase tracking-wider">{t('projects.budget')}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`, { state: { fromOrg: org.name, fromOrgId: org.id } })} className="border-b border-border-light hover:bg-surface-hover transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-text-tertiary font-mono text-[11px]">{p.folio}</td>
                  <td className="px-4 py-3 text-accent font-medium">{p.name}</td>
                  <td className="px-4 py-3"><PhaseBadge phase={p.phase} /></td>
                  <td className="px-4 py-3"><HealthBadge health={(p.health || 'green') as 'green' | 'yellow' | 'red'} /></td>
                  <td className="px-4 py-3"><ProgressBar value={p.progress} planned={p.planned_progress} /></td>
                  <td className="px-4 py-3 text-right text-text-secondary font-medium">{formatMXN(p.budget)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Program Modal */}
      {showProgramModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">Nuevo Programa</h3>
              <button onClick={() => setShowProgramModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={labelCls}>Nombre *</label><input value={programForm.name} onChange={e => setProgramForm({...programForm, name: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Descripción</label><textarea value={programForm.description} onChange={e => setProgramForm({...programForm, description: e.target.value})} rows={3} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Fecha Inicio</label><input type="date" value={programForm.startDate} onChange={e => setProgramForm({...programForm, startDate: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Fecha Fin</label><input type="date" value={programForm.endDate} onChange={e => setProgramForm({...programForm, endDate: e.target.value})} className={inputCls} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button onClick={() => setShowProgramModal(false)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">Cancelar</button>
              <button onClick={handleCreateProgram} disabled={saving} className="px-5 py-2.5 text-[13px] font-semibold btn-glow text-white rounded-xl shadow-sm shadow-accent/25 disabled:opacity-50">
                {saving ? 'Creando...' : 'Crear Programa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">Nuevo Proyecto</h3>
              <button onClick={() => setShowProjectModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl"><X className="w-4 h-4 text-text-tertiary" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={labelCls}>Nombre *</label><input value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Tipo</label>
                  <select value={projectForm.type} onChange={e => setProjectForm({...projectForm, type: e.target.value})} className={inputCls}>
                    {['Tecnología', 'Digital', 'Procesos', 'Infraestructura', 'Regulatorio'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Prioridad</label>
                  <select value={projectForm.priority} onChange={e => setProjectForm({...projectForm, priority: e.target.value})} className={inputCls}>
                    {['Alta', 'Media', 'Baja'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              {programs.length > 0 && (
                <div><label className={labelCls}>Programa (opcional)</label>
                  <select value={projectForm.programId} onChange={e => setProjectForm({...projectForm, programId: Number(e.target.value)})} className={inputCls}>
                    <option value={0}>Sin programa</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Fecha Inicio</label><input type="date" value={projectForm.startDate} onChange={e => setProjectForm({...projectForm, startDate: e.target.value})} className={inputCls} /></div>
                <div><label className={labelCls}>Fecha Fin</label><input type="date" value={projectForm.endDate} onChange={e => setProjectForm({...projectForm, endDate: e.target.value})} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Presupuesto</label><input type="number" min="0" step="1000" value={projectForm.budget} onChange={e => setProjectForm({...projectForm, budget: Number(e.target.value)})} className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button onClick={() => setShowProjectModal(false)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl">Cancelar</button>
              <button onClick={handleCreateProject} disabled={saving} className="px-5 py-2.5 text-[13px] font-semibold btn-glow text-white rounded-xl shadow-sm shadow-accent/25 disabled:opacity-50">
                {saving ? 'Creando...' : 'Crear Proyecto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
