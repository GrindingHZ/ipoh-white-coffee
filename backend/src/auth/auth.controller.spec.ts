import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

describe('AuthController', () => {
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    validateSession: jest.Mock;
    logout: jest.Mock;
  };
  let userService: { getProfile: jest.Mock };
  let controller: AuthController;
  let response: { cookie: jest.Mock; clearCookie: jest.Mock };

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      validateSession: jest.fn(),
      logout: jest.fn(),
    };
    userService = {
      getProfile: jest.fn(),
    };
    response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    controller = new AuthController(
      authService as unknown as AuthService,
      userService as unknown as UserService,
    );
  });

  it('register returns public profile and sets session cookie', async () => {
    const profile = {
      id: '7d0ce59d-fc83-4daa-aa57-968854c83a56',
      name: 'Ali',
      locality: 'Kuala Sepetang, Perak',
    };
    authService.register.mockResolvedValue({ profile, rawToken: 'raw-token' });

    await expect(
      controller.register(
        {
          icNumber: '901231-01-5678',
          name: 'Ali',
          locality: 'Kuala Sepetang, Perak',
        },
        response,
      ),
    ).resolves.toEqual(profile);

    expect(response.cookie).toHaveBeenCalledWith(
      'fisheriq_session',
      'raw-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60 * 1000,
      }),
    );
  });

  it('login returns public profile and sets session cookie', async () => {
    const profile = {
      id: '7d0ce59d-fc83-4daa-aa57-968854c83a56',
      name: 'Ali',
      locality: 'Kuala Sepetang, Perak',
    };
    authService.login.mockResolvedValue({ profile, rawToken: 'raw-token' });

    await expect(
      controller.login({ icNumber: '901231-01-5678' }, response),
    ).resolves.toEqual(profile);

    expect(response.cookie).toHaveBeenCalledWith(
      'fisheriq_session',
      'raw-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60 * 1000,
      }),
    );
  });

  it('me returns public profile for the session cookie', async () => {
    const request = { cookies: { fisheriq_session: 'raw-token' } };
    authService.validateSession.mockResolvedValue(
      '7d0ce59d-fc83-4daa-aa57-968854c83a56',
    );
    userService.getProfile.mockResolvedValue({
      id: '7d0ce59d-fc83-4daa-aa57-968854c83a56',
      name: 'Ali',
      locality: 'Kuala Sepetang, Perak',
      language: 'ms',
      targetSpecies: [],
    });

    await expect(controller.me(request)).resolves.toEqual({
      id: '7d0ce59d-fc83-4daa-aa57-968854c83a56',
      name: 'Ali',
      locality: 'Kuala Sepetang, Perak',
    });
  });

  it('me rejects missing session cookie', async () => {
    await expect(controller.me({ cookies: {} })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('logout deletes the current session and clears the cookie', async () => {
    await controller.logout(
      { cookies: { fisheriq_session: 'raw-token' } },
      response,
    );

    expect(authService.logout).toHaveBeenCalledWith('raw-token');
    expect(response.clearCookie).toHaveBeenCalledWith('fisheriq_session', {
      path: '/',
    });
  });
});
