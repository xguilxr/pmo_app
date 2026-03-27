import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import LoginPage from './pages/LoginPage';
import MinutesPage from './pages/MinutesPage';
import RequestsPage from './pages/RequestsPage';
import RisksPage from './pages/RisksPage';
import IssuesPage from './pages/IssuesPage';
import ChangesPage from './pages/ChangesPage';
import DocumentsPage from './pages/DocumentsPage';
import LessonsPage from './pages/LessonsPage';
import OrganizationsPage from './pages/OrganizationsPage';
import ReportsPage from './pages/ReportsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminOrganizationsPage from './pages/admin/AdminOrganizationsPage';
import './i18n';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/organizations" element={<OrganizationsPage />} />
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
          <Route path="/admin/projects" element={<ProjectsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
