/**
 * User-related type definitions.
 * Aligned with backend schemas: UserResponse, TokenResponse.
 */

/** Matches backend UserResponse schema */
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  last_login: string | null;
  roles: string[];
  organizations: string[];
  created_at: string;
}

/** Matches backend OrgBrief used in auth */
export interface OrgBrief {
  id: number;
  name: string;
  slug: string | null;
}

/** Matches backend TokenResponse schema */
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  full_name: string;
  roles: string[];
  organizations: OrgBrief[];
  is_superadmin: boolean;
}

/** Stored client-side after login */
export interface CurrentUser {
  id: number;
  fullName: string;
  roles: string[];
  is_superadmin: boolean;
  organizations: OrgBrief[];
}

/** Lightweight user reference for dropdowns */
export interface UserOption {
  id: number;
  full_name: string;
}
