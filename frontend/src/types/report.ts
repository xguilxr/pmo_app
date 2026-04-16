/**
 * Report type definitions.
 * Aligned with backend schemas: ReportResponse.
 */

/** Matches backend ReportResponse schema */
export interface Report {
  id: number;
  title: string;
  content_html: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string;
  recipients: string | null;
  sent_date: string | null;
  ai_model_used: string | null;
  project_id: number;
  created_at: string;
}

/** Cross-project report view used in ReportsPage */
export interface ReportView {
  id: number;
  type: string;
  projectId: number;
  projectName: string;
  date: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  recipients: string;
  aiGenerated: boolean;
  htmlContent: string;
}
