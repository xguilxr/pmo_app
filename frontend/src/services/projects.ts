import { api } from './api';

export interface Project {
  id: number;
  folio: string;
  name: string;
  description?: string;
  type: string;
  priority: string;
  phase: string;
  status: string;
  health: string;
  start_date: string;
  end_date: string;
  budget: number;
  real_budget?: number;
  progress: number;
  planned_progress?: number;
  organization_id?: number;
  program_id?: number;
  created_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  type: string;
  priority: string;
  organization_id?: number;
  start_date: string;
  end_date: string;
  budget?: number;
}

export const projectsService = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<Project[]>(`/projects${qs}`);
  },
  get: (id: number) => api.get<Project>(`/projects/${id}`),
  create: (data: ProjectCreate) => api.post<Project>('/projects', data),
  update: (id: number, data: Partial<Project>) => api.patch<Project>(`/projects/${id}`, data),
};
