import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { PlanningCyclesController } from './planning-cycles.controller';
import { PlanningCyclesService } from './planning-cycles.service';

@Module({
  imports: [TeamsModule],
  controllers: [PlanningCyclesController],
  providers: [PlanningCyclesService],
  exports: [PlanningCyclesService],
})
export class PlanningCyclesModule {}
