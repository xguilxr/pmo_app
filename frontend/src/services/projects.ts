import { api } from './api';
import type { Project, ProjectCreate } from '../types';

// Re-export types for backward compatibility
export type { Project, ProjectCreate };

export const projectsService = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<Project[]>(`/projects${qs}`);
  },
  get: (id: number) => api.get<Project>(`/projects/${id}`),
  create: (data: ProjectCreate) => api.post<Project>('/projects', data),
  update: (id: number, data: Partial<Project>) => api.patch<Project>(`/projects/${id}`, data),
};
