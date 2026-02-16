import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from '../organizations/organizations.service';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  let teamsService: TeamsService;
  let organizationsService: OrganizationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationsService, TeamsService],
    }).compile();

    teamsService = module.get<TeamsService>(TeamsService);
    organizationsService = module.get<OrganizationsService>(OrganizationsService);
  });

  it('creates team for existing organization', () => {
    const org = organizationsService.create({ name: 'Engineering', code: 'eng' });
    const team = teamsService.create({ organizationId: org.id, name: 'Platform' });

    expect(team.organizationId).toBe(org.id);
    expect(team.name).toBe('Platform');
  });

  it('rejects duplicate team name in same organization', () => {
    const org = organizationsService.create({ name: 'Engineering', code: 'eng' });
    teamsService.create({ organizationId: org.id, name: 'Platform' });

    expect(() =>
      teamsService.create({ organizationId: org.id, name: 'platform' }),
    ).toThrow(BadRequestException);
  });

  it('filters teams by organizationId', () => {
    const org1 = organizationsService.create({ name: 'Engineering', code: 'eng' });
    const org2 = organizationsService.create({ name: 'Security', code: 'sec' });

    teamsService.create({ organizationId: org1.id, name: 'Platform' });
    teamsService.create({ organizationId: org2.id, name: 'AppSec' });

    const result = teamsService.list(1, 10, org1.id);
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe('Platform');
  });
});
