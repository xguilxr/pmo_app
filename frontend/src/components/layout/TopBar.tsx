import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, Globe, User, ChevronDown, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { logout, getCurrentUser } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';

export default function TopBar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = getCurrentUser();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-[56px] glass border-b border-border sticky top-0 z-10 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-text-secondary hover:bg-surface-hover transition-all duration-200"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[13px] font-medium text-text-secondary hover:bg-surface-hover transition-all duration-200"
        >
          <Globe className="w-4 h-4" />
          {i18n.language === 'es' ? 'ES' : 'EN'}
        </button>

        {/* Notifications */}
        <button className="relative flex items-center justify-center w-9 h-9 rounded-xl text-text-secondary hover:bg-surface-hover transition-all duration-200">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-surface" />
        </button>

        {/* User dropdown */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 pl-3 border-l border-border hover:bg-surface-hover rounded-xl pr-2.5 py-1.5 transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <User className="w-4 h-4 text-accent" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-[13px] font-semibold text-text-primary block leading-tight">{user?.fullName || 'Usuario'}</span>
              <span className="text-[10px] text-text-tertiary block leading-tight">{user?.roles?.[0] || ''}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-text-tertiary transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-[52px] w-56 bg-surface-elevated rounded-2xl border border-border shadow-xl shadow-black/8 dark:shadow-black/30 py-1 animate-fade-in">
              <div className="px-4 py-3 border-b border-border-light">
                <p className="text-[13px] font-semibold text-text-primary">{user?.fullName || 'Usuario'}</p>
                <p className="text-[11px] text-text-tertiary">{user?.roles?.join(', ') || ''}</p>
              </div>
              <button
                onClick={() => { setUserMenuOpen(false); navigate('/admin/users'); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-text-secondary hover:bg-surface-hover transition-colors"
              >
                <Settings className="w-4 h-4 text-text-tertiary" />
                {t('nav.manageAccount')}
              </button>
              <div className="border-t border-border-light">
                <button
                  onClick={() => { setUserMenuOpen(false); logout(); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
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
