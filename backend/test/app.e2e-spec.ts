import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AppRole } from '../src/auth/auth.types';

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

  it('/api/v1/organizations (GET) returns 401 without token', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/organizations');
    expect(response.status).toBe(401);
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
});
