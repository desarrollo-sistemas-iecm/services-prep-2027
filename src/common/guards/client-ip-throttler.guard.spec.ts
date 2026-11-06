import { Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { configureTrustProxy } from '../../bootstrap.config';
import { ClientIpThrottlerGuard } from './client-ip-throttler.guard';

@Controller('ping')
class PingController {
  @Get()
  ping(): { ok: boolean } {
    return { ok: true };
  }
}

async function createApp(trustProxy: string): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        load: [() => ({ TRUST_PROXY: trustProxy })],
      }),
      ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 1 }]),
    ],
    controllers: [PingController],
    providers: [{ provide: APP_GUARD, useClass: ClientIpThrottlerGuard }],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureTrustProxy(app);
  await app.init();
  return app;
}

describe('ClientIpThrottlerGuard', () => {
  let app: NestExpressApplication;

  afterEach(async () => {
    await app.close();
  });

  it('should keep separate limits per client when requests arrive through a trusted proxy', async () => {
    app = await createApp('loopback, linklocal, uniquelocal');
    const server = app.getHttpServer();

    await request(server)
      .get('/ping')
      .set('X-Forwarded-For', '203.0.113.5')
      .expect(200);
    await request(server)
      .get('/ping')
      .set('X-Forwarded-For', '203.0.113.6')
      .expect(200);
    await request(server)
      .get('/ping')
      .set('X-Forwarded-For', '203.0.113.5')
      .expect(429);
  });

  it('should count the same client once when the forwarded address includes different ports', async () => {
    app = await createApp('loopback, linklocal, uniquelocal');
    const server = app.getHttpServer();

    await request(server)
      .get('/ping')
      .set('X-Forwarded-For', '203.0.113.5:51000')
      .expect(200);
    await request(server)
      .get('/ping')
      .set('X-Forwarded-For', '203.0.113.5:51001')
      .expect(429);
  });

  it('should ignore X-Forwarded-For when trust proxy is disabled', async () => {
    app = await createApp('false');
    const server = app.getHttpServer();

    await request(server)
      .get('/ping')
      .set('X-Forwarded-For', '203.0.113.5')
      .expect(200);
    await request(server)
      .get('/ping')
      .set('X-Forwarded-For', '203.0.113.6')
      .expect(429);
  });
});
