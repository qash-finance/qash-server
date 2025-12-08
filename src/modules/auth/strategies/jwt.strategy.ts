import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../shared/config/config.service';
import { JwtAuthService } from '../services/jwt.service';
import { JwtPayload } from '../../../common/interfaces/jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly jwtAuthService: JwtAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfigService.jwtConfig.secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    try {
      // Additional validation can be performed here
      // For example, checking if user is still active
      await this.jwtAuthService.validateToken(
        // We don't have the raw token here, but validateToken will be called separately
        // This validate method is called after JWT verification
        '',
      );

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
