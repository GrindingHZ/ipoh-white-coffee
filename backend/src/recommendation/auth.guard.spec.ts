import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../auth/auth.service';

describe('AuthGuard', () => {
  let authService: { validateSession: jest.Mock };
  let guard: AuthGuard;

  function createContext(request: Record<string, any>) {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  }

  beforeEach(() => {
    authService = {
      validateSession: jest.fn(),
    };
    guard = new AuthGuard(authService as unknown as AuthService);
  });

  it('attaches UUID userId for a valid session cookie', async () => {
    const request = {
      cookies: { fisheriq_session: 'raw-token' },
      headers: {},
    };
    authService.validateSession.mockResolvedValue(
      '7d0ce59d-fc83-4daa-aa57-968854c83a56',
    );

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(authService.validateSession).toHaveBeenCalledWith('raw-token');
    expect(request.userId).toBe('7d0ce59d-fc83-4daa-aa57-968854c83a56');
  });

  it('rejects missing session cookie', async () => {
    const request = {
      cookies: {},
      headers: {},
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(authService.validateSession).not.toHaveBeenCalled();
  });

  it('rejects unknown or expired session cookie', async () => {
    const request = {
      cookies: { fisheriq_session: 'stale-token' },
      headers: {},
    };
    authService.validateSession.mockResolvedValue(null);

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('ignores X-User-Id when no valid session cookie is present', async () => {
    const request = {
      cookies: {},
      headers: { 'x-user-id': '7d0ce59d-fc83-4daa-aa57-968854c83a56' },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(request.userId).toBeUndefined();
  });
});
