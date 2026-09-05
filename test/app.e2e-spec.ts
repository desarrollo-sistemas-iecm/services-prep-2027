import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap.config';

describe('AppController (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1 (GET) redirects to the docs', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(302)
      .expect('Location', '/docs');
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
