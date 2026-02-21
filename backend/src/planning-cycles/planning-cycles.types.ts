export interface PlanningCycle {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanningCycleRequest {
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpdatePlanningCycleRequest {
  projectId?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface PlanningCycleListResponse {
  items: PlanningCycle[];
  page: number;
  pageSize: number;
  total: number;
}
