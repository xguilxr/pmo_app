/**
 * Risk-related type definitions.
 * Aligned with backend schemas: RiskResponse.
 */

/** Matches backend RiskResponse schema */
export interface Risk {
  id: number;
  folio: string;
  title: string;
  description: string | null;
  category: string | null;
  probability: number;
  impact: number;
  severity: number;
  mitigation_strategy: string | null;
  status: string;
  identification_date: string | null;
  deadline: string | null;
  project_id: number;
  responsible_id: number | null;
  created_at: string;
}

/** Cross-project risk view used in RisksPage (with project info) */
export interface RiskWithProject {
  id: number;
  folio: string;
  title: string;
  category: string;
  probability: number;
  impact: number;
  severity: number;
  status: string;
  project_name: string;
  project_id: number;
  identification_date: string;
}
