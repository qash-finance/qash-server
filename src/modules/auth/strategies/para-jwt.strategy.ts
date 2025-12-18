import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { Request } from 'express';
import { AppConfigService } from '../../shared/config/config.service';
import { ParaJwtPayload } from '../../../common/interfaces/para-jwt-payload';
import { ErrorAuth } from 'src/common/constants/errors';

@Injectable()
export class ParaJwtStrategy extends PassportStrategy(Strategy, 'para-jwt') {
  private readonly logger = new Logger(ParaJwtStrategy.name);

  constructor(private readonly appConfigService: AppConfigService) {
    const paraConfig = appConfigService.authConfig.para;

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First, try to extract from HTTP-only cookie
        (request: Request) => {
          return request?.cookies?.['para-jwt'] || null;
        },
        // Fallback to Authorization header (for initial token exchange)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: paraConfig.jwksUrl,
      }),
      algorithms: ['RS256'],
    });
  }

  async validate(payload: ParaJwtPayload): Promise<ParaJwtPayload> {
    try {
      // Validate that the token has the required Para structure
      if (!payload.data || !payload.sub) {
        this.logger.error('Invalid Para JWT payload structure');
        throw new UnauthorizedException(ErrorAuth.InvalidToken);
      }

      // Extract email from the payload
      const email = payload.data.email || payload.data.identifier;
      if (!email) {
        this.logger.error('No email or identifier found in Para JWT');
        throw new UnauthorizedException(ErrorAuth.InvalidToken);
      }

      // Return the validated payload with normalized structure
      return {
        ...payload,
        email,
        userId: payload.data.userId || payload.sub,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Para JWT validation failed:', error);
      throw new UnauthorizedException(ErrorAuth.InvalidToken);
    }
  }
}

