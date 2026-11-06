import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { normalizeClientIp } from '../../config/trust-proxy.config';

/**
 * Rate limiting por IP real del cliente. `req.ip` ya viene resuelto por
 * Express según `trust proxy` (ver bootstrap.config.ts); aquí solo se
 * normaliza para que el mismo cliente caiga siempre en el mismo contador.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(
    request: Record<string, unknown>,
  ): Promise<string> {
    const ip = typeof request.ip === 'string' ? request.ip : undefined;
    return Promise.resolve(normalizeClientIp(ip));
  }
}
