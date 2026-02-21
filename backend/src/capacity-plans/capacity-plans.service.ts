import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PlanningCyclesService } from '../planning-cycles/planning-cycles.service';
import { ProjectsService } from '../projects/projects.service';
import { TeamsService } from '../teams/teams.service';
import {
  CapacityPlan,
  CapacityPlanListResponse,
  CreateCapacityPlanRequest,
} from './capacity-plans.types';

@Injectable()
export class CapacityPlansService {
  private readonly capacityPlans: CapacityPlan[] = [];

  constructor(
    private readonly planningCyclesService: PlanningCyclesService,
    private readonly projectsService: ProjectsService,
    private readonly teamsService: TeamsService,
  ) {}

  listAll(): CapacityPlan[] {
    return [...this.capacityPlans];
  }

  list(
    page: number,
    pageSize: number,
    teamId?: string,
    planningCycleId?: string,
  ): CapacityPlanListResponse {
    let filtered = [...this.capacityPlans];

    if (teamId) {
      filtered = filtered.filter((item) => item.teamId === teamId);
    }
    if (planningCycleId) {
      filtered = filtered.filter((item) => item.planningCycleId === planningCycleId);
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: filtered.slice(start, end),
      page,
      pageSize,
      total: filtered.length,
    };
  }

  create(input: CreateCapacityPlanRequest): CapacityPlan {
    if (!input.teamId || !input.planningCycleId) {
      throw new BadRequestException('teamId and planningCycleId are required.');
    }
    if (!Number.isFinite(input.plannedHours) || input.plannedHours < 0) {
      throw new BadRequestException('plannedHours must be a non-negative number.');
    }

    const team = this.teamsService.getById(input.teamId);
    if (!team.isActive) {
      throw new BadRequestException('Cannot create capacity plan for inactive team.');
    }

    const planningCycle = this.planningCyclesService.getById(input.planningCycleId);
    if (!planningCycle.isActive) {
      throw new BadRequestException('Cannot create capacity plan for inactive planning cycle.');
    }

    const project = this.projectsService.getById(planningCycle.projectId);
    if (!project.isActive) {
      throw new BadRequestException('Cannot create capacity plan for inactive project.');
    }
    if (team.organizationId !== project.organizationId) {
      throw new BadRequestException('teamId organization does not match planning cycle project.');
    }

    const duplicate = this.capacityPlans.find(
      (item) =>
        item.teamId === input.teamId && item.planningCycleId === input.planningCycleId,
    );
    if (duplicate) {
      throw new BadRequestException('Capacity plan already exists for this team and cycle.');
    }

    const now = new Date().toISOString();
    const capacityPlan: CapacityPlan = {
      id: randomUUID(),
      planningCycleId: input.planningCycleId,
      teamId: input.teamId,
      plannedHours: Number(input.plannedHours),
      createdAt: now,
      updatedAt: now,
    };

    this.capacityPlans.push(capacityPlan);
    return capacityPlan;
  }
}
