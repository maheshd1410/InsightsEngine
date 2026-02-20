import { AppRole } from '../auth/auth.types';

export interface User {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  role: AppRole;
  password: string;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: AppRole;
  password?: string;
  isActive?: boolean;
}

export interface UserListResponse {
  items: User[];
  page: number;
  pageSize: number;
  total: number;
}
