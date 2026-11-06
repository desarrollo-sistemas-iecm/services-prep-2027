import { Controller, Get, UseGuards } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  ActiveCutGuard,
  NO_ACTIVE_CUT_BODY,
  NO_ACTIVE_CUT_RETRY_AFTER_SECONDS,
} from '../guards/active-cut.guard';
import { ActiveCutService } from '../services/active-cut.service';

@UseGuards(ActiveCutGuard)
@Controller('resultados-prueba')
class ResultadosPruebaController {
  @Get()
  obtener(): { total: number } {
    return { total: 10 };
  }
}

async function createApp(
  hasActiveCut: boolean,
): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [ResultadosPruebaController],
    providers: [
      ActiveCutGuard,
      {
        provide: ActiveCutService,
        useValue: { hasActiveCut: jest.fn().mockResolvedValue(hasActiveCut) },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  await app.init();
  return app;
}

describe('ActiveCutGuard', () => {
  let app: NestExpressApplication;

  afterEach(async () => {
    await app.close();
  });

  it('should respond 503 with the NO_ACTIVE_CUT body when there is no active corte', async () => {
    app = await createApp(false);

    const response = await request(app.getHttpServer())
      .get('/resultados-prueba')
      .expect(503);

    expect(response.body).toEqual(NO_ACTIVE_CUT_BODY);
  });

  it('should set Retry-After when there is no active corte', async () => {
    app = await createApp(false);

    const response = await request(app.getHttpServer()).get(
      '/resultados-prueba',
    );

    expect(response.headers['retry-after']).toBe(
      String(NO_ACTIVE_CUT_RETRY_AFTER_SECONDS),
    );
  });

  it('should let the request through when there is an active corte', async () => {
    app = await createApp(true);

    const response = await request(app.getHttpServer())
      .get('/resultados-prueba')
      .expect(200);

    expect(response.body).toEqual({ total: 10 });
    expect(response.headers['retry-after']).toBeUndefined();
  });
});
