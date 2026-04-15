/**
 * Document type definitions.
 * Aligned with backend schemas: DocumentResponse.
 */

/** Matches backend DocumentResponse schema */
export interface Document {
  id: number;
  folio: string;
  name: string;
  description: string | null;
  category: string | null;
  file_path: string | null;
  file_type: string | null;
  file_size: number | null;
  version: number;
  project_id: number;
  uploaded_by_id: number | null;
  created_at: string;
}

/** Cross-project document view used in DocumentsPage (with project info) */
export interface DocWithProject {
  id: number;
  folio: string;
  name: string;
  category: string;
  file_type: string;
  file_size: number;
  project_name: string;
  project_id: number;
  uploaded_by: string;
  created_at: string;
}

/** Response from file upload endpoint */
export interface UploadResponse {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
}
