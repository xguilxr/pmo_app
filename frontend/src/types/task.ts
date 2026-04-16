/**
 * Task/WBS type definitions.
 * Aligned with backend Task model.
 */

/** Task as returned by the backend API */
export interface Task {
  id: number;
  name: string;
  wbs: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  progress: number;
  status: string;
  is_milestone: boolean;
  outline_level: number | null;
  source: string | null;
  was_delayed: boolean;
  original_end_date: string | null;
  project_id: number;
  responsible_id: number | null;
  responsible_name: string | null;
  created_at: string;
  notes: string | null;
  priority: string | null;
  description: string | null;
}

/** Backlog item */
export interface BacklogItem {
  id: number;
  folio: string;
  title: string;
  description: string | null;
  area: string | null;
  priority: string | null;
  status: string;
  progress: number;
  start_date: string | null;
  end_date: string | null;
  was_delayed: boolean;
}
