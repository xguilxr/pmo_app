/**
 * Organization-related type definitions.
 */

/** Organization as returned by the API */
export interface Organization {
  id: number;
  name: string;
  legal_name: string | null;
  industry: string | null;
  country: string | null;
  contact_email: string | null;
  is_active: boolean;
  projects_count?: number;
  created_at?: string;
}

/** Lightweight org reference for dropdowns */
export interface OrgOption {
  id: number;
  name: string;
}
