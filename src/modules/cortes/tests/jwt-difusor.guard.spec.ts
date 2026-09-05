import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtDifusorGuard } from '../guards/jwt-difusor.guard';

describe('JwtDifusorGuard', () => {
  let guard: JwtDifusorGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let request: { headers: Record<string, string>; difusor?: unknown };

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    const configService = {
      getOrThrow: () => 'test-secret',
    } as unknown as ConfigService;
    guard = new JwtDifusorGuard(
      jwtService as unknown as JwtService,
      configService,
    );
    request = { headers: {} };
  });

  function contextFor(req: unknown): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
  }

  it('should allow the request when the token is valid', async () => {
    request.headers.authorization = 'Bearer valid-token';
    jwtService.verifyAsync.mockResolvedValue({ sub: 'difusor-1' });

    const result = await guard.canActivate(contextFor(request));

    expect(result).toBe(true);
    expect(request.difusor).toEqual({ sub: 'difusor-1' });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
      secret: 'test-secret',
      algorithms: ['HS256'],
    });
  });

  it('should reject when the Authorization header is absent', async () => {
    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject when the scheme is not Bearer', async () => {
    request.headers.authorization = 'Basic abc123';

    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject when the token is expired or has an invalid signature', async () => {
    request.headers.authorization = 'Bearer expired-token';
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
