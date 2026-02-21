export interface PlanningCycle {
  id: string;
  projectId: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanningCycleRequest {
  projectId: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface PlanningCycleListResponse {
  items: PlanningCycle[];
  page: number;
  pageSize: number;
  total: number;
}
