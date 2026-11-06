import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Response } from 'express';
import { ActiveCutService } from '../services/active-cut.service';

export const NO_ACTIVE_CUT_RETRY_AFTER_SECONDS = 60;

export const NO_ACTIVE_CUT_BODY = {
  ok: false,
  msg: 'Aún no hay resultados publicados. Se mostrarán al recibir el primer corte.',
  error: { code: 'NO_ACTIVE_CUT', details: [] as string[] },
} as const;

/**
 * Responde 503 con `Retry-After` en las rutas de resultados mientras no se
 * haya activado ningún corte. Sin esto, la base de resultados vacía produce
 * 500 con errores nativos de SQLite (`no such table: prep_votos`).
 */
@Injectable()
export class ActiveCutGuard implements CanActivate {
  constructor(private readonly activeCutService: ActiveCutService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (await this.activeCutService.hasActiveCut()) return true;

    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader(
      'Retry-After',
      String(NO_ACTIVE_CUT_RETRY_AFTER_SECONDS),
    );
    throw new ServiceUnavailableException(NO_ACTIVE_CUT_BODY);
  }
}
