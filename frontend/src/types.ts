// Shared type definitions for the PMO frontend application

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

export interface UserOption {
  id: number;
  full_name: string;
}
