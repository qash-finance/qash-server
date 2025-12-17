import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../shared/config/config.service';
import { JwtAuthService } from '../services/jwt.service';
import { JwtPayload } from '../../../common/interfaces/jwt-payload';
import { ErrorAuth } from 'src/common/constants/errors';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly jwtStrategyLogger = new Logger(JwtStrategy.name);

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
      // ...
      await this.jwtAuthService.validateToken('');

      return payload;
    } catch (error) {
      this.jwtStrategyLogger.error('JWT validation failed:', error);
      throw new UnauthorizedException(ErrorAuth.InvalidToken);
    }
  }
}
