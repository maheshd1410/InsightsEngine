import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { PlanningCyclesController } from './planning-cycles.controller';
import { PlanningCyclesService } from './planning-cycles.service';

@Module({
  imports: [ProjectsModule],
  controllers: [PlanningCyclesController],
  providers: [PlanningCyclesService],
  exports: [PlanningCyclesService],
})
export class PlanningCyclesModule {}
