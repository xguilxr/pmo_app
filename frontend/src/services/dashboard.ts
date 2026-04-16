import { api } from './api';
import type { DashboardKPIs } from '../types';

// Re-export type for backward compatibility
export type { DashboardKPIs };

export const dashboardService = {
  kpis: () => api.get<DashboardKPIs>('/dashboard/kpis'),
};
