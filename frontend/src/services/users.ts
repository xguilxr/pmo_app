import { api } from './api';
import type { User } from '../types';

// Re-export type for backward compatibility
export type { User };

export const usersService = {
  list: () => api.get<User[]>('/users'),
  create: (data: {
    username: string;
    email: string;
    full_name: string;
    password: string;
    role_ids?: number[];
  }) => api.post<User>('/users', data),
  me: () => api.get<User>('/users/me'),
};
