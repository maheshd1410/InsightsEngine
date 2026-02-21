import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import {
  CreatePlanningCycleRequest,
  PlanningCycle,
  PlanningCycleListResponse,
} from './planning-cycles.types';
import { PlanningCyclesService } from './planning-cycles.service';

@Controller('planning-cycles')
export class PlanningCyclesController {
  constructor(private readonly planningCyclesService: PlanningCyclesService) {}

  @Roles('admin', 'engineering_manager')
  @Get()
  listPlanningCycles(
    @Query('projectId') projectId?: string,
    @Query('teamId') teamId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') pageRaw = '1',
    @Query('pageSize') pageSizeRaw = '25',
  ): PlanningCycleListResponse {
    const page = this.parsePositiveInt(pageRaw, 'page');
    const pageSize = this.parsePositiveInt(pageSizeRaw, 'pageSize');

    if (projectId && !this.isUuid(projectId)) {
      throw new BadRequestException('projectId must be a valid UUID.');
    }
    if (teamId && !this.isUuid(teamId)) {
      throw new BadRequestException('teamId must be a valid UUID.');
    }
    if (dateFrom && !this.isDateString(dateFrom)) {
      throw new BadRequestException('dateFrom must be in YYYY-MM-DD format.');
    }
    if (dateTo && !this.isDateString(dateTo)) {
      throw new BadRequestException('dateTo must be in YYYY-MM-DD format.');
    }

    return this.planningCyclesService.list(page, pageSize, projectId, teamId, dateFrom, dateTo);
  }

  @Roles('admin', 'engineering_manager')
  @Post()
  createPlanningCycle(@Body() input: CreatePlanningCycleRequest): PlanningCycle {
    if (!this.isUuid(input.projectId) || !this.isUuid(input.teamId)) {
      throw new BadRequestException('projectId and teamId must be valid UUID values.');
    }
    if (!this.isDateString(input.startDate) || !this.isDateString(input.endDate)) {
      throw new BadRequestException('startDate and endDate must be in YYYY-MM-DD format.');
    }

    return this.planningCyclesService.create(input);
  }

  private parsePositiveInt(rawValue: string, fieldName: string): number {
    const value = Number.parseInt(rawValue, 10);
    if (Number.isNaN(value) || value <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer.`);
    }
    return value;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private isDateString(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }
}
