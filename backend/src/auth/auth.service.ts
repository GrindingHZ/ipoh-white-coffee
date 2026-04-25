import * as crypto from 'crypto';
import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeIc } from './ic-validator';

export class RegisterDto {
  icNumber: string;
  name: string;
  locality: string;
}

export class LoginDto {
  icNumber: string;
}

export interface UserProfile {
  id: string;
  name: string;
  locality: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private async createSessionForUser(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await this.prisma.authSession.create({
      data: { userId, tokenHash, expiresAt },
    });

    return rawToken;
  }

  async register(dto: RegisterDto): Promise<{ profile: UserProfile; rawToken: string }> {
    let normalizedIc: string;
    try {
      normalizedIc = normalizeIc(dto.icNumber);
    } catch {
      throw new BadRequestException('Invalid IC number format');
    }

    const existing = await this.prisma.user.findUnique({ where: { icNumber: normalizedIc } });
    if (existing) {
      throw new ConflictException('IC number already registered');
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        locality: dto.locality,
        language: 'en',
        targetSpecies: [],
        icNumber: normalizedIc,
      },
    });

    const rawToken = await this.createSessionForUser(user.id);

    return {
      profile: { id: user.id, name: user.name, locality: user.locality },
      rawToken,
    };
  }

  async login(dto: LoginDto): Promise<{ profile: UserProfile; rawToken: string }> {
    let normalizedIc: string;
    try {
      normalizedIc = normalizeIc(dto.icNumber);
    } catch {
      throw new BadRequestException('Invalid IC number format');
    }

    const user = await this.prisma.user.findUnique({ where: { icNumber: normalizedIc } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const rawToken = await this.createSessionForUser(user.id);

    return {
      profile: { id: user.id, name: user.name, locality: user.locality },
      rawToken,
    };
  }

  async logout(rawToken: string): Promise<void> {
    if (!rawToken) return;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.authSession.deleteMany({ where: { tokenHash } });
  }

  async validateSession(rawToken: string): Promise<string | null> {
    if (!rawToken) return null;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const session = await this.prisma.authSession.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return null;
    }

    void this.prisma.authSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    return session.userId;
  }
}
