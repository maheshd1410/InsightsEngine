import { Module } from '@nestjs/common';
import { CapacityPlansModule } from '../capacity-plans/capacity-plans.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlanningCyclesModule } from '../planning-cycles/planning-cycles.module';
import { TeamsModule } from '../teams/teams.module';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';

@Module({
  imports: [OrganizationsModule, TeamsModule, PlanningCyclesModule, CapacityPlansModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
})
export class DashboardsModule {}
