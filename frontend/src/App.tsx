import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import LoginPage from './pages/LoginPage';
import PlaceholderPage from './pages/PlaceholderPage';
import './i18n';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<PlaceholderPage />} />
          <Route path="/requests" element={<PlaceholderPage />} />
          <Route path="/risks" element={<PlaceholderPage />} />
          <Route path="/issues" element={<PlaceholderPage />} />
          <Route path="/changes" element={<PlaceholderPage />} />
          <Route path="/documents" element={<PlaceholderPage />} />
          <Route path="/lessons" element={<PlaceholderPage />} />
          <Route path="/minutes" element={<PlaceholderPage />} />
          <Route path="/admin/users" element={<PlaceholderPage />} />
          <Route path="/admin/roles" element={<PlaceholderPage />} />
          <Route path="/admin/organizations" element={<PlaceholderPage />} />
          <Route path="/admin/projects" element={<PlaceholderPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
