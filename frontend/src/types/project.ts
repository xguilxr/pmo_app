/**
 * Project-related type definitions.
 * Aligned with backend schemas: ProjectResponse, ProjectListResponse, ProjectCreate, ProjectUpdate.
 */

/** Matches backend ProjectResponse schema */
export interface Project {
  id: number;
  folio: string;
  name: string;
  description: string | null;
  type: string | null;
  priority: string | null;
  phase: string;
  status: string;
  health: string;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  real_budget: number;
  progress: number;
  planned_progress: number;
  organization_id: number;
  program_id: number | null;
  organization_name: string | null;
  program_name: string | null;
  created_at: string;
}

/** Matches backend ProjectListResponse schema */
export interface ProjectListItem {
  id: number;
  folio: string;
  name: string;
  type: string | null;
  priority: string | null;
  company: string;
  phase: string;
  progress: number;
  planned_progress: number;
  budget: number;
  health: string;
  start_date: string | null;
  end_date: string | null;
  program_id: number | null;
  program_name: string | null;
}

/** Matches backend ProjectCreate schema */
export interface ProjectCreate {
  name: string;
  description?: string | null;
  type?: string | null;
  priority?: string | null;
  organization_id: number;
  program_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number;
  request_id?: number | null;
}

/** Matches backend ProjectUpdate schema */
export interface ProjectUpdate {
  name?: string | null;
  description?: string | null;
  type?: string | null;
  priority?: string | null;
  phase?: string | null;
  health?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  real_budget?: number | null;
  progress?: number | null;
  planned_progress?: number | null;
  organization_id?: number | null;
  program_id?: number | null;
}

/** Frontend-friendly project view used in Info/Charter tabs (camelCase mapped) */
export interface ProjectView {
  id: number;
  folio: string;
  name: string;
  description?: string;
  type: string;
  priority: string;
  company: string;
  programName: string;
  phase: string;
  progress: number;
  plannedProgress: number;
  budget: number;
  realBudget: number;
  startDate: string;
  endDate: string;
  health: string;
}
