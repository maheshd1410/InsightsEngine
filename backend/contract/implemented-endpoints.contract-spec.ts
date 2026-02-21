import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppRole } from '../src/auth/auth.types';
import { HttpErrorFilter } from '../src/common/filters/http-error.filter';
import { RequestContextMiddleware } from '../src/common/middleware/request-context.middleware';

describe('Implemented API contracts', () => {
  let app: INestApplication;
  const jwtSecret = 'dev-secret';

  const createToken = (role: AppRole): string =>
    sign(
      {
        sub: `contract-${role}`,
        email: `${role}@contract.local`,
        role,
      },
      jwtSecret,
      { expiresIn: '1h' },
    );

  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(RequestContextMiddleware);
    app.useGlobalFilters(new HttpErrorFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health contract', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'insights-engine-backend',
        timestamp: expect.any(String),
      }),
    );
  });

  it('POST /api/v1/auth/login contract', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: 'manager@insights.local',
      password: 'Manager@123',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        expiresInSeconds: expect.any(Number),
        user: expect.objectContaining({
          id: expect.any(String),
          email: 'manager@insights.local',
          name: expect.any(String),
          role: 'engineering_manager',
        }),
      }),
    );
  });

  it('GET /api/v1/organizations unauthorized contract', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/organizations');

    expect(response.status).toBe(401);
    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: expect.any(String),
        correlationId: expect.any(String),
      }),
    );
  });

  it('Core implemented endpoints return expected response shapes', async () => {
    const adminToken = createToken('admin');
    const managerToken = createToken('engineering_manager');
    const leadToken = createToken('team_lead');
    const executiveToken = createToken('executive');

    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Contract Org', code: 'ctr' });
    expect(org.status).toBe(201);
    expect(org.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: 'Contract Org',
        code: 'CTR',
        isActive: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );

    const teams = await request(app.getHttpServer())
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ organizationId: org.body.id, name: 'Contract Team' });
    expect(teams.status).toBe(201);
    expect(teams.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        organizationId: org.body.id,
        name: 'Contract Team',
        isActive: true,
      }),
    );

    const projectForCycle = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        organizationId: org.body.id,
        teamId: teams.body.id,
        name: 'Contract Program',
        code: 'ctr-program',
      });
    expect(projectForCycle.status).toBe(201);

    const cycle = await request(app.getHttpServer())
      .post('/api/v1/planning-cycles')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        projectId: projectForCycle.body.id,
        name: 'Contract Sprint',
        startDate: '2026-08-01',
        endDate: '2026-08-14',
      });
    expect(cycle.status).toBe(201);
    expect(cycle.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        projectId: projectForCycle.body.id,
        name: 'Contract Sprint',
        startDate: '2026-08-01',
        endDate: '2026-08-14',
        isActive: true,
      }),
    );

    const capacity = await request(app.getHttpServer())
      .post('/api/v1/capacity-plans')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        teamId: teams.body.id,
        planningCycleId: cycle.body.id,
        plannedHours: 240,
      });
    expect(capacity.status).toBe(201);
    expect(capacity.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        teamId: teams.body.id,
        planningCycleId: cycle.body.id,
        plannedHours: 240,
      }),
    );

    const capacityList = await request(app.getHttpServer())
      .get(`/api/v1/capacity-plans?teamId=${teams.body.id}&planningCycleId=${cycle.body.id}`)
      .set('Authorization', `Bearer ${leadToken}`);
    expect(capacityList.status).toBe(200);
    expect(capacityList.body).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        page: expect.any(Number),
        pageSize: expect.any(Number),
        total: expect.any(Number),
      }),
    );

    const portfolio = await request(app.getHttpServer())
      .get(
        `/api/v1/dashboards/portfolio?organizationId=${org.body.id}&dateFrom=2026-08-01&dateTo=2026-08-31`,
      )
      .set('Authorization', `Bearer ${executiveToken}`);
    expect(portfolio.status).toBe(200);
    expect(portfolio.body).toEqual(
      expect.objectContaining({
        summaryTiles: expect.any(Array),
      }),
    );
    expect(portfolio.body.summaryTiles.length).toBe(4);
    expect(portfolio.body.summaryTiles[0]).toEqual(
      expect.objectContaining({
        metricId: expect.any(String),
        label: expect.any(String),
        value: expect.any(Number),
        trendDirection: expect.stringMatching(/^(up|down|flat)$/),
        status: expect.stringMatching(/^(green|amber|red)$/),
      }),
    );

    const actionItem = await request(app.getHttpServer())
      .post('/api/v1/action-items')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Contract action item',
        ownerUserId: '11111111-1111-4111-8111-111111111111',
        dueDate: '2026-10-01',
        status: 'open',
      });
    expect(actionItem.status).toBe(201);
    expect(actionItem.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: 'Contract action item',
        ownerUserId: '11111111-1111-4111-8111-111111111111',
        dueDate: '2026-10-01',
        status: 'open',
      }),
    );

    const actionItemsList = await request(app.getHttpServer())
      .get('/api/v1/action-items?status=open&page=1&pageSize=10')
      .set('Authorization', `Bearer ${leadToken}`);
    expect(actionItemsList.status).toBe(200);
    expect(actionItemsList.body).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        page: expect.any(Number),
        pageSize: expect.any(Number),
        total: expect.any(Number),
      }),
    );

    const usersList = await request(app.getHttpServer())
      .get('/api/v1/users?page=1&pageSize=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(usersList.status).toBe(200);
    expect(usersList.body).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        page: expect.any(Number),
        pageSize: expect.any(Number),
        total: expect.any(Number),
      }),
    );
    expect(usersList.body.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        email: expect.any(String),
        name: expect.any(String),
        role: expect.stringMatching(/^(admin|engineering_manager|team_lead|executive)$/),
        isActive: expect.any(Boolean),
      }),
    );

    const project = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        organizationId: org.body.id,
        teamId: teams.body.id,
        name: 'Contract Project',
        code: 'ctr-prj',
      });
    expect(project.status).toBe(201);
    expect(project.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        organizationId: org.body.id,
        teamId: teams.body.id,
        name: 'Contract Project',
        code: 'CTR-PRJ',
        isActive: true,
      }),
    );

    const projectsList = await request(app.getHttpServer())
      .get(`/api/v1/projects?organizationId=${org.body.id}&teamId=${teams.body.id}&isActive=true`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(projectsList.status).toBe(200);
    expect(projectsList.body).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        page: expect.any(Number),
        pageSize: expect.any(Number),
        total: expect.any(Number),
      }),
    );
    expect(projectsList.body.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        organizationId: expect.any(String),
        name: expect.any(String),
        code: expect.any(String),
        isActive: expect.any(Boolean),
      }),
    );
  });
});
