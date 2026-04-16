/**
 * Dashboard type definitions.
 * Aligned with backend schemas: DashboardKPIs.
 */

import type { ProjectListItem } from './project';

/** Matches backend DashboardKPIs schema */
export interface DashboardKPIs {
  active_projects: number;
  requests_in_review: number;
  open_risks: number;
  changes_in_review: number;
  total_budget: number;
  avg_progress: number;
  severe_risks: number;
  open_aids: number;
  total_real_budget: number;
  budget_variance: number;
  projects_by_phase: Record<string, number>;
  projects_by_health: Record<string, number>;
  total_resources: number;
  projects_by_type: Record<string, number>;
  top_projects_by_progress: ProjectListItem[];
}
