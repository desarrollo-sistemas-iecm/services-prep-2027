import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  EventEmitter2,
  EventEmitterModule,
  OnEvent,
} from '@nestjs/event-emitter';
import {
  CORTE_ACTIVATED_EVENT,
  CorteActivatedPayload,
} from '../../cortes/events/corte-activated.event';

@Injectable()
class FakeExportacionIneListener {
  public recibido: CorteActivatedPayload | null = null;

  @OnEvent(CORTE_ACTIVATED_EVENT)
  manejarCorteActivado(payload: CorteActivatedPayload): void {
    this.recibido = payload;
  }
}

describe('corte.activated wiring', () => {
  it('should deliver the shared payload shape from a real EventEmitter2 to a listener bound to CORTE_ACTIVATED_EVENT', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [FakeExportacionIneListener],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const eventEmitter = app.get(EventEmitter2);
    const listener = app.get(FakeExportacionIneListener);

    eventEmitter.emit(CORTE_ACTIVATED_EVENT, {
      cutId: 'x',
    } satisfies CorteActivatedPayload);

    expect(listener.recibido).toEqual({ cutId: 'x' });

    await app.close();
  });
});
