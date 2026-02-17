import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrganizationsService } from '../organizations/organizations.service';
import { CreateTeamRequest, Team, TeamListResponse } from './teams.types';

@Injectable()
export class TeamsService {
  private readonly teams: Team[] = [];

  constructor(private readonly organizationsService: OrganizationsService) {}

  listAll(): Team[] {
    return [...this.teams];
  }

  list(page: number, pageSize: number, organizationId?: string): TeamListResponse {
    const filtered = organizationId
      ? this.teams.filter((team) => team.organizationId === organizationId)
      : this.teams;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: filtered.slice(start, end),
      page,
      pageSize,
      total: filtered.length,
    };
  }

  getById(teamId: string): Team {
    const team = this.teams.find((item) => item.id === teamId);
    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    return team;
  }

  create(input: CreateTeamRequest): Team {
    const name = input.name?.trim();

    if (!name || !input.organizationId) {
      throw new BadRequestException('organizationId and name are required.');
    }

    const organization = this.organizationsService.getById(input.organizationId);
    if (!organization.isActive) {
      throw new BadRequestException('Cannot create team for inactive organization.');
    }

    const duplicate = this.teams.find(
      (team) =>
        team.organizationId === input.organizationId &&
        team.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      throw new BadRequestException('Team name already exists for organization.');
    }

    const now = new Date().toISOString();
    const team: Team = {
      id: randomUUID(),
      organizationId: input.organizationId,
      name,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.teams.push(team);
    return team;
  }
}
