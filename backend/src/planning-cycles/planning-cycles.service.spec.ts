import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from '../organizations/organizations.service';
import { TeamsService } from '../teams/teams.service';
import { PlanningCyclesService } from './planning-cycles.service';

describe('PlanningCyclesService', () => {
  let planningCyclesService: PlanningCyclesService;
  let organizationsService: OrganizationsService;
  let teamsService: TeamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationsService, TeamsService, PlanningCyclesService],
    }).compile();

    planningCyclesService = module.get<PlanningCyclesService>(PlanningCyclesService);
    organizationsService = module.get<OrganizationsService>(OrganizationsService);
    teamsService = module.get<TeamsService>(TeamsService);
  });

  it('creates planning cycle for an existing team', () => {
    const org = organizationsService.create({ name: 'Delivery', code: 'dlv' });
    const team = teamsService.create({ organizationId: org.id, name: 'Platform' });

    const cycle = planningCyclesService.create({
      teamId: team.id,
      name: 'Sprint 10',
      startDate: '2026-03-01',
      endDate: '2026-03-14',
    });

    expect(cycle.teamId).toBe(team.id);
    expect(cycle.name).toBe('Sprint 10');
  });

  it('rejects invalid date range', () => {
    const org = organizationsService.create({ name: 'Delivery', code: 'dlv' });
    const team = teamsService.create({ organizationId: org.id, name: 'Platform' });

    expect(() =>
      planningCyclesService.create({
        teamId: team.id,
        name: 'Sprint 10',
        startDate: '2026-03-14',
        endDate: '2026-03-01',
      }),
    ).toThrow(BadRequestException);
  });

  it('filters planning cycles by teamId and date range', () => {
    const org = organizationsService.create({ name: 'Delivery', code: 'dlv' });
    const team1 = teamsService.create({ organizationId: org.id, name: 'Platform' });
    const team2 = teamsService.create({ organizationId: org.id, name: 'QA' });

    planningCyclesService.create({
      teamId: team1.id,
      name: 'Sprint 10',
      startDate: '2026-03-01',
      endDate: '2026-03-14',
    });
    planningCyclesService.create({
      teamId: team2.id,
      name: 'Sprint 11',
      startDate: '2026-03-15',
      endDate: '2026-03-28',
    });

    const result = planningCyclesService.list(1, 10, team1.id, '2026-03-01', '2026-03-31');
    expect(result.total).toBe(1);
    expect(result.items[0].teamId).toBe(team1.id);
  });
});
