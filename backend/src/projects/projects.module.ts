import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TeamsModule } from '../teams/teams.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [OrganizationsModule, TeamsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
