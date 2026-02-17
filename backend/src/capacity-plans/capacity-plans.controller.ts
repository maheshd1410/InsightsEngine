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
  CapacityPlan,
  CapacityPlanListResponse,
  CreateCapacityPlanRequest,
} from './capacity-plans.types';
import { CapacityPlansService } from './capacity-plans.service';

@Controller('capacity-plans')
export class CapacityPlansController {
  constructor(private readonly capacityPlansService: CapacityPlansService) {}

  @Roles('admin', 'engineering_manager', 'team_lead')
  @Get()
  listCapacityPlans(
    @Query('teamId') teamId?: string,
    @Query('planningCycleId') planningCycleId?: string,
    @Query('page') pageRaw = '1',
    @Query('pageSize') pageSizeRaw = '25',
  ): CapacityPlanListResponse {
    const page = this.parsePositiveInt(pageRaw, 'page');
    const pageSize = this.parsePositiveInt(pageSizeRaw, 'pageSize');

    if (teamId && !this.isUuid(teamId)) {
      throw new BadRequestException('teamId must be a valid UUID.');
    }
    if (planningCycleId && !this.isUuid(planningCycleId)) {
      throw new BadRequestException('planningCycleId must be a valid UUID.');
    }

    return this.capacityPlansService.list(page, pageSize, teamId, planningCycleId);
  }

  @Roles('admin', 'engineering_manager')
  @Post()
  createCapacityPlan(@Body() input: CreateCapacityPlanRequest): CapacityPlan {
    if (!this.isUuid(input.teamId) || !this.isUuid(input.planningCycleId)) {
      throw new BadRequestException('teamId and planningCycleId must be valid UUID values.');
    }

    return this.capacityPlansService.create(input);
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
}
