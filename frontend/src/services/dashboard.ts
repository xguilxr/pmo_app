import { api } from './api';

export interface DashboardKPIs {
  active_projects: number;
  requests_in_review: number;
  open_risks: number;
  changes_in_review: number;
  total_budget: number;
  avg_progress: number;
  severe_risks: number;
  open_aids: number;
}

export const dashboardService = {
  kpis: () => api.get<DashboardKPIs>('/dashboard/kpis'),
};
