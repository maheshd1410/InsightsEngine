import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from '../organizations/organizations.service';
import { PlanningCyclesService } from '../planning-cycles/planning-cycles.service';
import { ProjectsService } from '../projects/projects.service';
import { TeamsService } from '../teams/teams.service';
import { CapacityPlansService } from './capacity-plans.service';

describe('CapacityPlansService', () => {
  let capacityPlansService: CapacityPlansService;
  let organizationsService: OrganizationsService;
  let teamsService: TeamsService;
  let planningCyclesService: PlanningCyclesService;
  let projectsService: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        TeamsService,
        ProjectsService,
        PlanningCyclesService,
        CapacityPlansService,
      ],
    }).compile();

    capacityPlansService = module.get<CapacityPlansService>(CapacityPlansService);
    organizationsService = module.get<OrganizationsService>(OrganizationsService);
    teamsService = module.get<TeamsService>(TeamsService);
    planningCyclesService = module.get<PlanningCyclesService>(PlanningCyclesService);
    projectsService = module.get<ProjectsService>(ProjectsService);
  });

  it('creates capacity plan for valid team and planning cycle', () => {
    const org = organizationsService.create({ name: 'Delivery', code: 'dlv' });
    const team = teamsService.create({ organizationId: org.id, name: 'Platform' });
    const project = projectsService.create({
      organizationId: org.id,
      teamId: team.id,
      name: 'Delivery Platform',
      code: 'dlv-platform',
    });
    const cycle = planningCyclesService.create({
      projectId: project.id,
      teamId: team.id,
      name: 'Sprint 14',
      startDate: '2026-05-01',
      endDate: '2026-05-14',
    });

    const plan = capacityPlansService.create({
      teamId: team.id,
      planningCycleId: cycle.id,
      plannedHours: 320,
    });

    expect(plan.teamId).toBe(team.id);
    expect(plan.planningCycleId).toBe(cycle.id);
    expect(plan.plannedHours).toBe(320);
  });

  it('rejects negative plannedHours', () => {
    const org = organizationsService.create({ name: 'Delivery', code: 'dlv' });
    const team = teamsService.create({ organizationId: org.id, name: 'Platform' });
    const project = projectsService.create({
      organizationId: org.id,
      teamId: team.id,
      name: 'Delivery Platform',
      code: 'dlv-platform',
    });
    const cycle = planningCyclesService.create({
      projectId: project.id,
      teamId: team.id,
      name: 'Sprint 14',
      startDate: '2026-05-01',
      endDate: '2026-05-14',
    });

    expect(() =>
      capacityPlansService.create({
        teamId: team.id,
        planningCycleId: cycle.id,
        plannedHours: -1,
      }),
    ).toThrow(BadRequestException);
  });

  it('filters list by team and planningCycle', () => {
    const org = organizationsService.create({ name: 'Delivery', code: 'dlv' });
    const team1 = teamsService.create({ organizationId: org.id, name: 'Platform' });
    const team2 = teamsService.create({ organizationId: org.id, name: 'QA' });
    const project1 = projectsService.create({
      organizationId: org.id,
      teamId: team1.id,
      name: 'Platform Project',
      code: 'platform-prj',
    });
    const project2 = projectsService.create({
      organizationId: org.id,
      teamId: team2.id,
      name: 'QA Project',
      code: 'qa-prj',
    });

    const cycle1 = planningCyclesService.create({
      projectId: project1.id,
      teamId: team1.id,
      name: 'Sprint 14',
      startDate: '2026-05-01',
      endDate: '2026-05-14',
    });
    const cycle2 = planningCyclesService.create({
      projectId: project2.id,
      teamId: team2.id,
      name: 'Sprint 15',
      startDate: '2026-05-15',
      endDate: '2026-05-28',
    });

    capacityPlansService.create({
      teamId: team1.id,
      planningCycleId: cycle1.id,
      plannedHours: 300,
    });
    capacityPlansService.create({
      teamId: team2.id,
      planningCycleId: cycle2.id,
      plannedHours: 220,
    });

    const result = capacityPlansService.list(1, 10, team1.id, cycle1.id);
    expect(result.total).toBe(1);
    expect(result.items[0].teamId).toBe(team1.id);
    expect(result.items[0].planningCycleId).toBe(cycle1.id);
  });
});
