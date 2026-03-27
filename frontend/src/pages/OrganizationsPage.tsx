import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Building2, FolderKanban, AlertTriangle, TrendingUp, Plus, X } from 'lucide-react';
import { type Project } from '../data/mock';
import { api } from '../services/api';
import { useApi, LoadingSpinner, ErrorMessage } from '../hooks/useApi';
import PhaseBadge from '../components/common/PhaseBadge';
import HealthBadge from '../components/common/HealthBadge';
import ProgressBar from '../components/common/ProgressBar';
import PageHeader from '../components/common/PageHeader';

function formatMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiProject(raw: any): Project {
  return {
    id: raw.id,
    folio: raw.folio || '',
    name: raw.name || '',
    type: raw.type || '',
    priority: raw.priority || 'Media',
    company: raw.company || raw.organization_name || '',
    phase: raw.phase || 'Planificación',
    progress: raw.progress ?? 0,
    plannedProgress: raw.planned_progress ?? 0,
    budget: raw.budget ?? 0,
    realBudget: raw.real_budget ?? 0,
    startDate: raw.start_date || '',
    endDate: raw.end_date || '',
    health: raw.health || 'green',
  };
}

interface OrgSummary {
  name: string;
  projects: Project[];
  totalProjects: number;
  inExecution: number;
  delayed: number;
  avgProgress: number;
}

export default function OrganizationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', legalName: '', industry: '', country: 'México', contactEmail: '', isActive: true });
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  const { data: apiProjects, loading, error, refetch } = useApi<Project[]>(async () => {
    try {
      const raw = await api.get<any[]>('/projects');
      return raw.map(mapApiProject);
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (apiProjects) setProjectsList(apiProjects);
  }, [apiProjects]);

  const organizations = useMemo<OrgSummary[]>(() => {
    const grouped: Record<string, Project[]> = {};
    for (const p of projectsList) {
      if (!grouped[p.company]) grouped[p.company] = [];
      grouped[p.company].push(p);
    }

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, orgProjects]) => {
        const totalProjects = orgProjects.length;
        const inExecution = orgProjects.filter((p) => p.phase === 'Ejecución').length;
        const delayed = orgProjects.filter((p) => p.health === 'red').length;
        const avgProgress = totalProjects > 0
          ? Math.round(orgProjects.reduce((sum, p) => sum + p.progress, 0) / totalProjects)
          : 0;

        return { name, projects: orgProjects, totalProjects, inExecution, delayed, avgProgress };
      });
  }, [projectsList]);

  const handleCreateOrg = async () => {
    if (!newOrg.name.trim()) return;
    try {
      await api.post('/organizations', {
        name: newOrg.name,
        legal_name: newOrg.legalName,
        industry: newOrg.industry,
        country: newOrg.country,
        contact_email: newOrg.contactEmail,
        is_active: newOrg.isActive,
      });
      refetch();
    } catch (err) {
      console.error('Failed to create organization:', err);
    }
    setShowCreateModal(false);
    setNewOrg({ name: '', legalName: '', industry: '', country: 'México', contactEmail: '', isActive: true });
  };

  if (loading) return <LoadingSpinner />;
  if (error && projectsList.length === 0) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('nav.organizations') }]}
        title={t('nav.organizations')}
      >
        <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          {t('admin.newOrg')}
        </button>
      </PageHeader>

      {/* Organization Cards */}
      {organizations.map((org) => (
        <div key={org.name} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Org Header */}
          <div
            onClick={() => navigate(`/organizations/${encodeURIComponent(org.name)}`)}
            className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                  <p className="text-sm text-gray-500">
                    {org.totalProjects} {org.totalProjects === 1 ? 'proyecto' : 'proyectos'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Summary Row */}
          <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <FolderKanban className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('dashboard.activeProjects')}</p>
                <p className="text-lg font-bold text-gray-900">{org.totalProjects}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <FolderKanban className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('projects.execution')}</p>
                <p className="text-lg font-bold text-gray-900">{org.inExecution}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('projects.delayed', 'Retrasados')}</p>
                <p className="text-lg font-bold text-gray-900">{org.delayed}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-4.5 h-4.5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('projects.progress')}</p>
                <p className="text-lg font-bold text-gray-900">{org.avgProgress}%</p>
              </div>
            </div>
          </div>

          {/* Projects Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('projects.folio')}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('projects.name')}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('projects.phase')}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('projects.health', 'Salud')}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-44">{t('projects.progress')}</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">{t('projects.budget')}</th>
              </tr>
            </thead>
            <tbody>
              {org.projects.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.folio}</td>
                  <td className="px-4 py-3 text-blue-600 font-medium">{p.name}</td>
                  <td className="px-4 py-3"><PhaseBadge phase={p.phase} /></td>
                  <td className="px-4 py-3"><HealthBadge health={p.health} /></td>
                  <td className="px-4 py-3"><ProgressBar value={p.progress} planned={p.plannedProgress} /></td>
                  <td className="px-4 py-3 text-right text-gray-700 font-medium">{formatMXN(p.budget)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{t('admin.newOrg')}</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input value={newOrg.name} onChange={e => setNewOrg({...newOrg, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                <input value={newOrg.legalName} onChange={e => setNewOrg({...newOrg, legalName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industria</label>
                <select value={newOrg.industry} onChange={e => setNewOrg({...newOrg, industry: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Seleccionar...</option>
                  <option value="Manufactura">Manufactura</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="Distribución">Distribución</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Financiero">Financiero</option>
                  <option value="Salud">Salud</option>
                  <option value="Educación">Educación</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                <input value={newOrg.country} onChange={e => setNewOrg({...newOrg, country: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de contacto</label>
                <input type="email" value={newOrg.contactEmail} onChange={e => setNewOrg({...newOrg, contactEmail: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Activa</label>
                <button
                  type="button"
                  onClick={() => setNewOrg({...newOrg, isActive: !newOrg.isActive})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newOrg.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newOrg.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleCreateOrg} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
