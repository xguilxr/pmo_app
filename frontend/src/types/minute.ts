/**
 * Meeting minute type definitions.
 * Aligned with backend schemas: MinuteResponse.
 */

/** RAID items extracted by AI from minutes */
export interface MinuteRaid {
  risks: string[];
  actions: string[];
  issues: string[];
  decisions: string[];
}

/** Matches backend MinuteResponse schema (with optional AI-extracted raid) */
export interface Minute {
  id: number;
  folio: string;
  title: string;
  meeting_date: string | null;
  topics: string | null;
  agreements: string | null;
  participants: string | null;
  source: string;
  ai_model_used: string | null;
  ai_generation_time_ms: number | null;
  project_id: number;
  created_at: string;
  raid?: MinuteRaid;
}

/** Cross-project minute view used in MinutesPage (with project info) */
export interface MinuteWithProject {
  id: number;
  folio: string;
  title: string;
  meeting_date: string;
  project: string;
  source: string;
}
