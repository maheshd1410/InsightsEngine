import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { DashboardsService } from './dashboards.service';
import { PortfolioDashboardResponse } from './dashboards.types';

@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Roles('admin', 'engineering_manager', 'executive')
  @Get('portfolio')
  getPortfolioDashboard(
    @Query('organizationId') organizationId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): PortfolioDashboardResponse {
    if (organizationId && !this.isUuid(organizationId)) {
      throw new BadRequestException('organizationId must be a valid UUID.');
    }
    if (dateFrom && !this.isDateString(dateFrom)) {
      throw new BadRequestException('dateFrom must be in YYYY-MM-DD format.');
    }
    if (dateTo && !this.isDateString(dateTo)) {
      throw new BadRequestException('dateTo must be in YYYY-MM-DD format.');
    }

    return this.dashboardsService.getPortfolioSummary({
      organizationId,
      dateFrom,
      dateTo,
    });
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
