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
  CreateProjectRequest,
  Project,
  ProjectListResponse,
  UpdateProjectRequest,
} from './projects.types';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Roles('admin', 'engineering_manager')
  @Get()
  listProjects(
    @Query('organizationId') organizationId?: string,
    @Query('teamId') teamId?: string,
    @Query('isActive') isActiveRaw?: string,
    @Query('page') pageRaw = '1',
    @Query('pageSize') pageSizeRaw = '25',
  ): ProjectListResponse {
    const page = this.parsePositiveInt(pageRaw, 'page');
    const pageSize = this.parsePositiveInt(pageSizeRaw, 'pageSize');

    if (organizationId && !this.isUuid(organizationId)) {
      throw new BadRequestException('organizationId must be a valid UUID.');
    }
    if (teamId && !this.isUuid(teamId)) {
      throw new BadRequestException('teamId must be a valid UUID.');
    }

    const isActive = this.parseOptionalBoolean(isActiveRaw, 'isActive');

    return this.projectsService.list(page, pageSize, organizationId, teamId, isActive);
  }

  @Roles('admin', 'engineering_manager')
  @Get(':projectId')
  getProjectById(@Param('projectId', ParseUUIDPipe) projectId: string): Project {
    return this.projectsService.getById(projectId);
  }

  @Roles('admin')
  @Post()
  createProject(@Body() input: CreateProjectRequest): Project {
    if (!this.isUuid(input.organizationId)) {
      throw new BadRequestException('organizationId must be a valid UUID.');
    }
    if (input.teamId && !this.isUuid(input.teamId)) {
      throw new BadRequestException('teamId must be a valid UUID.');
    }

    return this.projectsService.create(input);
  }

  @Roles('admin')
  @Patch(':projectId')
  updateProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() input: UpdateProjectRequest,
  ): Project {
    if (input.organizationId && !this.isUuid(input.organizationId)) {
      throw new BadRequestException('organizationId must be a valid UUID.');
    }
    if (input.teamId && !this.isUuid(input.teamId)) {
      throw new BadRequestException('teamId must be a valid UUID.');
    }

    return this.projectsService.update(projectId, input);
  }

  @Roles('admin')
  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProject(@Param('projectId', ParseUUIDPipe) projectId: string): void {
    this.projectsService.softDelete(projectId);
  }

  private parsePositiveInt(rawValue: string, fieldName: string): number {
    const value = Number.parseInt(rawValue, 10);
    if (Number.isNaN(value) || value <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer.`);
    }
    return value;
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

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
