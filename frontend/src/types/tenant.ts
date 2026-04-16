/**
 * Tenant/Superadmin type definitions.
 */

export interface Tenant {
  id: number;
  name: string;
  slug: string | null;
  domain: string | null;
  industry: string | null;
  country: string | null;
  contact_email: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  is_active: boolean;
  created_at: string;
  user_count: number;
  project_count: number;
}

export interface TenantDetail {
  id: number;
  name: string;
  legal_name: string | null;
  slug: string | null;
  domain: string | null;
  industry: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  is_active: boolean;
  created_at: string;
  user_count: number;
  project_count: number;
  programs: ProgramSummary[];
  projects: ProjectSummary[];
  users: UserSummary[];
  requests: RequestSummary[];
}

export interface ProgramSummary {
  id: number;
  name: string;
  status: string;
  project_count: number;
  start_date: string | null;
  end_date: string | null;
}

export interface ProjectSummary {
  id: number;
  folio: string;
  name: string;
  type: string;
  phase: string;
  health: string;
  progress: number;
  planned_progress: number;
  budget: number;
  program_name: string | null;
}

export interface UserSummary {
  id: number;
  username: string;
  full_name: string;
  email: string;
  roles: string[];
  is_active: boolean;
  last_login: string | null;
}

export interface RequestSummary {
  id: number;
  folio: string;
  title: string;
  status: string;
  requester_name: string;
  request_date: string;
}

export interface ServerHealth {
  status: string;
  platform: string;
  db_connected: boolean;
  db_tenant_count: number;
  db_user_count: number;
  db_project_count: number;
  disk_free_gb: number | null;
  disk_total_gb: number | null;
  uptime_info: string | null;
}

export interface ProvisionForm {
  name: string;
  slug: string;
  industry: string;
  country: string;
  contact_email: string;
  primary_color: string;
  secondary_color: string;
  admin_username: string;
  admin_email: string;
  admin_full_name: string;
}
