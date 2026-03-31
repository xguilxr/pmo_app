import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, X, Search } from 'lucide-react';
import { api } from '../services/api';
import { useApi, LoadingSpinner, ErrorMessage } from '../hooks/useApi';
import PageHeader from '../components/common/PageHeader';
import { useToast } from '../context/ToastContext';

interface ApiOrg {
  id: number;
  name: string;
  legal_name: string | null;
  industry: string | null;
  country: string | null;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
}

export default function OrganizationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toastSuccess, toastError } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [newOrg, setNewOrg] = useState({ name: '', legalName: '', industry: '', country: 'México', contactEmail: '', isActive: true });
  const [saving, setSaving] = useState(false);

  const { data: organizations, loading, error, refetch } = useApi<ApiOrg[]>(() => api.get<ApiOrg[]>('/organizations'), []);

  const filtered = (organizations || []).filter(org =>
    org.name.toLowerCase().includes(search.toLowerCase()) ||
    (org.industry || '').toLowerCase().includes(search.toLowerCase()) ||
    (org.country || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateOrg = async () => {
    if (!newOrg.name.trim()) { toastError('El nombre es requerido'); return; }
    setSaving(true);
    try {
      await api.post('/organizations', {
        name: newOrg.name,
        legal_name: newOrg.legalName || null,
        industry: newOrg.industry || null,
        country: newOrg.country || null,
        contact_email: newOrg.contactEmail || null,
        is_active: newOrg.isActive,
      });
      toastSuccess(`Organización "${newOrg.name}" creada exitosamente`);
      refetch();
      setShowCreateModal(false);
      setNewOrg({ name: '', legalName: '', industry: '', country: 'México', contactEmail: '', isActive: true });
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error al crear organización');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error && !organizations?.length) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: t('nav.organizations') }]}
        title={t('nav.organizations')}
      >
        <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-[13px] font-semibold hover:bg-accent-hover transition-all duration-200 shadow-sm shadow-accent/25">
          <Plus className="w-4 h-4" />
          {t('admin.newOrg')}
        </button>
      </PageHeader>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar organizaciones..."
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
        />
      </div>

      {/* Organization Grid */}
      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <Building2 className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Sin organizaciones</h3>
          <p className="text-[13px] text-text-secondary">Crea tu primera organización para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(org => (
            <div
              key={org.id}
              onClick={() => navigate(`/organizations/${encodeURIComponent(org.name)}`)}
              className="group bg-surface border border-border rounded-2xl p-5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:border-accent/30 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                  <Building2 className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                    {org.name}
                  </h3>
                  {org.legal_name && (
                    <p className="text-[12px] text-text-tertiary truncate mt-0.5">{org.legal_name}</p>
                  )}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${org.is_active ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                  {org.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-border-light grid grid-cols-2 gap-3">
                {org.industry && (
                  <div>
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Industria</p>
                    <p className="text-[13px] text-text-secondary font-medium mt-0.5">{org.industry}</p>
                  </div>
                )}
                {org.country && (
                  <div>
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">País</p>
                    <p className="text-[13px] text-text-secondary font-medium mt-0.5">{org.country}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="liquid-modal rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <h3 className="text-[15px] font-bold text-text-primary">{t('admin.newOrg')}</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-surface-hover rounded-xl transition-colors">
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nombre *</label>
                <input value={newOrg.name} onChange={e => setNewOrg({...newOrg, name: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Razón Social</label>
                <input value={newOrg.legalName} onChange={e => setNewOrg({...newOrg, legalName: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Industria</label>
                  <select value={newOrg.industry} onChange={e => setNewOrg({...newOrg, industry: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all">
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
                  <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">País</label>
                  <input value={newOrg.country} onChange={e => setNewOrg({...newOrg, country: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Email de contacto</label>
                <input type="email" value={newOrg.contactEmail} onChange={e => setNewOrg({...newOrg, contactEmail: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Activa</label>
                <button
                  type="button"
                  onClick={() => setNewOrg({...newOrg, isActive: !newOrg.isActive})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${newOrg.isActive ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${newOrg.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface-hover rounded-xl transition-all">Cancelar</button>
              <button onClick={handleCreateOrg} disabled={saving}
                className="px-5 py-2.5 text-[13px] font-semibold btn-glow text-white rounded-xl transition-all shadow-sm shadow-accent/25 disabled:opacity-50">
                {saving ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
