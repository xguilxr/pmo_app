/**
 * Shared constants and utilities for project tab components.
 *
 * Consolidates repeated patterns across ProjectRisksTab, ProjectIssuesTab,
 * ProjectChangesTab, ProjectLessonsTab, ProjectDocumentsTab, and
 * ProjectMinutesTab.
 */

/** Standard input class for modal form fields. */
export const inputCls =
  'w-full border border-border bg-surface rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all';

/** Standard label class for modal form fields. */
export const labelCls =
  'block text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5';

/**
 * Download a CSV export file from the backend.
 *
 * Handles token injection, blob download, and error callback -- the same
 * logic was previously copy-pasted across four tab components.
 *
 * @param endpoint  - Export API path relative to the base URL, e.g. "risks"
 * @param projectId - Project ID to filter by
 * @param filename  - Filename for the downloaded file
 * @param onError   - Callback invoked on failure (e.g. toastError)
 */
import { API_BASE_URL } from '../../services/api';

export function exportCsv(
  endpoint: string,
  projectId: number,
  filename: string,
  onError: (msg: string) => void,
): void {
  const token = localStorage.getItem('pmo_token');
  const tenantId = localStorage.getItem('pmo_tenant_id');
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  fetch(`${API_BASE_URL}/exports/${endpoint}?project_id=${projectId}`, { headers })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    })
    .catch(() => onError('Error al exportar'));
}
