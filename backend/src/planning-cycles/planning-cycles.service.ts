import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TeamsService } from '../teams/teams.service';
import {
  CreatePlanningCycleRequest,
  PlanningCycle,
  PlanningCycleListResponse,
} from './planning-cycles.types';

@Injectable()
export class PlanningCyclesService {
  private readonly planningCycles: PlanningCycle[] = [];

  constructor(private readonly teamsService: TeamsService) {}

  list(
    page: number,
    pageSize: number,
    teamId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): PlanningCycleListResponse {
    let filtered = [...this.planningCycles];

    if (teamId) {
      filtered = filtered.filter((item) => item.teamId === teamId);
    }

    if (dateFrom) {
      filtered = filtered.filter((item) => item.startDate >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter((item) => item.endDate <= dateTo);
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
    if (!input.teamId || !name || !input.startDate || !input.endDate) {
      throw new BadRequestException('teamId, name, startDate, and endDate are required.');
    }

    if (input.endDate < input.startDate) {
      throw new BadRequestException('endDate must be greater than or equal to startDate.');
    }

    const team = this.teamsService.getById(input.teamId);
    if (!team.isActive) {
      throw new BadRequestException('Cannot create planning cycle for inactive team.');
    }

    const duplicate = this.planningCycles.find(
      (item) =>
        item.teamId === input.teamId &&
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
      teamId: input.teamId,
      name,
      startDate: input.startDate,
      endDate: input.endDate,
      createdAt: now,
      updatedAt: now,
    };

    this.planningCycles.push(planningCycle);
    return planningCycle;
  }
}
