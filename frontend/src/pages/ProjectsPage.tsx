import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { projects as initialProjects, companies, projectTypes, priorities } from '../data/mock';
import ProgressBar from '../components/common/ProgressBar';
import PhaseBadge from '../components/common/PhaseBadge';
import PageHeader from '../components/common/PageHeader';

type StatusFilter = 'Todos' | 'Planificación' | 'Ejecución' | 'Soporte' | 'Cerrado';

function formatMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

export default function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [allProjects, setAllProjects] = useState(initialProjects);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [status, setStatus] = useState<StatusFilter>('Todos');
  const [company, setCompany] = useState('');
  const [folio, setFolio] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const statuses: StatusFilter[] = ['Todos', 'Planificación', 'Ejecución', 'Soporte', 'Cerrado'];

  const statusLabels: Record<StatusFilter, string> = {
    Todos: t('projects.all'),
    Planificación: t('projects.planning'),
    Ejecución: t('projects.execution'),
    Soporte: t('projects.support'),
    Cerrado: t('projects.closed'),
  };

  const filtered = useMemo(() => {
    return allProjects.filter((p) => {
      if (status !== 'Todos' && p.phase !== status) return false;
      if (company && p.company !== company) return false;
      if (folio && !p.folio.toLowerCase().includes(folio.toLowerCase())) return false;
      if (name && !p.name.toLowerCase().includes(name.toLowerCase())) return false;
      if (type && p.type !== type) return false;
      if (priority && p.priority !== priority) return false;
      if (dateFrom && p.startDate < dateFrom) return false;
      if (dateTo && p.startDate > dateTo) return false;
      return true;
    });
  }, [status, company, folio, name, type, priority, dateFrom, dateTo]);

  const clearFilters = () => {
    setStatus('Todos');
    setCompany('');
    setFolio('');
    setName('');
    setType('');
    setPriority('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('nav.projects') }]}
        title={t('projects.title')}
      >
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('projects.newProject')}
        </button>
      </PageHeader>

      {/* Status Buttons */}
      <div className="flex gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === s
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-r from-blue-50/40 to-white rounded-xl border border-blue-100/40 p-4">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projects.company')}</label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{t('common.selectOption')}</option>
              {companies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projects.folio')}</label>
            <input
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              placeholder="PRJ-2026-..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projects.name')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('common.search')}
                className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projects.type')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{t('common.selectOption')}</option>
              {projectTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projects.priority')}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{t('common.selectOption')}</option>
              {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projects.startDate')} ({t('common.from')})</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projects.startDate')} ({t('common.to')})</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              {t('projects.clearFilters')}
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">{filtered.length} {t('projects.results')}</p>

      {/* Projects Matrix */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('projects.folio')}</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('projects.name')}</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('projects.type')} / {t('projects.priority')}</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('projects.company')}</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('projects.phase')}</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-44">{t('projects.progress')}</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">{t('projects.budget')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  {t('projects.noResults')}
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.folio}</td>
                  <td className="px-4 py-3">
                    <Link to={`/projects/${p.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">{p.type}</span>
                    <span className="mx-1.5 text-gray-300">/</span>
                    <span className={`text-xs font-medium ${p.priority === 'Alta' ? 'text-red-600' : p.priority === 'Media' ? 'text-amber-600' : 'text-gray-500'}`}>
                      {p.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.company}</td>
                  <td className="px-4 py-3"><PhaseBadge phase={p.phase} /></td>
                  <td className="px-4 py-3"><ProgressBar value={p.progress} planned={p.plannedProgress} /></td>
                  <td className="px-4 py-3 text-right text-gray-700 font-medium">{formatMXN(p.budget)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(project) => {
            setAllProjects([project, ...allProjects]);
            setShowCreateModal(false);
            navigate(`/projects/${project.id}`);
          }}
          nextId={allProjects.length + 1}
        />
      )}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreate, nextId }: {
  onClose: () => void;
  onCreate: (p: typeof initialProjects[0]) => void;
  nextId: number;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    type: projectTypes[0],
    priority: 'Media' as 'Alta' | 'Media' | 'Baja',
    company: companies[0],
    startDate: '',
    endDate: '',
    budget: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const folio = `PRJ-${new Date().getFullYear()}-${String(nextId).padStart(3, '0')}`;
    onCreate({
      id: nextId,
      folio,
      name: form.name,
      type: form.type,
      priority: form.priority,
      company: form.company,
      phase: 'Planificación',
      progress: 0,
      plannedProgress: 0,
      budget: form.budget,
      realBudget: 0,
      startDate: form.startDate,
      endDate: form.endDate,
      health: 'green',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg border border-gray-200 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{t('projects.newProject')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.name')}</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.type')}</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {projectTypes.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.priority')}</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as 'Alta' | 'Media' | 'Baja' })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.company')}</label>
            <select value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {companies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.startDate')}</label>
              <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.endDate')}</label>
              <input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.budget')}</label>
            <input type="number" min="0" step="1000" required value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">{t('common.cancel')}</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">{t('common.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
