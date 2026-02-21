import { Injectable } from '@nestjs/common';
import { CapacityPlansService } from '../capacity-plans/capacity-plans.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PlanningCyclesService } from '../planning-cycles/planning-cycles.service';
import { ProjectsService } from '../projects/projects.service';
import { TeamsService } from '../teams/teams.service';
import { PortfolioDashboardResponse, PortfolioSummaryTile } from './dashboards.types';

@Injectable()
export class DashboardsService {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly teamsService: TeamsService,
    private readonly projectsService: ProjectsService,
    private readonly planningCyclesService: PlanningCyclesService,
    private readonly capacityPlansService: CapacityPlansService,
  ) {}

  getPortfolioSummary(params: {
    organizationId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): PortfolioDashboardResponse {
    const organizations = this.organizationsService.listAll();
    const teams = this.teamsService.listAll();
    const projects = this.projectsService.listAll();
    const planningCycles = this.planningCyclesService.listAll();
    const capacityPlans = this.capacityPlansService.listAll();

    const filteredOrganizations = params.organizationId
      ? organizations.filter((org) => org.id === params.organizationId)
      : organizations;
    const organizationIds = new Set(filteredOrganizations.map((org) => org.id));

    const filteredTeams = teams.filter((team) => organizationIds.has(team.organizationId));
    const teamIds = new Set(filteredTeams.map((team) => team.id));

    const projectIds = new Set(
      projects
        .filter((project) => organizationIds.has(project.organizationId) && project.isActive)
        .map((project) => project.id),
    );

    const filteredPlanningCycles = planningCycles.filter((cycle) => {
      if (!projectIds.has(cycle.projectId)) {
        return false;
      }
      if (!cycle.isActive) {
        return false;
      }
      if (params.dateFrom && cycle.startDate < params.dateFrom) {
        return false;
      }
      if (params.dateTo && cycle.endDate > params.dateTo) {
        return false;
      }
      return true;
    });
    const planningCycleIds = new Set(filteredPlanningCycles.map((cycle) => cycle.id));

    const filteredCapacityPlans = capacityPlans.filter(
      (plan) => teamIds.has(plan.teamId) && planningCycleIds.has(plan.planningCycleId),
    );

    const totalPlannedHours = filteredCapacityPlans.reduce(
      (sum, plan) => sum + plan.plannedHours,
      0,
    );

    const summaryTiles: PortfolioSummaryTile[] = [
      {
        metricId: 'ORG-COUNT',
        label: 'Active Organizations',
        value: filteredOrganizations.filter((org) => org.isActive).length,
        trendDirection: 'flat',
        status: 'green',
      },
      {
        metricId: 'TEAM-COUNT',
        label: 'Active Teams',
        value: filteredTeams.filter((team) => team.isActive).length,
        trendDirection: 'flat',
        status: 'green',
      },
      {
        metricId: 'PLAN-CYCLES',
        label: 'Planning Cycles',
        value: filteredPlanningCycles.length,
        trendDirection: 'flat',
        status: 'green',
      },
      {
        metricId: 'CAP-HOURS',
        label: 'Planned Capacity Hours',
        value: totalPlannedHours,
        trendDirection: 'flat',
        status: totalPlannedHours > 0 ? 'green' : 'amber',
      },
    ];

    return {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      summaryTiles,
    };
  }
}
