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

  it('/api/v1/organizations (POST) returns 403 for manager role', async () => {
    const managerToken = createToken('engineering_manager');

    const response = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Engineering', code: 'eng' });

    expect(response.status).toBe(403);
  });

  it('/api/v1/organizations (POST/GET) succeeds for authorized roles', async () => {
    const adminToken = createToken('admin');
    const managerToken = createToken('engineering_manager');

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Engineering', code: 'eng' });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.code).toBe('ENG');

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/organizations')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body.length).toBeGreaterThan(0);
  });
});
