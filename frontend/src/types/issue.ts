/**
 * Issue/Action/Decision type definitions.
 * Aligned with backend schemas: IssueResponse.
 */

/** Matches backend IssueResponse schema */
export interface Issue {
  id: number;
  folio: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  resolution: string | null;
  report_date: string | null;
  commitment_date: string | null;
  project_id: number;
  responsible_id: number | null;
  created_at: string;
}

/** Cross-project issue view used in IssuesPage (with project info) */
export interface IssueWithProject {
  id: number;
  folio: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  project_name: string;
  project_id: number;
  report_date: string;
  commitment_date: string;
}
