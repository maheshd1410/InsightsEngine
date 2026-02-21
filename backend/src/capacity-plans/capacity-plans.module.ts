import { Module } from '@nestjs/common';
import { PlanningCyclesModule } from '../planning-cycles/planning-cycles.module';
import { ProjectsModule } from '../projects/projects.module';
import { TeamsModule } from '../teams/teams.module';
import { CapacityPlansController } from './capacity-plans.controller';
import { CapacityPlansService } from './capacity-plans.service';

@Module({
  imports: [PlanningCyclesModule, ProjectsModule, TeamsModule],
  controllers: [CapacityPlansController],
  providers: [CapacityPlansService],
  exports: [CapacityPlansService],
})
export class CapacityPlansModule {}
