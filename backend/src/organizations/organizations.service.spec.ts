import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationsService],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('creates an organization', () => {
    const org = service.create({ name: 'Engineering', code: 'eng' });
    expect(org.name).toBe('Engineering');
    expect(org.code).toBe('ENG');
    expect(org.isActive).toBe(true);
  });

  it('rejects duplicate code', () => {
    service.create({ name: 'Engineering', code: 'eng' });

    expect(() => service.create({ name: 'Platform', code: 'ENG' })).toThrow(
      BadRequestException,
    );
  });
});
