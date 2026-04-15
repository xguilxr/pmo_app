/**
 * Lesson learned type definitions.
 * Aligned with backend schemas: LessonResponse.
 */

/** Matches backend LessonResponse schema */
export interface Lesson {
  id: number;
  folio: string;
  title: string;
  description: string | null;
  category: string | null;
  project_phase: string | null;
  recommendation: string | null;
  project_id: number;
  recorded_by_id: number | null;
  created_at: string;
}

/** Cross-project lesson view used in LessonsPage (with project info) */
export interface LessonWithProject {
  id: number;
  folio: string;
  title: string;
  description: string;
  category: string;
  project_phase: string;
  recommendation: string;
  project_name: string;
  project_id: number;
  recorded_by: string;
  created_at: string;
}
