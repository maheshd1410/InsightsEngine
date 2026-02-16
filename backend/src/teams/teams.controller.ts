import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CreateTeamRequest, Team, TeamListResponse } from './teams.types';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Roles('admin')
  @Get()
  listTeams(
    @Query('organizationId') organizationId?: string,
    @Query('page') pageRaw = '1',
    @Query('pageSize') pageSizeRaw = '25',
  ): TeamListResponse {
    const page = this.parsePositiveInt(pageRaw, 'page');
    const pageSize = this.parsePositiveInt(pageSizeRaw, 'pageSize');

    if (organizationId && !this.isUuid(organizationId)) {
      throw new BadRequestException('organizationId must be a valid UUID.');
    }

    return this.teamsService.list(page, pageSize, organizationId);
  }

  @Roles('admin')
  @Post()
  createTeam(@Body() input: CreateTeamRequest): Team {
    if (!this.isUuid(input.organizationId)) {
      throw new BadRequestException('organizationId must be a valid UUID.');
    }

    return this.teamsService.create(input);
  }

  private parsePositiveInt(rawValue: string, fieldName: string): number {
    const value = Number.parseInt(rawValue, 10);
    if (Number.isNaN(value) || value <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer.`);
    }

    return value;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
