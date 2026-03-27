import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, Building2, Globe, MapPin } from 'lucide-react';
import { api } from '../../services/api';
import { useApi, LoadingSpinner, ErrorMessage } from '../../hooks/useApi';

interface OrgItem {
  id: number;
  name: string;
  legalName: string;
  industry: string;
  country: string;
  contactEmail: string;
  isActive: boolean;
  projectsCount: number;
}

const mockOrgs: OrgItem[] = [
  { id: 1, name: 'Grupo Alfa', legalName: 'Grupo Alfa S.A. de C.V.', industry: 'Manufactura', country: 'México', contactEmail: 'contacto@grupoalfa.com', isActive: true, projectsCount: 4 },
  { id: 2, name: 'TechNova', legalName: 'TechNova Solutions S.A.', industry: 'Tecnología', country: 'México', contactEmail: 'info@technova.com', isActive: true, projectsCount: 2 },
  { id: 3, name: 'Distribuidora MX', legalName: 'Distribuidora MX S. de R.L.', industry: 'Distribución', country: 'México', contactEmail: 'admin@distmx.com', isActive: true, projectsCount: 2 },
  { id: 4, name: 'Servicios Global', legalName: 'Servicios Global Corp.', industry: 'Servicios', country: 'México', contactEmail: 'contact@sglobal.com', isActive: true, projectsCount: 2 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiOrg(raw: any): OrgItem {
  return {
    id: raw.id,
    name: raw.name || '',
    legalName: raw.legal_name || '',
    industry: raw.industry || '',
    country: raw.country || '',
    contactEmail: raw.contact_email || '',
    isActive: raw.is_active ?? true,
    projectsCount: raw.projects_count ?? 0,
  };
}

export default function AdminOrganizationsPage() {
  const { t } = useTranslation();
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OrgItem | null>(null);
  const [form, setForm] = useState({ name: '', legalName: '', industry: '', country: 'México', contactEmail: '', isActive: true });

  // Fetch organizations from API with fallback to mock
  const { data: apiOrgs, loading, error, refetch } = useApi<OrgItem[]>(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await api.get<any[]>('/organizations');
      return raw.map(mapApiOrg);
    } catch {
      console.warn('API unavailable, using mock data');
      return mockOrgs;
    }
  }, []);

  useEffect(() => {
    if (apiOrgs) setOrgs(apiOrgs);
  }, [apiOrgs]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', legalName: '', industry: '', country: 'México', contactEmail: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (o: OrgItem) => {
    setEditing(o);
    setForm({ name: o.name, legalName: o.legalName, industry: o.industry, country: o.country, contactEmail: o.contactEmail, isActive: o.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editing) {
        await api.patch(`/organizations/${editing.id}`, {
          name: form.name,
          legal_name: form.legalName,
          industry: form.industry,
          country: form.country,
          contact_email: form.contactEmail,
          is_active: form.isActive,
        });
      } else {
        await api.post('/organizations', {
          name: form.name,
          legal_name: form.legalName,
          industry: form.industry,
          country: form.country,
          contact_email: form.contactEmail,
          is_active: form.isActive,
        });
      }
      refetch();
    } catch {
      // Fallback: update local state
      if (editing) {
        setOrgs(orgs.map(o => o.id === editing.id ? { ...o, ...form } : o));
      } else {
        setOrgs([...orgs, { id: Date.now(), ...form, projectsCount: 0 }]);
      }
    }
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/organizations/${id}`);
      refetch();
    } catch {
      // Fallback: update local state
      setOrgs(orgs.filter(o => o.id !== id));
    }
  };

  const industryColors: Record<string, string> = {
    'Manufactura': 'bg-amber-100 text-amber-700',
    'Tecnología': 'bg-blue-100 text-blue-700',
    'Distribución': 'bg-green-100 text-green-700',
    'Servicios': 'bg-purple-100 text-purple-700',
  };

  if (loading) return <LoadingSpinner />;
  if (error && orgs.length === 0) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('admin.orgsTitle')}</h2>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          {t('admin.newOrg')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orgs.map(org => (
          <div key={org.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{org.name}</h3>
                  <p className="text-xs text-gray-500">{org.legalName}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(org)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                <button onClick={() => handleDelete(org.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${industryColors[org.industry] || 'bg-gray-100 text-gray-700'}`}>{org.industry}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${org.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{org.isActive ? t('admin.active') : t('admin.inactive')}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{org.country}</span>
              <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{org.contactEmail}</span>
              <span>{org.projectsCount} {t('nav.projects').toLowerCase()}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('admin.editOrg') : t('admin.newOrg')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.orgName')}</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.legalName')}</label>
                <input value={form.legalName} onChange={e => setForm({...form, legalName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.industry')}</label>
                  <select value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.country')}</label>
                  <input value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.contactEmail')}</label>
                <input type="email" value={form.contactEmail} onChange={e => setForm({...form, contactEmail: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setForm({...form, isActive: !form.isActive})} className={`w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${form.isActive ? 'translate-x-4' : ''}`} />
                </button>
                <span className="text-sm text-gray-700">{t('admin.activeOrg')}</span>
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
