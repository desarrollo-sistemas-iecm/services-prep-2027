import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap.config';

describe('CortesController (e2e)', () => {
  let app: INestApplication<App>;
  let validToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    validToken = jwt.sign(
      { sub: 'difusor-e2e' },
      process.env.JWT_SECRET as string,
      {
        algorithm: 'HS256',
        expiresIn: '1h',
      },
    );
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /api/v1/cortes without a token returns 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/cortes')
      .field('cutId', 'corte-e2e-1')
      .field('version', '1.0')
      .field('activationAt', '2026-09-06T15:00:00.000Z')
      .field('manifest', '{}')
      .expect(401);
  });

  it('POST /api/v1/cortes with a token but without the database file returns 400', () => {
    return request(app.getHttpServer())
      .post('/api/v1/cortes')
      .set('Authorization', `Bearer ${validToken}`)
      .field('cutId', 'corte-e2e-2')
      .field('version', '1.0')
      .field('activationAt', '2026-09-06T15:00:00.000Z')
      .field('manifest', '{}')
      .expect(400);
  });

  it('GET /api/v1/cortes/:cutId/estado for an unknown cutId returns 404', () => {
    return request(app.getHttpServer())
      .get('/api/v1/cortes/no-existe/estado')
      .expect(404);
  });

  it('GET /api/v1/cortes/activo with no active corte returns 200 and data null', () => {
    return request(app.getHttpServer())
      .get('/api/v1/cortes/activo')
      .expect(200)
      .expect((res) => {
        const body = res.body as { ok: boolean; data: unknown };
        expect(body.ok).toBe(true);
        expect(body.data).toBeNull();
      });
  });
});
