import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppRole } from '../src/auth/auth.types';
import { HttpErrorFilter } from '../src/common/filters/http-error.filter';
import { RequestContextMiddleware } from '../src/common/middleware/request-context.middleware';

describe('App (e2e)', () => {
  let app: INestApplication;
  const jwtSecret = 'dev-secret';

  const createToken = (role: AppRole): string =>
    sign(
      {
        sub: `user-${role}`,
        email: `${role}@insights.local`,
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

  it('/api/v1/health (GET) is public', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('/api/v1/auth/login (POST) returns token for valid user', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: 'admin@insights.local',
      password: 'Admin@123',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        expiresInSeconds: expect.any(Number),
        user: expect.objectContaining({
          email: 'admin@insights.local',
          role: 'admin',
        }),
      }),
    );
  });

  it('/api/v1/auth/login (POST) rejects invalid credentials', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: 'admin@insights.local',
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: expect.any(String),
      }),
    );
  });

  it('/api/v1/organizations (GET) returns 401 without token', async () => {
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

  it('/api/v1/organizations CRUD + RBAC', async () => {
    const adminToken = createToken('admin');
    const managerToken = createToken('engineering_manager');

    const forbiddenCreate = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Engineering', code: 'eng' });
    expect(forbiddenCreate.status).toBe(403);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Engineering', code: 'eng' });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.code).toBe('ENG');

    const organizationId = createResponse.body.id as string;

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/organizations?page=1&pageSize=10')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body.items)).toBe(true);
    expect(listResponse.body.total).toBeGreaterThan(0);

    const byIdResponse = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(byIdResponse.status).toBe(200);
    expect(byIdResponse.body.id).toBe(organizationId);

    const patchResponse = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Engineering Core', code: 'core' });
    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.name).toBe('Engineering Core');
    expect(patchResponse.body.code).toBe('CORE');

    const managerPatchForbidden = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Nope' });
    expect(managerPatchForbidden.status).toBe(403);

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(afterDeleteResponse.status).toBe(200);
    expect(afterDeleteResponse.body.isActive).toBe(false);
  });

  it('/api/v1/teams (POST/GET) with organization filter + RBAC', async () => {
    const adminToken = createToken('admin');
    const managerToken = createToken('engineering_manager');

    const org1 = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Delivery', code: 'dlv' });
    expect(org1.status).toBe(201);

    const org2 = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Security', code: 'sec' });
    expect(org2.status).toBe(201);

    const managerCreateForbidden = await request(app.getHttpServer())
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ organizationId: org1.body.id, name: 'Platform' });
    expect(managerCreateForbidden.status).toBe(403);

    const createTeam1 = await request(app.getHttpServer())
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ organizationId: org1.body.id, name: 'Platform' });
    expect(createTeam1.status).toBe(201);

    const createTeam2 = await request(app.getHttpServer())
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ organizationId: org2.body.id, name: 'AppSec' });
    expect(createTeam2.status).toBe(201);

    const managerListForbidden = await request(app.getHttpServer())
      .get('/api/v1/teams')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(managerListForbidden.status).toBe(403);

    const filteredList = await request(app.getHttpServer())
      .get(`/api/v1/teams?organizationId=${org1.body.id}&page=1&pageSize=10`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(filteredList.status).toBe(200);
    expect(filteredList.body.total).toBe(1);
    expect(filteredList.body.items[0].organizationId).toBe(org1.body.id);
    expect(filteredList.body.items[0].name).toBe('Platform');
  });

  it('/api/v1/planning-cycles (POST/GET) with filters + RBAC', async () => {
    const adminToken = createToken('admin');
    const managerToken = createToken('engineering_manager');

    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Planning', code: 'pln' });
    expect(org.status).toBe(201);

    const team = await request(app.getHttpServer())
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ organizationId: org.body.id, name: 'Cycle Team' });
    expect(team.status).toBe(201);

    const project = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        organizationId: org.body.id,
        teamId: team.body.id,
        name: 'Cycle Project',
        code: 'cycle-prj',
      });
    expect(project.status).toBe(201);

    const managerCreate = await request(app.getHttpServer())
      .post('/api/v1/planning-cycles')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        projectId: project.body.id,
        name: 'Sprint 12',
        startDate: '2026-04-01',
        endDate: '2026-04-14',
      });
    expect(managerCreate.status).toBe(201);

    const adminCreate = await request(app.getHttpServer())
      .post('/api/v1/planning-cycles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        projectId: project.body.id,
        name: 'Sprint 13',
        startDate: '2026-04-15',
        endDate: '2026-04-28',
      });
    expect(adminCreate.status).toBe(201);

    const listFiltered = await request(app.getHttpServer())
      .get(
        `/api/v1/planning-cycles?projectId=${project.body.id}&dateFrom=2026-04-01&dateTo=2026-04-30&page=1&pageSize=10`,
      )
      .set('Authorization', `Bearer ${managerToken}`);
    expect(listFiltered.status).toBe(200);
    expect(listFiltered.body.total).toBe(2);
    expect(Array.isArray(listFiltered.body.items)).toBe(true);

    const patchCycle = await request(app.getHttpServer())
      .patch(`/api/v1/planning-cycles/${managerCreate.body.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Sprint 12 Updated',
      });
    expect(patchCycle.status).toBe(200);
    expect(patchCycle.body.name).toBe('Sprint 12 Updated');

    const deleteCycle = await request(app.getHttpServer())
      .delete(`/api/v1/planning-cycles/${adminCreate.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteCycle.status).toBe(204);

    const listInactive = await request(app.getHttpServer())
      .get(`/api/v1/planning-cycles?projectId=${project.body.id}&isActive=false&page=1&pageSize=10`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(listInactive.status).toBe(200);
    expect(listInactive.body.total).toBe(1);
    expect(listInactive.body.items[0].isActive).toBe(false);

    const noAuthList = await request(app.getHttpServer()).get('/api/v1/planning-cycles');
    expect(noAuthList.status).toBe(401);
  });

  it('/api/v1/capacity-plans (POST/GET) with filters + RBAC', async () => {
    const adminToken = createToken('admin');
    const managerToken = createToken('engineering_manager');
    const leadToken = createToken('team_lead');

    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Capacity', code: 'cap' });
    expect(org.status).toBe(201);

    const team = await request(app.getHttpServer())
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ organizationId: org.body.id, name: 'Capacity Team' });
    expect(team.status).toBe(201);

    const project = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        organizationId: org.body.id,
        teamId: team.body.id,
        name: 'Capacity Project',
        code: 'capacity-prj',
      });
    expect(project.status).toBe(201);

    const cycle = await request(app.getHttpServer())
      .post('/api/v1/planning-cycles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        projectId: project.body.id,
        name: 'Sprint 20',
        startDate: '2026-06-01',
        endDate: '2026-06-14',
      });
    expect(cycle.status).toBe(201);

    const leadCreateForbidden = await request(app.getHttpServer())
      .post('/api/v1/capacity-plans')
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        teamId: team.body.id,
        planningCycleId: cycle.body.id,
        plannedHours: 300,
      });
    expect(leadCreateForbidden.status).toBe(403);

    const managerCreate = await request(app.getHttpServer())
      .post('/api/v1/capacity-plans')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        teamId: team.body.id,
        planningCycleId: cycle.body.id,
        plannedHours: 300,
      });
    expect(managerCreate.status).toBe(201);
    expect(managerCreate.body.plannedHours).toBe(300);

    const leadList = await request(app.getHttpServer())
      .get(`/api/v1/capacity-plans?teamId=${team.body.id}&planningCycleId=${cycle.body.id}`)
      .set('Authorization', `Bearer ${leadToken}`);
    expect(leadList.status).toBe(200);
    expect(leadList.body.total).toBe(1);
    expect(leadList.body.items[0].teamId).toBe(team.body.id);

    const badHours = await request(app.getHttpServer())
      .post('/api/v1/capacity-plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        teamId: team.body.id,
        planningCycleId: cycle.body.id,
        plannedHours: -1,
      });
    expect(badHours.status).toBe(400);
  });

  it('/api/v1/dashboards/portfolio (GET) with filters + RBAC', async () => {
    const adminToken = createToken('admin');
    const managerToken = createToken('engineering_manager');
    const executiveToken = createToken('executive');
    const leadToken = createToken('team_lead');

    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Dashboard Org', code: 'dsh' });
    expect(org.status).toBe(201);

    const team = await request(app.getHttpServer())
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ organizationId: org.body.id, name: 'Dashboard Team' });
    expect(team.status).toBe(201);

    const project = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        organizationId: org.body.id,
        teamId: team.body.id,
        name: 'Dashboard Project',
        code: 'dashboard-prj',
      });
    expect(project.status).toBe(201);

    const cycle = await request(app.getHttpServer())
      .post('/api/v1/planning-cycles')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        projectId: project.body.id,
        name: 'Sprint 30',
        startDate: '2026-07-01',
        endDate: '2026-07-14',
      });
    expect(cycle.status).toBe(201);

    const cap = await request(app.getHttpServer())
      .post('/api/v1/capacity-plans')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        teamId: team.body.id,
        planningCycleId: cycle.body.id,
        plannedHours: 420,
      });
    expect(cap.status).toBe(201);

    const forbiddenLead = await request(app.getHttpServer())
      .get(`/api/v1/dashboards/portfolio?organizationId=${org.body.id}`)
      .set('Authorization', `Bearer ${leadToken}`);
    expect(forbiddenLead.status).toBe(403);

    const noAuth = await request(app.getHttpServer()).get('/api/v1/dashboards/portfolio');
    expect(noAuth.status).toBe(401);

    const executiveView = await request(app.getHttpServer())
      .get(
        `/api/v1/dashboards/portfolio?organizationId=${org.body.id}&dateFrom=2026-07-01&dateTo=2026-07-31`,
      )
      .set('Authorization', `Bearer ${executiveToken}`);
    expect(executiveView.status).toBe(200);
    expect(Array.isArray(executiveView.body.summaryTiles)).toBe(true);
    expect(executiveView.body.summaryTiles.length).toBe(4);

    const capTile = executiveView.body.summaryTiles.find(
      (tile: { metricId: string; value: number }) => tile.metricId === 'CAP-HOURS',
    );
    expect(capTile).toBeDefined();
    expect(capTile.value).toBe(420);
  });

  it('/api/v1/action-items (POST/GET) with status filter + RBAC', async () => {
    const adminToken = createToken('admin');
    const managerToken = createToken('engineering_manager');
    const leadToken = createToken('team_lead');
    const executiveToken = createToken('executive');

    const executiveCreateForbidden = await request(app.getHttpServer())
      .post('/api/v1/action-items')
      .set('Authorization', `Bearer ${executiveToken}`)
      .send({
        title: 'Do not allow',
        ownerUserId: '11111111-1111-4111-8111-111111111111',
        dueDate: '2026-09-01',
        status: 'open',
      });
    expect(executiveCreateForbidden.status).toBe(403);

    const createOpen = await request(app.getHttpServer())
      .post('/api/v1/action-items')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Fix API bug',
        ownerUserId: '11111111-1111-4111-8111-111111111111',
        dueDate: '2026-09-01',
        status: 'open',
      });
    expect(createOpen.status).toBe(201);
    expect(createOpen.body.status).toBe('open');

    const createDone = await request(app.getHttpServer())
      .post('/api/v1/action-items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Close old issue',
        ownerUserId: '11111111-1111-4111-8111-111111111111',
        dueDate: '2026-09-02',
        status: 'done',
      });
    expect(createDone.status).toBe(201);
    expect(createDone.body.status).toBe('done');

    const leadList = await request(app.getHttpServer())
      .get('/api/v1/action-items?status=open&page=1&pageSize=10')
      .set('Authorization', `Bearer ${leadToken}`);
    expect(leadList.status).toBe(200);
    expect(leadList.body.total).toBeGreaterThanOrEqual(1);
    expect(leadList.body.items[0].status).toBe('open');

    const noAuth = await request(app.getHttpServer()).get('/api/v1/action-items');
    expect(noAuth.status).toBe(401);
  });

  it('/api/v1/users CRUD + RBAC', async () => {
    const adminToken = createToken('admin');
    const managerToken = createToken('engineering_manager');

    const managerForbidden = await request(app.getHttpServer())
      .get('/api/v1/users?page=1&pageSize=10')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(managerForbidden.status).toBe(403);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'new.user@insights.local',
        name: 'New User',
        role: 'team_lead',
        password: 'Temp@123',
      });
    expect(createResponse.status).toBe(201);
    const userId = createResponse.body.id as string;

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/users?page=1&pageSize=50')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.total).toBeGreaterThan(0);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Updated User',
        role: 'engineering_manager',
      });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe('Updated User');
    expect(updateResponse.body.role).toBe('engineering_manager');

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteResponse.status).toBe(204);

    const getDeleted = await request(app.getHttpServer())
      .get(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getDeleted.status).toBe(200);
    expect(getDeleted.body.isActive).toBe(false);
  });

  it('/api/v1/projects CRUD + filters + RBAC', async () => {
    const adminToken = createToken('admin');
    const managerToken = createToken('engineering_manager');
    const leadToken = createToken('team_lead');

    const org = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Projects Org', code: 'prj' });
    expect(org.status).toBe(201);

    const team = await request(app.getHttpServer())
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ organizationId: org.body.id, name: 'Projects Team' });
    expect(team.status).toBe(201);

    const leadCreateForbidden = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        organizationId: org.body.id,
        teamId: team.body.id,
        name: 'DH Admin',
        code: 'dh-admin',
      });
    expect(leadCreateForbidden.status).toBe(403);

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        organizationId: org.body.id,
        teamId: team.body.id,
        name: 'DH Admin',
        code: 'dh-admin',
        description: 'Admin portal modernization',
      });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.code).toBe('DH-ADMIN');

    const projectId = createResponse.body.id as string;

    const managerList = await request(app.getHttpServer())
      .get(`/api/v1/projects?organizationId=${org.body.id}&teamId=${team.body.id}&isActive=true`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(managerList.status).toBe(200);
    expect(managerList.body.total).toBe(1);
    expect(managerList.body.items[0].id).toBe(projectId);

    const managerGet = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(managerGet.status).toBe(200);
    expect(managerGet.body.name).toBe('DH Admin');

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'DH Admin Platform',
        code: 'dh-admin-core',
      });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.code).toBe('DH-ADMIN-CORE');

    const managerPatchForbidden = await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'No access' });
    expect(managerPatchForbidden.status).toBe(403);

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteResponse.status).toBe(204);

    const listInactive = await request(app.getHttpServer())
      .get(`/api/v1/projects?organizationId=${org.body.id}&isActive=false`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(listInactive.status).toBe(200);
    expect(listInactive.body.total).toBe(1);
    expect(listInactive.body.items[0].isActive).toBe(false);
  });
});
