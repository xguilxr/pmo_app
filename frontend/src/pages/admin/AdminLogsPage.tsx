import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Search, Filter } from 'lucide-react';

interface LogEntry {
  id: number;
  dateTime: string;
  user: string;
  action: 'login' | 'logout' | 'create' | 'edit' | 'delete';
  module: string;
  record: string;
  ip: string;
}

const actionColors: Record<string, { bg: string; text: string }> = {
  login: { bg: 'bg-green-100', text: 'text-green-700' },
  logout: { bg: 'bg-gray-100', text: 'text-gray-700' },
  create: { bg: 'bg-blue-100', text: 'text-blue-700' },
  edit: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  delete: { bg: 'bg-red-100', text: 'text-red-700' },
};

const mockLogs: LogEntry[] = [
  { id: 1, dateTime: '2026-03-27 09:15:23', user: 'Carlos García', action: 'login', module: 'Sistema', record: '-', ip: '192.168.1.100' },
  { id: 2, dateTime: '2026-03-27 09:18:45', user: 'Carlos García', action: 'create', module: 'Proyectos', record: 'PRY-2026-012', ip: '192.168.1.100' },
  { id: 3, dateTime: '2026-03-27 09:22:10', user: 'María López', action: 'login', module: 'Sistema', record: '-', ip: '192.168.1.105' },
  { id: 4, dateTime: '2026-03-27 09:30:55', user: 'María López', action: 'edit', module: 'Riesgos', record: 'RSK-045', ip: '192.168.1.105' },
  { id: 5, dateTime: '2026-03-27 09:45:30', user: 'Carlos García', action: 'create', module: 'Documentos', record: 'DOC-089', ip: '192.168.1.100' },
  { id: 6, dateTime: '2026-03-27 10:00:12', user: 'Ana Martínez', action: 'login', module: 'Sistema', record: '-', ip: '10.0.0.55' },
  { id: 7, dateTime: '2026-03-27 10:05:44', user: 'Ana Martínez', action: 'edit', module: 'Proyectos', record: 'PRY-2026-008', ip: '10.0.0.55' },
  { id: 8, dateTime: '2026-03-27 10:15:20', user: 'Roberto Díaz', action: 'login', module: 'Sistema', record: '-', ip: '192.168.1.112' },
  { id: 9, dateTime: '2026-03-27 10:18:33', user: 'Roberto Díaz', action: 'delete', module: 'Incidencias', record: 'INC-023', ip: '192.168.1.112' },
  { id: 10, dateTime: '2026-03-27 10:30:00', user: 'María López', action: 'create', module: 'Minutas', record: 'MIN-034', ip: '192.168.1.105' },
  { id: 11, dateTime: '2026-03-27 11:00:15', user: 'Carlos García', action: 'edit', module: 'Cambios', record: 'CHG-017', ip: '192.168.1.100' },
  { id: 12, dateTime: '2026-03-27 11:15:42', user: 'Ana Martínez', action: 'create', module: 'Lecciones', record: 'LES-012', ip: '10.0.0.55' },
  { id: 13, dateTime: '2026-03-27 11:30:00', user: 'Roberto Díaz', action: 'logout', module: 'Sistema', record: '-', ip: '192.168.1.112' },
  { id: 14, dateTime: '2026-03-27 12:00:10', user: 'María López', action: 'edit', module: 'Solicitudes', record: 'SOL-007', ip: '192.168.1.105' },
  { id: 15, dateTime: '2026-03-27 12:30:55', user: 'Carlos García', action: 'logout', module: 'Sistema', record: '-', ip: '192.168.1.100' },
];

const users = ['Todos', 'Carlos García', 'María López', 'Ana Martínez', 'Roberto Díaz'];
const actionTypes = ['Todos', 'login', 'logout', 'create', 'edit', 'delete'];

export default function AdminLogsPage() {
  const { t } = useTranslation();
  const [logs] = useState<LogEntry[]>(mockLogs);
  const [filterUser, setFilterUser] = useState('Todos');
  const [filterAction, setFilterAction] = useState('Todos');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const filtered = logs.filter((log) => {
    if (filterUser !== 'Todos' && log.user !== filterUser) return false;
    if (filterAction !== 'Todos' && log.action !== filterAction) return false;
    if (filterDateFrom && log.dateTime < filterDateFrom) return false;
    if (filterDateTo && log.dateTime > filterDateTo + ' 23:59:59') return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('admin.logsTitle')}</h2>
        <span className="text-sm text-gray-500">{filtered.length} registros</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('common.from')}</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('common.to')}</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('admin.logUser')}</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('admin.logAction')}</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {actionTypes.map((a) => (
                <option key={a} value={a}>
                  {a === 'Todos' ? 'Todos' : a.charAt(0).toUpperCase() + a.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.logDate')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.logUser')}</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">{t('admin.logAction')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.logModule')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.logRecord')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">{t('admin.logIP')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((log) => {
              const ac = actionColors[log.action];
              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{log.dateTime}</td>
                  <td className="px-4 py-2.5 text-gray-900">{log.user}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${ac.bg} ${ac.text}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{log.module}</td>
                  <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{log.record}</td>
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{log.ip}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No se encontraron registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
