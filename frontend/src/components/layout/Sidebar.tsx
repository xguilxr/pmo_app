import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logout } from '../../services/auth';
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
  Sliders,
} from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
  const { t } = useTranslation();
  const [modulesOpen, setModulesOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
      isActive
        ? 'bg-accent text-white shadow-sm shadow-accent/25'
        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
    }`;

  const subLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 pl-9 pr-3 py-1.5 rounded-xl text-[13px] transition-all duration-200 ${
      isActive
        ? 'bg-accent-light text-accent font-medium'
        : 'text-text-tertiary hover:bg-surface-hover hover:text-text-secondary'
    }`;

  const sectionBtnClass =
    'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary w-full transition-all duration-200';

  return (
    <aside className="w-[260px] bg-sidebar-bg border-r border-border h-screen flex flex-col fixed left-0 top-0 z-20">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border-light">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-sm shadow-accent/25">
            <FolderKanban className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-text-primary tracking-tight">PMO Platform</h1>
            <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Project Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Principal</p>
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
        <div className="pt-3">
          <p className="px-3 pb-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Módulos</p>
        </div>
        <button onClick={() => setModulesOpen(!modulesOpen)} className={sectionBtnClass}>
          <ClipboardList className="w-4 h-4" />
          {t('nav.projectModules')}
          {modulesOpen ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
        </button>
        {modulesOpen && (
          <div className="space-y-0.5 animate-fade-in">
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
        <div className="pt-3">
          <p className="px-3 pb-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Sistema</p>
        </div>
        <button onClick={() => setAdminOpen(!adminOpen)} className={sectionBtnClass}>
          <Settings className="w-4 h-4" />
          {t('nav.admin')}
          {adminOpen ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
        </button>
        {adminOpen && (
          <div className="space-y-0.5 animate-fade-in">
            <NavLink to="/admin/organizations" className={subLinkClass}><Building2 className="w-3.5 h-3.5" />{t('nav.organizations')}</NavLink>
            <NavLink to="/admin/users" className={subLinkClass}><Users className="w-3.5 h-3.5" />{t('nav.users')}</NavLink>
            <NavLink to="/admin/permissions" className={subLinkClass}><Shield className="w-3.5 h-3.5" />{t('nav.permissions')}</NavLink>
            <NavLink to="/admin/project-types" className={subLinkClass}><FolderKanban className="w-3.5 h-3.5" />{t('nav.projectTypes')}</NavLink>
            <NavLink to="/admin/variables" className={subLinkClass}><Sliders className="w-3.5 h-3.5" />{t('nav.variables')}</NavLink>
            <NavLink to="/admin/logs" className={subLinkClass}><FileText className="w-3.5 h-3.5" />{t('nav.logs')}</NavLink>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-border-light">
        <button onClick={() => logout()} className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-text-tertiary hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 w-full transition-all duration-200">
          <LogOut className="w-4 h-4" />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
