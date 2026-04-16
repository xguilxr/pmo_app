/**
 * Program-related type definitions.
 * Aligned with backend schemas: ProgramResponse, ProgramDetailResponse.
 */

/** Matches backend ProgramResponse schema */
export interface Program {
  id: number;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  organization_id: number;
  responsible_id: number | null;
  created_at: string;
  project_count: number;
}

/** Matches backend ProgramDetailResponse schema */
export interface ProgramDetail extends Program {
  organization_name: string;
}
