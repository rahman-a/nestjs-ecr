import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service.js';
import { AppConfigService } from '../../core/config/config.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: AppConfigService,
  ) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    if (!body.username || !body.password) throw new BadRequestException();
    const user = await this.authService.login(body);
    if (!user) throw new UnauthorizedException();
    if (!user.activatedAt) throw new UnauthorizedException();
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        tenant: user.tenant.id,
        type: user.type,
      },
      this.configService.get('BRANCH_JWT_SECRET'),
      {
        expiresIn: parseInt(this.configService.get('TOKEN_EXPIRY_PERIOD')),
        algorithm: 'HS512',
      },
    );

    return {
      sucess: true,
      token,
      data: user,
    };
  }
}
