/**
 * Area type definitions.
 * Aligned with backend schemas: AreaResponse.
 */

/** Matches backend AreaResponse schema */
export interface Area {
  id: number;
  name: string;
  description: string | null;
  role_in_project: string | null;
  responsible_id: number | null;
  responsible_name: string | null;
  project_id: number;
  created_at: string;
}
