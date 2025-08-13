import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Req, UnauthorizedException } from '@nestjs/common';

import { Users } from '@prisma/client';
import { UserStatus } from '../../../common/enums/user';
import { AuthRepository } from '../auth.repository';
import { AuthService } from '../auth.service';
import { JWT_PREFIX } from '../../../common/constants';
import { JwtPayload } from '../../../common/interfaces';
import { AppConfigService } from '../../../common/config/services/config.service';
import {
  ErrorAuth,
  ErrorToken,
  ErrorUser,
} from '../../../common/constants/errors';
import { Role } from '../../../common/enums/role';
import { UserRepository } from '../../user/user.repository';

@Injectable()
export class JwtHttpStrategy extends PassportStrategy(Strategy, 'jwt-http') {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService,
    private readonly appConfigService: AppConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfigService.authConfig.jwt.secret,
      passReqToCallback: true,
    });
  }

  public async validate(
    @Req() request: any,
    payload: JwtPayload,
  ): Promise<Users> {
    const auth= await this.authRepository.findOne(
      {
        userId: payload.userId,
      },
    );

    const user = await this.userRepository.findOne({
      id: auth.userId,
    });

    if (!user) {
      throw new UnauthorizedException(ErrorUser.NotFound);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(ErrorUser.UserNotActive);
    }

    // check default role
    const defaultRole =
      this.appConfigService.otherConfig.defaultRole == 'user'
        ? Role.USER
        : null;

    // if default role is user, but this user role is null, throw error
    if (defaultRole && !user.role) {
      throw new UnauthorizedException(ErrorUser.NoRole);
    }

    // check if 2fa is enforced
    const is2FAEnforced = this.appConfigService.otherConfig.require2FA;
    const jwt = this.extractJwtToken(request);

    await this.validateJwtToken(jwt, auth);

    if (is2FAEnforced || user.isTwoFactorAuthEnabled) {
      // first check if the endpoint is gen qr code and authenticate-2fa
      if (
        request.url === '/auth/gen-qr-code' ||
        request.url === '/auth/authenticate-2fa'
      ) {
        return user;
      }
        this.validate2FARequirements(user, payload);
    }

    return user;
  }

  private extractJwtToken(request: any): string {
    const jwt = request.headers['authorization'] as string;
    return jwt.toLowerCase().startsWith(JWT_PREFIX)
      ? jwt.substring(JWT_PREFIX.length)
      : jwt;
  }

  private validate2FARequirements(user: Users, payload: JwtPayload): void {
    if (!user.isTwoFactorAuthEnabled) {
      throw new UnauthorizedException(ErrorAuth.TwoFactorAuthDisabled);
    }
    if (!payload.isTwoFaAuthenticated) {
      throw new UnauthorizedException(ErrorAuth.TwoFactorAuthRequired);
    }
  }

  private async validateJwtToken(jwt: string, auth: any): Promise<void> {
    const token = auth?.accessToken;

    if (!this.authService.compareToken(jwt, token)) {
      throw new UnauthorizedException(ErrorToken.Expired);
    }
  }
}
