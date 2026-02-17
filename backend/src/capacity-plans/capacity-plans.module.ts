import { Module } from '@nestjs/common';
import { PlanningCyclesModule } from '../planning-cycles/planning-cycles.module';
import { TeamsModule } from '../teams/teams.module';
import { CapacityPlansController } from './capacity-plans.controller';
import { CapacityPlansService } from './capacity-plans.service';

@Module({
  imports: [PlanningCyclesModule, TeamsModule],
  controllers: [CapacityPlansController],
  providers: [CapacityPlansService],
})
export class CapacityPlansModule {}
