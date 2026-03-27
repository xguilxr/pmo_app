import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  AlertTriangle,
  Bug,
  RefreshCw,
  Files,
  Lightbulb,
  ClipboardList,
  Settings,
  Users,
  Shield,
  Building2,
  BarChart3,
  ChevronDown,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { useBranding } from '../../context/BrandingContext';

export default function Sidebar() {
  const { t } = useTranslation();
  const { branding, colors } = useBranding();
  const [modulesOpen, setModulesOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive
        ? `${colors.bg50} ${colors.text700} font-medium`
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const subLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 pl-9 pr-3 py-1.5 rounded-lg text-sm transition-colors ${
      isActive
        ? `${colors.bg50} ${colors.text700} font-medium`
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.logoText} className="w-8 h-8 object-contain" />
          ) : (
            <FolderKanban className={`w-6 h-6 ${colors.text600}`} />
          )}
          {branding.logoText}
        </h1>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavLink to="/" className={linkClass} end>
          <LayoutDashboard className="w-4 h-4" />
          {t('nav.dashboard')}
        </NavLink>

        <NavLink to="/requests" className={linkClass}>
          <FileText className="w-4 h-4" />
          {t('nav.requests')}
        </NavLink>

        <NavLink to="/organizations" className={linkClass}>
          <Building2 className="w-4 h-4" />
          {t('nav.organizations')}
        </NavLink>

        <NavLink to="/projects" className={linkClass}>
          <FolderKanban className="w-4 h-4" />
          {t('nav.projects')}
        </NavLink>

        {/* Modules dropdown */}
        <button
          onClick={() => setModulesOpen(!modulesOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full transition-colors"
        >
          <ClipboardList className="w-4 h-4" />
          {t('nav.projectModules')}
          {modulesOpen ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
        </button>
        {modulesOpen && (
          <div className="space-y-0.5">
            <NavLink to="/risks" className={subLinkClass}><AlertTriangle className="w-3.5 h-3.5" />{t('nav.risks')}</NavLink>
            <NavLink to="/issues" className={subLinkClass}><Bug className="w-3.5 h-3.5" />{t('nav.issues')}</NavLink>
            <NavLink to="/changes" className={subLinkClass}><RefreshCw className="w-3.5 h-3.5" />{t('nav.changes')}</NavLink>
            <NavLink to="/documents" className={subLinkClass}><Files className="w-3.5 h-3.5" />{t('nav.documents')}</NavLink>
            <NavLink to="/lessons" className={subLinkClass}><Lightbulb className="w-3.5 h-3.5" />{t('nav.lessons')}</NavLink>
            <NavLink to="/minutes" className={subLinkClass}><ClipboardList className="w-3.5 h-3.5" />{t('nav.minutes')}</NavLink>
            <NavLink to="/reports" className={subLinkClass}><BarChart3 className="w-3.5 h-3.5" />{t('nav.reports')}</NavLink>
          </div>
        )}

        {/* Admin dropdown */}
        <button
          onClick={() => setAdminOpen(!adminOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full transition-colors"
        >
          <Settings className="w-4 h-4" />
          {t('nav.admin')}
          {adminOpen ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
        </button>
        {adminOpen && (
          <div className="space-y-0.5">
            <NavLink to="/admin/users" className={subLinkClass}><Users className="w-3.5 h-3.5" />{t('nav.users')}</NavLink>
            <NavLink to="/admin/roles" className={subLinkClass}><Shield className="w-3.5 h-3.5" />{t('nav.roles')}</NavLink>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition-colors">
          <LogOut className="w-4 h-4" />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
