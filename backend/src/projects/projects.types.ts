export interface Project {
  id: string;
  organizationId: string;
  teamId?: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  organizationId: string;
  teamId?: string;
  name: string;
  code: string;
  description?: string;
}

export interface UpdateProjectRequest {
  organizationId?: string;
  teamId?: string;
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface ProjectListResponse {
  items: Project[];
  page: number;
  pageSize: number;
  total: number;
}
