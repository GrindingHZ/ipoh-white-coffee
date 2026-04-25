import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService, RegisterDto, LoginDto } from './auth.service';
import { UserService } from '../user/user.service';

const COOKIE_NAME = 'fisheriq_session';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 31536000,
  secure: process.env.NODE_ENV === 'production',
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UserService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: any) {
    const { profile, rawToken } = await this.auth.register(dto);
    res.cookie(COOKIE_NAME, rawToken, COOKIE_OPTIONS);
    return profile;
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: any) {
    const { profile, rawToken } = await this.auth.login(dto);
    res.cookie(COOKIE_NAME, rawToken, COOKIE_OPTIONS);
    return profile;
  }

  @Get('me')
  async me(@Req() req: any) {
    const rawToken = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (!rawToken) throw new UnauthorizedException();

    const userId = await this.auth.validateSession(rawToken);
    if (!userId) throw new UnauthorizedException();

    const user = await this.users.getProfile(userId);
    return { id: user.id, name: user.name, locality: user.locality };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const rawToken = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (rawToken) await this.auth.logout(rawToken);
    res.clearCookie(COOKIE_NAME, { path: '/' });
  }
}
