/**
 * Change request type definitions.
 * Aligned with backend schemas: ChangeResponse.
 */

/** Matches backend ChangeResponse schema */
export interface Change {
  id: number;
  folio: string;
  title: string;
  description: string | null;
  change_type: string;
  impact: string | null;
  requested_by: string | null;
  request_date: string | null;
  status: string;
  approved_by_id: number | null;
  approval_date: string | null;
  comments: string | null;
  project_id: number;
  created_at: string;
}

/** Cross-project change view used in ChangesPage (with project info) */
export interface ChangeWithProject {
  id: number;
  folio: string;
  title: string;
  change_type: string;
  impact: string;
  requested_by: string;
  status: string;
  project_name: string;
  project_id: number;
  request_date: string;
}
