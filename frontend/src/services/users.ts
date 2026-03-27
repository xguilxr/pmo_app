import { api } from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  last_login?: string;
  roles: string[];
  created_at: string;
}

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
