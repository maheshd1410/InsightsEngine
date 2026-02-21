import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrganizationsService } from '../organizations/organizations.service';
import { TeamsService } from '../teams/teams.service';
import {
  CreateProjectRequest,
  Project,
  ProjectListResponse,
  UpdateProjectRequest,
} from './projects.types';

@Injectable()
export class ProjectsService {
  private readonly projects: Project[] = [];

  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly teamsService: TeamsService,
  ) {}

  list(
    page: number,
    pageSize: number,
    organizationId?: string,
    teamId?: string,
    isActive?: boolean,
  ): ProjectListResponse {
    let filtered = [...this.projects];

    if (organizationId) {
      filtered = filtered.filter((project) => project.organizationId === organizationId);
    }
    if (teamId) {
      filtered = filtered.filter((project) => project.teamId === teamId);
    }
    if (isActive !== undefined) {
      filtered = filtered.filter((project) => project.isActive === isActive);
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: filtered.slice(start, end),
      page,
      pageSize,
      total: filtered.length,
    };
  }

  getById(projectId: string): Project {
    const project = this.projects.find((item) => item.id === projectId);
    if (!project) {
      throw new NotFoundException('Project not found.');
    }
    return project;
  }

  create(input: CreateProjectRequest): Project {
    const organizationId = input.organizationId?.trim();
    const teamId = input.teamId?.trim();
    const name = input.name?.trim();
    const code = input.code?.trim().toUpperCase();
    const description = input.description?.trim();

    if (!organizationId || !name || !code) {
      throw new BadRequestException('organizationId, name, and code are required.');
    }

    const organization = this.organizationsService.getById(organizationId);
    if (!organization.isActive) {
      throw new BadRequestException('Cannot create project for inactive organization.');
    }

    if (teamId) {
      const team = this.teamsService.getById(teamId);
      if (!team.isActive) {
        throw new BadRequestException('Cannot create project for inactive team.');
      }
      if (team.organizationId !== organizationId) {
        throw new BadRequestException('teamId does not belong to provided organizationId.');
      }
    }

    this.assertUnique(organizationId, code, name);

    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      organizationId,
      teamId,
      name,
      code,
      description: description || undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.projects.push(project);
    return project;
  }

  update(projectId: string, input: UpdateProjectRequest): Project {
    const project = this.getById(projectId);

    const organizationId =
      input.organizationId !== undefined ? input.organizationId.trim() : project.organizationId;
    const teamId = input.teamId !== undefined ? input.teamId.trim() : project.teamId;
    const name = input.name !== undefined ? input.name.trim() : project.name;
    const code = input.code !== undefined ? input.code.trim().toUpperCase() : project.code;
    const description = input.description !== undefined ? input.description.trim() : project.description;

    if (!organizationId || !name || !code) {
      throw new BadRequestException('organizationId, name, and code cannot be empty.');
    }

    const organization = this.organizationsService.getById(organizationId);
    if (!organization.isActive) {
      throw new BadRequestException('Cannot assign project to inactive organization.');
    }

    if (teamId) {
      const team = this.teamsService.getById(teamId);
      if (!team.isActive) {
        throw new BadRequestException('Cannot assign project to inactive team.');
      }
      if (team.organizationId !== organizationId) {
        throw new BadRequestException('teamId does not belong to provided organizationId.');
      }
    }

    this.assertUnique(organizationId, code, name, projectId);

    project.organizationId = organizationId;
    project.teamId = teamId || undefined;
    project.name = name;
    project.code = code;
    project.description = description || undefined;
    if (input.isActive !== undefined) {
      project.isActive = input.isActive;
    }
    project.updatedAt = new Date().toISOString();

    return project;
  }

  softDelete(projectId: string): void {
    const project = this.getById(projectId);
    project.isActive = false;
    project.updatedAt = new Date().toISOString();
  }

  private assertUnique(
    organizationId: string,
    code: string,
    name: string,
    excludeProjectId?: string,
  ): void {
    const duplicateCode = this.projects.find(
      (project) =>
        project.id !== excludeProjectId &&
        project.organizationId === organizationId &&
        project.code === code,
    );
    if (duplicateCode) {
      throw new BadRequestException('Project code already exists for organization.');
    }

    const duplicateName = this.projects.find(
      (project) =>
        project.id !== excludeProjectId &&
        project.organizationId === organizationId &&
        project.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicateName) {
      throw new BadRequestException('Project name already exists for organization.');
    }
  }
}
