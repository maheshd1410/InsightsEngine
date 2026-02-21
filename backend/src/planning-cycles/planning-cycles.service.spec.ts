import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from '../organizations/organizations.service';
import { ProjectsService } from '../projects/projects.service';
import { TeamsService } from '../teams/teams.service';
import { PlanningCyclesService } from './planning-cycles.service';

describe('PlanningCyclesService', () => {
  let planningCyclesService: PlanningCyclesService;
  let organizationsService: OrganizationsService;
  let teamsService: TeamsService;
  let projectsService: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        TeamsService,
        ProjectsService,
        PlanningCyclesService,
      ],
    }).compile();

    planningCyclesService = module.get<PlanningCyclesService>(PlanningCyclesService);
    organizationsService = module.get<OrganizationsService>(OrganizationsService);
    teamsService = module.get<TeamsService>(TeamsService);
    projectsService = module.get<ProjectsService>(ProjectsService);
  });

  it('creates planning cycle for an existing project', () => {
    const org = organizationsService.create({ name: 'Delivery', code: 'dlv' });
    const team = teamsService.create({ organizationId: org.id, name: 'Platform' });
    const project = projectsService.create({
      organizationId: org.id,
      teamId: team.id,
      name: 'DH Admin',
      code: 'dh-admin',
    });

    const cycle = planningCyclesService.create({
      projectId: project.id,
      name: 'Sprint 10',
      startDate: '2026-03-01',
      endDate: '2026-03-14',
    });

    expect(cycle.projectId).toBe(project.id);
    expect(cycle.name).toBe('Sprint 10');
  });

  it('rejects invalid date range', () => {
    const org = organizationsService.create({ name: 'Delivery', code: 'dlv' });
    const team = teamsService.create({ organizationId: org.id, name: 'Platform' });
    const project = projectsService.create({
      organizationId: org.id,
      teamId: team.id,
      name: 'DH Admin',
      code: 'dh-admin',
    });

    expect(() =>
      planningCyclesService.create({
        projectId: project.id,
        name: 'Sprint 10',
        startDate: '2026-03-14',
        endDate: '2026-03-01',
      }),
    ).toThrow(BadRequestException);
  });

  it('filters planning cycles by projectId and date range', () => {
    const org = organizationsService.create({ name: 'Delivery', code: 'dlv' });
    const team1 = teamsService.create({ organizationId: org.id, name: 'Platform' });
    const team2 = teamsService.create({ organizationId: org.id, name: 'QA' });
    const project1 = projectsService.create({
      organizationId: org.id,
      teamId: team1.id,
      name: 'DH Admin',
      code: 'dh-admin',
    });
    const project2 = projectsService.create({
      organizationId: org.id,
      teamId: team2.id,
      name: 'Ops Admin',
      code: 'ops-admin',
    });

    planningCyclesService.create({
      projectId: project1.id,
      name: 'Sprint 10',
      startDate: '2026-03-01',
      endDate: '2026-03-14',
    });
    planningCyclesService.create({
      projectId: project2.id,
      name: 'Sprint 11',
      startDate: '2026-03-15',
      endDate: '2026-03-28',
    });

    const result = planningCyclesService.list(
      1,
      10,
      project1.id,
      '2026-03-01',
      '2026-03-31',
    );
    expect(result.total).toBe(1);
    expect(result.items[0].projectId).toBe(project1.id);
    expect(result.items[0].name).toBe('Sprint 10');
  });
});
