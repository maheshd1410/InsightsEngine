import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ProjectsService } from '../projects/projects.service';
import {
  CreatePlanningCycleRequest,
  PlanningCycle,
  PlanningCycleListResponse,
  UpdatePlanningCycleRequest,
} from './planning-cycles.types';

@Injectable()
export class PlanningCyclesService {
  private readonly planningCycles: PlanningCycle[] = [];

  constructor(private readonly projectsService: ProjectsService) {}

  listAll(): PlanningCycle[] {
    return [...this.planningCycles];
  }

  list(
    page: number,
    pageSize: number,
    projectId?: string,
    dateFrom?: string,
    dateTo?: string,
    isActive?: boolean,
  ): PlanningCycleListResponse {
    let filtered = [...this.planningCycles];

    if (projectId) {
      filtered = filtered.filter((item) => item.projectId === projectId);
    }

    if (dateFrom) {
      filtered = filtered.filter((item) => item.startDate >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter((item) => item.endDate <= dateTo);
    }
    if (isActive !== undefined) {
      filtered = filtered.filter((item) => item.isActive === isActive);
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

  getById(planningCycleId: string): PlanningCycle {
    const planningCycle = this.planningCycles.find((item) => item.id === planningCycleId);
    if (!planningCycle) {
      throw new NotFoundException('Planning cycle not found.');
    }

    return planningCycle;
  }

  create(input: CreatePlanningCycleRequest): PlanningCycle {
    const name = input.name?.trim();
    if (!input.projectId || !name || !input.startDate || !input.endDate) {
      throw new BadRequestException(
        'projectId, name, startDate, and endDate are required.',
      );
    }

    if (input.endDate < input.startDate) {
      throw new BadRequestException('endDate must be greater than or equal to startDate.');
    }

    const project = this.projectsService.getById(input.projectId);
    if (!project.isActive) {
      throw new BadRequestException('Cannot create planning cycle for inactive project.');
    }

    const duplicate = this.planningCycles.find(
      (item) =>
        item.projectId === input.projectId &&
        item.isActive &&
        item.name.toLowerCase() === name.toLowerCase() &&
        item.startDate === input.startDate &&
        item.endDate === input.endDate,
    );
    if (duplicate) {
      throw new BadRequestException('Planning cycle already exists for this team and date range.');
    }

    const now = new Date().toISOString();
    const planningCycle: PlanningCycle = {
      id: randomUUID(),
      projectId: input.projectId,
      name,
      startDate: input.startDate,
      endDate: input.endDate,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.planningCycles.push(planningCycle);
    return planningCycle;
  }

  update(planningCycleId: string, input: UpdatePlanningCycleRequest): PlanningCycle {
    const planningCycle = this.getById(planningCycleId);

    const projectId =
      input.projectId !== undefined ? input.projectId.trim() : planningCycle.projectId;
    const name = input.name !== undefined ? input.name.trim() : planningCycle.name;
    const startDate = input.startDate ?? planningCycle.startDate;
    const endDate = input.endDate ?? planningCycle.endDate;

    if (!projectId || !name || !startDate || !endDate) {
      throw new BadRequestException('projectId, name, startDate, and endDate cannot be empty.');
    }
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be greater than or equal to startDate.');
    }

    const project = this.projectsService.getById(projectId);
    if (!project.isActive) {
      throw new BadRequestException('Cannot assign sprint to inactive project.');
    }

    const duplicate = this.planningCycles.find(
      (item) =>
        item.id !== planningCycleId &&
        item.projectId === projectId &&
        item.isActive &&
        item.name.toLowerCase() === name.toLowerCase() &&
        item.startDate === startDate &&
        item.endDate === endDate,
    );
    if (duplicate) {
      throw new BadRequestException('Planning cycle already exists for this project and date range.');
    }

    planningCycle.projectId = projectId;
    planningCycle.name = name;
    planningCycle.startDate = startDate;
    planningCycle.endDate = endDate;
    if (input.isActive !== undefined) {
      planningCycle.isActive = input.isActive;
    }
    planningCycle.updatedAt = new Date().toISOString();
    return planningCycle;
  }

  softDelete(planningCycleId: string): void {
    const planningCycle = this.getById(planningCycleId);
    planningCycle.isActive = false;
    planningCycle.updatedAt = new Date().toISOString();
  }
}
