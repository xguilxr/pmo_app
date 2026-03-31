import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Globe, User, ChevronDown, Settings, LogOut, Sun, Moon,
  FolderKanban, AlertTriangle, FileText, RefreshCw, CheckCheck, Bug, Shield, TrendingUp, Clock
} from 'lucide-react';
import { logout, getCurrentUser } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  project_id: number | null;
  entity_type: string | null;
  entity_id: number | null;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  project_created: { icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-950/50' },
  project_phase_changed: { icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-950/50' },
  project_health_changed: { icon: Shield, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950/50' },
  task_assigned: { icon: CheckCheck, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950/50' },
  task_overdue: { icon: Clock, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-950/50' },
  risk_created: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-950/50' },
  risk_high_severity: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-950/50' },
  issue_created: { icon: Bug, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-950/50' },
  change_status_changed: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-950/50' },
  document_uploaded: { icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950/50' },
  deadline_approaching: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950/50' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export default function TopBar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const user = getCurrentUser();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await api.get<{ count: number }>('/notifications/unread-count');
      setUnreadCount(data.count);
    } catch { /* ignore */ }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get<NotificationItem[]>('/notifications?limit=30');
      setNotifications(data);
      const unread = data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch { /* ignore */ }
  }, []);

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full list when panel opens
  useEffect(() => {
    if (notifOpen) fetchNotifications();
  }, [notifOpen, fetchNotifications]);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const handleClickNotif = (n: NotificationItem) => {
    if (!n.is_read) handleMarkRead(n.id);
    if (n.project_id) {
      navigate(`/projects/${n.project_id}`);
      setNotifOpen(false);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-[56px] glass border-b border-border sticky top-0 z-10 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-all duration-200"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
        </button>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-normal text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-all duration-200"
        >
          <Globe className="w-4 h-4" />
          {i18n.language === 'es' ? 'ES' : 'EN'}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-all duration-200"
          >
            <Bell className="w-[17px] h-[17px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-surface">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-[48px] w-[380px] liquid-modal rounded-2xl animate-fade-in overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
                <h3 className="text-[14px] font-semibold text-text-primary">Notificaciones</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors"
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-10">
                    <Bell className="w-8 h-8 text-text-tertiary mx-auto mb-2 opacity-30" />
                    <p className="text-[13px] text-text-tertiary">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.map(n => {
                    const config = TYPE_CONFIG[n.type] || { icon: Bell, color: 'text-text-tertiary', bg: 'bg-surface-tertiary' };
                    const Icon = config.icon;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleClickNotif(n)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors border-b border-border-light last:border-0 ${!n.is_read ? 'bg-accent/[0.03]' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-[12px] ${!n.is_read ? 'font-semibold text-text-primary' : 'font-normal text-text-secondary'} truncate`}>
                              {n.title}
                            </p>
                            {!n.is_read && <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0" />}
                          </div>
                          {n.message && (
                            <p className="text-[11px] text-text-tertiary mt-0.5 line-clamp-2">{n.message}</p>
                          )}
                          <p className="text-[10px] text-text-tertiary mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-7 bg-border mx-1.5" />

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 hover:bg-surface-hover rounded-xl px-2.5 py-1.5 transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/10">
              <User className="w-4 h-4 text-accent" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-[13px] font-normal text-text-primary block leading-tight">{user?.fullName || 'Usuario'}</span>
              <span className="text-[10px] text-text-tertiary font-light block leading-tight">{user?.roles?.[0] || ''}</span>
            </div>
            <ChevronDown className={`w-3 h-3 text-text-tertiary transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-[52px] w-56 liquid-modal rounded-2xl py-1 animate-fade-in">
              <div className="px-4 py-3 border-b border-border-light">
                <p className="text-[13px] font-medium text-text-primary">{user?.fullName || 'Usuario'}</p>
                <p className="text-[11px] text-text-tertiary font-light">{user?.roles?.join(', ') || ''}</p>
              </div>
              <button
                onClick={() => { setUserMenuOpen(false); navigate('/admin/users'); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] font-light text-text-secondary hover:bg-surface-hover transition-colors"
              >
                <Settings className="w-4 h-4 text-text-tertiary" />
                {t('nav.manageAccount')}
              </button>
              <div className="border-t border-border-light">
                <button
                  onClick={() => { setUserMenuOpen(false); logout(); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] font-light text-red-400 hover:bg-red-500/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
