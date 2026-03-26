import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, Users, Shield, Check } from 'lucide-react';

interface UserItem {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  isActive: boolean;
  lastLogin: string;
}

const mockUsers: UserItem[] = [
  { id: 1, username: 'admin', email: 'admin@pmo-platform.com', fullName: 'Administrador PMO', roles: ['Administrador'], isActive: true, lastLogin: '2026-03-26' },
  { id: 2, username: 'jgarcia', email: 'j.garcia@empresa.com', fullName: 'Juan García López', roles: ['Project Manager'], isActive: true, lastLogin: '2026-03-25' },
  { id: 3, username: 'mrodriguez', email: 'm.rodriguez@empresa.com', fullName: 'María Rodríguez Sánchez', roles: ['Project Manager'], isActive: true, lastLogin: '2026-03-24' },
  { id: 4, username: 'lmartinez', email: 'l.martinez@empresa.com', fullName: 'Laura Martínez Díaz', roles: ['PMO Manager'], isActive: true, lastLogin: '2026-03-20' },
  { id: 5, username: 'rlopez', email: 'r.lopez@empresa.com', fullName: 'Roberto López Ruiz', roles: ['Viewer'], isActive: false, lastLogin: '2026-02-15' },
];

const allRoles = ['Administrador', 'PMO Manager', 'Project Manager', 'Viewer'];

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserItem[]>(mockUsers);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [form, setForm] = useState({ username: '', email: '', fullName: '', password: '', roles: [] as string[], isActive: true });
  const [search, setSearch] = useState('');

  const openCreate = () => {
    setEditing(null);
    setForm({ username: '', email: '', fullName: '', password: '', roles: [], isActive: true });
    setShowModal(true);
  };

  const openEdit = (u: UserItem) => {
    setEditing(u);
    setForm({ username: u.username, email: u.email, fullName: u.fullName, password: '', roles: [...u.roles], isActive: u.isActive });
    setShowModal(true);
  };

  const toggleRole = (role: string) => {
    setForm({ ...form, roles: form.roles.includes(role) ? form.roles.filter(r => r !== role) : [...form.roles, role] });
  };

  const handleSave = () => {
    if (!form.username.trim() || !form.email.trim()) return;
    if (editing) {
      setUsers(users.map(u => u.id === editing.id ? { ...u, username: form.username, email: form.email, fullName: form.fullName, roles: form.roles, isActive: form.isActive } : u));
    } else {
      setUsers([...users, { id: Date.now(), username: form.username, email: form.email, fullName: form.fullName, roles: form.roles, isActive: form.isActive, lastLogin: '-' }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => setUsers(users.filter(u => u.id !== id));

  const filtered = search ? users.filter(u => u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) : users;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('admin.usersTitle')}</h2>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          {t('admin.newUser')}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search') + '...'} className="w-full md:w-80 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.user')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.email')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.roles')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.lastLogin')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                      {u.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.fullName}</p>
                      <p className="text-xs text-gray-500">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {u.roles.map(r => (
                      <span key={r} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{r}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.isActive ? t('admin.active') : t('admin.inactive')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.lastLogin}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(u)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                    <button onClick={() => handleDelete(u.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? t('admin.editUser') : t('admin.newUser')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.username')}</label>
                  <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.fullName')}</label>
                  <input value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.email')}</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')}</label>
                  <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.roles')}</label>
                <div className="space-y-2">
                  {allRoles.map(role => (
                    <button key={role} type="button" onClick={() => toggleRole(role)} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm border transition-colors ${form.roles.includes(role) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${form.roles.includes(role) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {form.roles.includes(role) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setForm({...form, isActive: !form.isActive})} className={`w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${form.isActive ? 'translate-x-4' : ''}`} />
                </button>
                <span className="text-sm text-gray-700">{t('admin.activeUser')}</span>
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
