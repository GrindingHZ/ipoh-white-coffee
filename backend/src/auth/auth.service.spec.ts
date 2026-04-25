import * as crypto from 'crypto';
import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    authSession: {
      create: jest.Mock;
      deleteMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      authSession: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const dto = {
      icNumber: '900101-01-1234',
      name: 'Ali',
      locality: 'Kuala Sepetang, Perak',
    };
    const normalizedIc = '900101011234';

    it('creates user with normalized icNumber and UUID id', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'some-uuid',
        name: dto.name,
        locality: dto.locality,
        language: 'en',
        targetSpecies: [],
        icNumber: normalizedIc,
      });
      prisma.authSession.create.mockResolvedValue({});

      const result = await service.register(dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { icNumber: normalizedIc },
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ icNumber: normalizedIc }),
        }),
      );
      expect(result.profile.id).toBe('some-uuid');
      expect(result.rawToken).toBeDefined();
      expect(typeof result.rawToken).toBe('string');
      expect(result.rawToken).toHaveLength(64);
    });

    it('sets language: en and targetSpecies: []', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'some-uuid',
        name: dto.name,
        locality: dto.locality,
        language: 'en',
        targetSpecies: [],
        icNumber: normalizedIc,
      });
      prisma.authSession.create.mockResolvedValue({});

      await service.register(dto);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          language: 'en',
          targetSpecies: [],
          fuelCapacity: 80,
        }),
      });
    });

    it('throws ConflictException (409) for duplicate IC', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        icNumber: normalizedIc,
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException for malformed IC', async () => {
      await expect(
        service.register({ ...dto, icNumber: 'not-an-ic' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for semantically invalid IC', async () => {
      await expect(
        service.register({ ...dto, icNumber: '901300-01-1234' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = { icNumber: '900101-01-1234' };
    const normalizedIc = '900101011234';
    const user = {
      id: 'user-id',
      name: 'Ali',
      locality: 'Kuala Sepetang, Perak',
    };

    it('returns public profile for known IC', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.authSession.create.mockResolvedValue({});

      const result = await service.login(dto);

      expect(result.profile).toEqual({
        id: user.id,
        name: user.name,
        locality: user.locality,
      });
      expect(result.rawToken).toBeDefined();
    });

    it('throws NotFoundException (404) for unknown IC', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for malformed IC', async () => {
      await expect(service.login({ icNumber: 'bad' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for semantically invalid IC', async () => {
      await expect(
        service.login({ icNumber: '901231-00-1234' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('looks up user by normalized IC', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.authSession.create.mockResolvedValue({});

      await service.login(dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { icNumber: normalizedIc },
      });
    });
  });

  describe('logout', () => {
    it('deletes session by hashed token', async () => {
      prisma.authSession.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('some-raw-token');

      const expectedHash = crypto
        .createHash('sha256')
        .update('some-raw-token')
        .digest('hex');
      expect(prisma.authSession.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: expectedHash },
      });
    });

    it('does not throw if session not found', async () => {
      prisma.authSession.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.logout('nonexistent-token'),
      ).resolves.toBeUndefined();
    });
  });

  describe('validateSession', () => {
    it('returns userId for valid session', async () => {
      const session = {
        id: 'session-id',
        userId: 'user-id',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000),
      };
      prisma.authSession.findFirst.mockResolvedValue(session);
      prisma.authSession.update.mockResolvedValue(session);

      const result = await service.validateSession('valid-raw-token');

      expect(result).toBe('user-id');
    });

    it('returns null for expired session', async () => {
      prisma.authSession.findFirst.mockResolvedValue(null);

      const result = await service.validateSession('expired-raw-token');

      expect(result).toBeNull();
    });

    it('returns null for unknown token', async () => {
      prisma.authSession.findFirst.mockResolvedValue(null);

      const result = await service.validateSession('unknown-raw-token');

      expect(result).toBeNull();
    });

    it('queries by hashed token with expiry check', async () => {
      prisma.authSession.findFirst.mockResolvedValue(null);

      await service.validateSession('some-token');

      const expectedHash = crypto
        .createHash('sha256')
        .update('some-token')
        .digest('hex');
      expect(prisma.authSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tokenHash: expectedHash,
            expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        }),
      );
    });
  });
});
