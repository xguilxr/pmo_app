import { api } from './api';

// Generic CRUD for project modules
function createModuleService<T, C>(basePath: string) {
  return {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return api.get<T[]>(`/${basePath}${qs}`);
    },
    get: (id: number) => api.get<T>(`/${basePath}/${id}`),
    create: (projectId: number, data: C) =>
      api.post<T>(`/${basePath}?project_id=${projectId}`, data),
    update: (id: number, data: Partial<T>) => api.patch<T>(`/${basePath}/${id}`, data),
    delete: (id: number) => api.delete(`/${basePath}/${id}`),
  };
}

export interface Risk {
  id: number;
  folio: string;
  title: string;
  description?: string;
  category?: string;
  probability: number;
  impact: number;
  severity: number;
  mitigation_strategy?: string;
  status: string;
  identification_date?: string;
  deadline?: string;
  project_id: number;
  responsible_id?: number;
  created_at: string;
}

export interface Issue {
  id: number;
  folio: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  resolution?: string;
  report_date?: string;
  commitment_date?: string;
  project_id: number;
  responsible_id?: number;
  created_at: string;
}

export interface Change {
  id: number;
  folio: string;
  title: string;
  description?: string;
  change_type: string;
  impact?: string;
  requested_by?: string;
  request_date?: string;
  status: string;
  comments?: string;
  project_id: number;
  created_at: string;
}

export interface Document {
  id: number;
  folio: string;
  name: string;
  description?: string;
  category: string;
  file_path?: string;
  file_type?: string;
  file_size?: number;
  version?: string;
  project_id: number;
  created_at: string;
}

export interface Lesson {
  id: number;
  folio: string;
  title: string;
  description?: string;
  category: string;
  project_phase?: string;
  recommendation?: string;
  project_id: number;
  created_at: string;
}

export interface Minute {
  id: number;
  folio: string;
  title: string;
  meeting_date: string;
  participants?: string;
  topics?: string;
  agreements?: string;
  source: string;
  ai_model_used?: string;
  project_id: number;
  created_at: string;
}

export const risksService = createModuleService<Risk, Partial<Risk>>('risks');
export const issuesService = createModuleService<Issue, Partial<Issue>>('issues');
export const changesService = createModuleService<Change, Partial<Change>>('changes');
export const documentsService = createModuleService<Document, Partial<Document>>('documents');
export const lessonsService = createModuleService<Lesson, Partial<Lesson>>('lessons');
export const minutesService = {
  ...createModuleService<Minute, Partial<Minute>>('minutes'),
  generate: (data: {
    transcript: string;
    project_id: number;
    title: string;
    meeting_date: string;
    language?: string;
  }) =>
    api.post<{ minute: Minute; generated_text: string; model_used: string }>(
      '/minutes/generate',
      data,
    ),
};
