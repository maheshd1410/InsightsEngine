import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ActionItemsService } from './action-items.service';

describe('ActionItemsService', () => {
  let service: ActionItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActionItemsService],
    }).compile();

    service = module.get<ActionItemsService>(ActionItemsService);
  });

  it('creates action item', () => {
    const item = service.create({
      title: 'Fix vulnerability',
      description: 'Upgrade dependency',
      ownerUserId: '11111111-1111-4111-8111-111111111111',
      dueDate: '2026-09-01',
      status: 'open',
    });

    expect(item.id).toBeDefined();
    expect(item.title).toBe('Fix vulnerability');
    expect(item.status).toBe('open');
  });

  it('filters by status', () => {
    service.create({
      title: 'Item A',
      ownerUserId: '11111111-1111-4111-8111-111111111111',
      dueDate: '2026-09-01',
      status: 'open',
    });
    service.create({
      title: 'Item B',
      ownerUserId: '11111111-1111-4111-8111-111111111111',
      dueDate: '2026-09-02',
      status: 'done',
    });

    const open = service.list(1, 10, 'open');
    expect(open.total).toBe(1);
    expect(open.items[0].status).toBe('open');
  });

  it('rejects invalid owner UUID', () => {
    expect(() =>
      service.create({
        title: 'Bad owner',
        ownerUserId: 'abc',
        dueDate: '2026-09-01',
        status: 'open',
      }),
    ).toThrow(BadRequestException);
  });
});
