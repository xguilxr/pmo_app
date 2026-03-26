import { useTranslation } from 'react-i18next';
import {
  FolderKanban, FileText, AlertTriangle, RefreshCw,
  DollarSign, TrendingUp, ShieldAlert, Bug,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import KpiCard from '../components/common/KpiCard';
import HealthBadge from '../components/common/HealthBadge';
import ProgressBar from '../components/common/ProgressBar';
import {
  kpis, projects, projectsByPhase, avgProgressByPhase,
  budgetByType, portfolioHealth,
} from '../data/mock';
import { Link } from 'react-router-dom';

function formatMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const activeProjects = projects.filter(p => p.phase !== 'Cerrado');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">{t('dashboard.title')}</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard title={t('dashboard.activeProjects')} value={kpis.activeProjects} icon={<FolderKanban className="w-5 h-5 text-blue-600" />} to="/projects" color="bg-blue-50" />
        <KpiCard title={t('dashboard.requestsInReview')} value={kpis.requestsInReview} icon={<FileText className="w-5 h-5 text-amber-600" />} to="/requests" color="bg-amber-50" />
        <KpiCard title={t('dashboard.openRisks')} value={kpis.openRisks} icon={<AlertTriangle className="w-5 h-5 text-orange-600" />} to="/risks" color="bg-orange-50" />
        <KpiCard title={t('dashboard.changesInReview')} value={kpis.changesInReview} icon={<RefreshCw className="w-5 h-5 text-purple-600" />} to="/changes" color="bg-purple-50" />
        <KpiCard title={t('dashboard.totalBudget')} value={formatMXN(kpis.totalBudget)} icon={<DollarSign className="w-5 h-5 text-green-600" />} to="/projects" color="bg-green-50" />
        <KpiCard title={t('dashboard.avgProgress')} value={`${kpis.avgProgress}%`} icon={<TrendingUp className="w-5 h-5 text-blue-600" />} to="/projects" color="bg-blue-50" />
        <KpiCard title={t('dashboard.severeRisks')} value={kpis.severeRisks} icon={<ShieldAlert className="w-5 h-5 text-red-600" />} to="/risks" color="bg-red-50" />
        <KpiCard title={t('dashboard.openAids')} value={kpis.openAids} icon={<Bug className="w-5 h-5 text-indigo-600" />} to="/issues" color="bg-indigo-50" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Projects by Phase - Pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('dashboard.projectsByPhase')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={projectsByPhase} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {projectsByPhase.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Avg Progress by Phase - Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('dashboard.avgProgressByPhase')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={avgProgressByPhase}>
              <XAxis dataKey="phase" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="progress" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget by Type - Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('dashboard.budgetByType')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={budgetByType} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatMXN(v)} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 12 }} width={110} />
              <Tooltip formatter={(value) => formatMXN(value as number)} />
              <Bar dataKey="budget" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Portfolio Health - Pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('dashboard.portfolioHealth')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={portfolioHealth} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {portfolioHealth.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Plan vs Real Matrix */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('dashboard.planVsReal')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="pb-3 font-semibold text-gray-600">{t('dashboard.project')}</th>
                <th className="pb-3 font-semibold text-gray-600">{t('dashboard.start')}</th>
                <th className="pb-3 font-semibold text-gray-600">{t('dashboard.end')}</th>
                <th className="pb-3 font-semibold text-gray-600 text-right">{t('dashboard.planBudget')}</th>
                <th className="pb-3 font-semibold text-gray-600 text-right">{t('dashboard.realBudget')}</th>
                <th className="pb-3 font-semibold text-gray-600 text-center">{t('dashboard.plannedProgress')}</th>
                <th className="pb-3 font-semibold text-gray-600 w-40">{t('dashboard.progress')}</th>
                <th className="pb-3 font-semibold text-gray-600 text-center">{t('dashboard.health')}</th>
              </tr>
            </thead>
            <tbody>
              {activeProjects.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${p.progress < p.plannedProgress - 10 ? 'bg-red-50/50' : ''}`}
                >
                  <td className="py-3">
                    <Link to={`/projects/${p.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-3 text-gray-500">{p.startDate}</td>
                  <td className="py-3 text-gray-500">{p.endDate}</td>
                  <td className="py-3 text-right text-gray-700">{formatMXN(p.budget)}</td>
                  <td className="py-3 text-right text-gray-700">{formatMXN(p.realBudget)}</td>
                  <td className="py-3 text-center text-gray-500">{p.plannedProgress}%</td>
                  <td className="py-3"><ProgressBar value={p.progress} planned={p.plannedProgress} /></td>
                  <td className="py-3 text-center"><HealthBadge health={p.health} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
