import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface DifusorJwtPayload {
  sub: string;
  [key: string]: unknown;
}

/**
 * Verifica firma y expiración del JWT del difusor contra JWT_SECRET.
 * TODO: cuando exista el módulo `auth`, validar además el rol/permiso
 * específico de publicación de cortes (p. ej. Permission.CORTES_PUBLICAR).
 */
@Injectable()
export class JwtDifusorGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token ausente');
    }

    try {
      const payload = await this.jwtService.verifyAsync<DifusorJwtPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>('JWT_SECRET'),
          algorithms: ['HS256'],
        },
      );
      request['difusor'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token;
  }
}
