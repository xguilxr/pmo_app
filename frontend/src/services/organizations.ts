import { api } from './api';

export interface Organization {
  id: number;
  name: string;
  legal_name?: string;
  industry?: string;
  country?: string;
  contact_email?: string;
  is_active: boolean;
  projects_count?: number;
}

export const organizationsService = {
  list: () => api.get<Organization[]>('/organizations'),
  get: (id: number) => api.get<Organization>(`/organizations/${id}`),
  create: (data: Partial<Organization>) => api.post<Organization>('/organizations', data),
  update: (id: number, data: Partial<Organization>) =>
    api.patch<Organization>(`/organizations/${id}`, data),
  delete: (id: number) => api.delete(`/organizations/${id}`),
};
