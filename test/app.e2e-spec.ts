import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap.config';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1 (GET) returns the index envelope pointing to the docs', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect((res) => {
        const body = res.body as { ok: boolean; data: { docs: string } };
        expect(body.ok).toBe(true);
        expect(body.data.docs).toBe('/docs');
      });
  });

  it('/api/v1/health (GET) reports app health', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as { ok: boolean; checks: { app: boolean } };
        expect(body.ok).toBe(true);
        expect(body.checks.app).toBe(true);
      });
  });
});
