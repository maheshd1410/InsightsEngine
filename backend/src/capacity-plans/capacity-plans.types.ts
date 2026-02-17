export interface CapacityPlan {
  id: string;
  planningCycleId: string;
  teamId: string;
  plannedHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCapacityPlanRequest {
  planningCycleId: string;
  teamId: string;
  plannedHours: number;
}

export interface CapacityPlanListResponse {
  items: CapacityPlan[];
  page: number;
  pageSize: number;
  total: number;
}
