import { api } from './api';
import type { Organization } from '../types';

// Re-export type for backward compatibility
export type { Organization };

export const organizationsService = {
  list: () => api.get<Organization[]>('/organizations'),
  get: (id: number) => api.get<Organization>(`/organizations/${id}`),
  create: (data: Partial<Organization>) => api.post<Organization>('/organizations', data),
  update: (id: number, data: Partial<Organization>) =>
    api.patch<Organization>(`/organizations/${id}`, data),
  delete: (id: number) => api.delete(`/organizations/${id}`),
};
