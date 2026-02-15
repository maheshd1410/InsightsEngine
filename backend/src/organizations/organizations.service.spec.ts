import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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

  it('gets and updates an organization', () => {
    const created = service.create({ name: 'Engineering', code: 'eng' });
    const updated = service.update(created.id, { name: 'Engineering Core', code: 'engr' });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Engineering Core');
    expect(updated.code).toBe('ENGR');
  });

  it('soft deletes organization', () => {
    const created = service.create({ name: 'Engineering', code: 'eng' });
    service.softDelete(created.id);

    const org = service.getById(created.id);
    expect(org.isActive).toBe(false);
  });

  it('returns paginated list response', () => {
    service.create({ name: 'Engineering', code: 'eng' });
    service.create({ name: 'Platform', code: 'plt' });

    const response = service.list(1, 1);
    expect(response.total).toBe(2);
    expect(response.page).toBe(1);
    expect(response.pageSize).toBe(1);
    expect(response.items.length).toBe(1);
  });

  it('throws not found for unknown organization', () => {
    expect(() => service.getById('00000000-0000-0000-0000-000000000000')).toThrow(
      NotFoundException,
    );
  });
});
