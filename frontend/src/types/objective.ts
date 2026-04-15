/**
 * Objective type definitions.
 * Aligned with backend schemas: ObjectiveResponse.
 */

/** Matches backend ObjectiveResponse schema */
export interface Objective {
  id: number;
  description: string;
  type: string;
  target_value: string | null;
  current_value: string | null;
  progress: number;
  status: string;
  project_id: number;
  created_at: string;
}
