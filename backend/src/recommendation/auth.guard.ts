import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Stub: full auth implementation is a separate concern.
    // For now, read userId from X-User-Id header.
    const userId = request.headers['x-user-id'];
    if (!userId) return false;
    request.userId = userId;
    return true;
  }
}
