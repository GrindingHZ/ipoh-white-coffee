import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { SESSION_COOKIE_NAME } from '../auth/session-cookie';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawToken = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;

    if (!rawToken) {
      throw new UnauthorizedException();
    }

    const userId = await this.auth.validateSession(rawToken);
    if (!userId) {
      throw new UnauthorizedException();
    }

    request.userId = userId;
    return true;
  }
}
