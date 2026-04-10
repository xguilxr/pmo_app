import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import MinutesPage from './pages/MinutesPage';
import RequestsPage from './pages/RequestsPage';
import RisksPage from './pages/RisksPage';
import IssuesPage from './pages/IssuesPage';
import ChangesPage from './pages/ChangesPage';
import DocumentsPage from './pages/DocumentsPage';
import LessonsPage from './pages/LessonsPage';
import OrganizationsPage from './pages/OrganizationsPage';
import OrganizationDetailPage from './pages/OrganizationDetailPage';
import ProgramDetailPage from './pages/ProgramDetailPage';
import ReportsPage from './pages/ReportsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminOrganizationsPage from './pages/admin/AdminOrganizationsPage';
import AdminPermissionsPage from './pages/admin/AdminPermissionsPage';
import AdminProjectTypesPage from './pages/admin/AdminProjectTypesPage';
import AdminVariablesPage from './pages/admin/AdminVariablesPage';
import AdminLogsPage from './pages/admin/AdminLogsPage';
import AdminProjectsPage from './pages/admin/AdminProjectsPage';
import AdminProgramsPage from './pages/admin/AdminProgramsPage';
import './i18n';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/organizations" element={<OrganizationsPage />} />
          <Route path="/organizations/:orgName" element={<OrganizationDetailPage />} />
          <Route path="/programs/:id" element={<ProgramDetailPage />} />
          <Route path="/risks" element={<RisksPage />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/changes" element={<ChangesPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/lessons" element={<LessonsPage />} />
          <Route path="/minutes" element={<MinutesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/roles" element={<AdminRolesPage />} />
          <Route path="/admin/organizations" element={<AdminOrganizationsPage />} />
          <Route path="/admin/empresas" element={<AdminOrganizationsPage />} />
          <Route path="/admin/permissions" element={<AdminPermissionsPage />} />
          <Route path="/admin/project-types" element={<AdminProjectTypesPage />} />
          <Route path="/admin/variables" element={<AdminVariablesPage />} />
          <Route path="/admin/logs" element={<AdminLogsPage />} />
          <Route path="/admin/projects" element={<AdminProjectsPage />} />
          <Route path="/admin/programs" element={<AdminProgramsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
