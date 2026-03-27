import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, FolderKanban, AlertTriangle, TrendingUp, ArrowLeft, Activity } from 'lucide-react';
import { projects } from '../data/mock';
import PhaseBadge from '../components/common/PhaseBadge';
import HealthBadge from '../components/common/HealthBadge';
import ProgressBar from '../components/common/ProgressBar';

function formatMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

const mockRisks = [
  { id: 1, project: 'Migración ERP SAP', description: 'Retraso en entrega de servidor de producción', severity: 'Alta', status: 'Abierto', owner: 'Carlos Méndez' },
  { id: 2, project: 'Portal Clientes B2B', description: 'Dependencia de API externa sin SLA definido', severity: 'Media', status: 'Abierto', owner: 'Laura Torres' },
  { id: 3, project: 'Implementación CRM Salesforce', description: 'Falta de capacitación del equipo en Salesforce', severity: 'Alta', status: 'Mitigado', owner: 'Roberto Silva' },
  { id: 4, project: 'App Móvil Ventas', description: 'Compatibilidad con dispositivos legacy', severity: 'Baja', status: 'Abierto', owner: 'Ana García' },
  { id: 5, project: 'Automatización Nómina', description: 'Cambios regulatorios pendientes en CFDI 4.0', severity: 'Alta', status: 'Abierto', owner: 'Diego Ramírez' },
  { id: 6, project: 'Data Warehouse Analytics', description: 'Volumen de datos mayor al estimado', severity: 'Media', status: 'Abierto', owner: 'María López' },
];

const mockActivities = [
  { id: 1, type: 'task_completed', project: 'Migración ERP SAP', detail: 'Tarea "Configuración módulo FI" completada', date: '2026-03-27', icon: '✓' },
  { id: 2, type: 'risk_opened', project: 'Portal Clientes B2B', detail: 'Nuevo riesgo identificado: dependencia API externa', date: '2026-03-26', icon: '⚠' },
  { id: 3, type: 'document_uploaded', project: 'App Móvil Ventas', detail: 'Documento "Manual de usuario v2" subido', date: '2026-03-25', icon: '📄' },
  { id: 4, type: 'task_completed', project: 'Certificación ISO 27001', detail: 'Tarea "Auditoría interna fase 1" completada', date: '2026-03-25', icon: '✓' },
  { id: 5, type: 'phase_change', project: 'Rediseño Website Corporativo', detail: 'Proyecto movido a fase "Soporte"', date: '2026-03-24', icon: '→' },
  { id: 6, type: 'budget_update', project: 'Implementación CRM Salesforce', detail: 'Presupuesto real actualizado: $1,900,000', date: '2026-03-24', icon: '$' },
  { id: 7, type: 'task_completed', project: 'Sistema de Facturación 4.0', detail: 'Tarea "Integración SAT" completada', date: '2026-03-23', icon: '✓' },
];

export default function OrganizationDetailPage() {
  const { orgName } = useParams<{ orgName: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const decodedName = decodeURIComponent(orgName || '');

  const orgProjects = useMemo(() => {
    return projects.filter(p => p.company === decodedName);
  }, [decodedName]);

  const stats = useMemo(() => {
    const total = orgProjects.length;
    const inExecution = orgProjects.filter(p => p.phase === 'Ejecución').length;
    const avgProgress = total > 0 ? Math.round(orgProjects.reduce((s, p) => s + p.progress, 0) / total) : 0;
    return { total, inExecution, avgProgress };
  }, [orgProjects]);

  const orgRisks = useMemo(() => {
    const projectNames = new Set(orgProjects.map(p => p.name));
    return mockRisks.filter(r => projectNames.has(r.project));
  }, [orgProjects]);

  const orgActivities = useMemo(() => {
    const projectNames = new Set(orgProjects.map(p => p.name));
    return mockActivities.filter(a => projectNames.has(a.project)).slice(0, 5);
  }, [orgProjects]);

  const openRisksCount = orgRisks.filter(r => r.status === 'Abierto').length;

  if (orgProjects.length === 0) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/organizations')} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t('nav.organizations')}
        </button>
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No se encontraron proyectos para "{decodedName}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button onClick={() => navigate('/organizations')} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" />
          {t('nav.organizations')}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{decodedName}</h2>
            <p className="text-sm text-gray-500">{stats.total} {stats.total === 1 ? 'proyecto' : 'proyectos'}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('dashboard.activeProjects')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('projects.execution')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inExecution}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Riesgos Abiertos</p>
              <p className="text-2xl font-bold text-gray-900">{openRisksCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('projects.progress')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgProgress}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{t('nav.projects')}</h3>
        </div>
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
            {orgProjects.map(p => (
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

      {/* Risks Summary */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h3 className="text-base font-semibold text-gray-900">Riesgos</h3>
        </div>
        {orgRisks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No hay riesgos registrados para esta organizaci&oacute;n</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Proyecto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Descripci&oacute;n</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Severidad</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Responsable</th>
              </tr>
            </thead>
            <tbody>
              {orgRisks.map(risk => (
                <tr key={risk.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-700 font-medium">{risk.project}</td>
                  <td className="px-4 py-3 text-gray-600">{risk.description}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      risk.severity === 'Alta' ? 'bg-red-100 text-red-700' :
                      risk.severity === 'Media' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>{risk.severity}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      risk.status === 'Abierto' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}>{risk.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{risk.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <h3 className="text-base font-semibold text-gray-900">Actividad Reciente</h3>
        </div>
        {orgActivities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No hay actividad reciente</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orgActivities.map(activity => (
              <div key={activity.id} className="px-6 py-3 flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.detail}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.project} &middot; {activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
