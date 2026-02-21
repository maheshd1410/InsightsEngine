import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import {
  CreatePlanningCycleRequest,
  PlanningCycle,
  PlanningCycleListResponse,
  UpdatePlanningCycleRequest,
} from './planning-cycles.types';
import { PlanningCyclesService } from './planning-cycles.service';

@Controller('planning-cycles')
export class PlanningCyclesController {
  constructor(private readonly planningCyclesService: PlanningCyclesService) {}

  @Roles('admin', 'engineering_manager')
  @Get()
  listPlanningCycles(
    @Query('projectId') projectId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('isActive') isActiveRaw?: string,
    @Query('page') pageRaw = '1',
    @Query('pageSize') pageSizeRaw = '25',
  ): PlanningCycleListResponse {
    const page = this.parsePositiveInt(pageRaw, 'page');
    const pageSize = this.parsePositiveInt(pageSizeRaw, 'pageSize');

    if (projectId && !this.isUuid(projectId)) {
      throw new BadRequestException('projectId must be a valid UUID.');
    }
    if (dateFrom && !this.isDateString(dateFrom)) {
      throw new BadRequestException('dateFrom must be in YYYY-MM-DD format.');
    }
    if (dateTo && !this.isDateString(dateTo)) {
      throw new BadRequestException('dateTo must be in YYYY-MM-DD format.');
    }

    const isActive = this.parseOptionalBoolean(isActiveRaw, 'isActive');

    return this.planningCyclesService.list(page, pageSize, projectId, dateFrom, dateTo, isActive);
  }

  @Roles('admin', 'engineering_manager')
  @Post()
  createPlanningCycle(@Body() input: CreatePlanningCycleRequest): PlanningCycle {
    if (!this.isUuid(input.projectId)) {
      throw new BadRequestException('projectId must be a valid UUID.');
    }
    if (!this.isDateString(input.startDate) || !this.isDateString(input.endDate)) {
      throw new BadRequestException('startDate and endDate must be in YYYY-MM-DD format.');
    }

    return this.planningCyclesService.create(input);
  }

  @Roles('admin', 'engineering_manager')
  @Patch(':planningCycleId')
  updatePlanningCycle(
    @Param('planningCycleId', ParseUUIDPipe) planningCycleId: string,
    @Body() input: UpdatePlanningCycleRequest,
  ): PlanningCycle {
    if (input.projectId && !this.isUuid(input.projectId)) {
      throw new BadRequestException('projectId must be a valid UUID.');
    }
    if (input.startDate && !this.isDateString(input.startDate)) {
      throw new BadRequestException('startDate must be in YYYY-MM-DD format.');
    }
    if (input.endDate && !this.isDateString(input.endDate)) {
      throw new BadRequestException('endDate must be in YYYY-MM-DD format.');
    }

    return this.planningCyclesService.update(planningCycleId, input);
  }

  @Roles('admin', 'engineering_manager')
  @Delete(':planningCycleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePlanningCycle(
    @Param('planningCycleId', ParseUUIDPipe) planningCycleId: string,
  ): void {
    this.planningCyclesService.softDelete(planningCycleId);
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

  private parseOptionalBoolean(rawValue: string | undefined, fieldName: string): boolean | undefined {
    if (rawValue === undefined) {
      return undefined;
    }
    if (rawValue === 'true') {
      return true;
    }
    if (rawValue === 'false') {
      return false;
    }
    throw new BadRequestException(`${fieldName} must be true or false.`);
  }
}
