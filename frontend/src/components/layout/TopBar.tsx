import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, Globe, User, ChevronDown, Settings, LogOut } from 'lucide-react';

export default function TopBar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  // Close menu when clicking outside
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
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div />
      <div className="flex items-center gap-4">
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Globe className="w-4 h-4" />
          {i18n.language === 'es' ? 'ES' : 'EN'}
        </button>
        <button className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 pl-3 border-l border-gray-200 hover:bg-gray-50 rounded-lg pr-2 py-1 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Admin PMO</span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">Admin PMO</p>
                <p className="text-xs text-gray-500">admin@pmo-platform.com</p>
              </div>
              <button
                onClick={() => { setUserMenuOpen(false); navigate('/admin/users'); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                {t('nav.manageAccount')}
              </button>
              <div className="border-t border-gray-100">
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/login'); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
