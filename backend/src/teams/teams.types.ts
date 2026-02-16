export interface Team {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamRequest {
  organizationId: string;
  name: string;
}

export interface TeamListResponse {
  items: Team[];
  page: number;
  pageSize: number;
  total: number;
}
