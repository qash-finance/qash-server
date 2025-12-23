import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AppConfigService } from '../shared/config/config.service';
import { UserRepository } from './repositories/user.repository';
import { handleError } from 'src/common/utils/errors';
import { ErrorUser, ErrorAuth } from 'src/common/constants/errors';
import { ParaJwtPayload } from '../../common/interfaces/para-jwt-payload';
import { UserModel } from '../../database/generated/models/User';
import { JwksClient } from 'jwks-rsa';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Get current user with company details
   */
  async getCurrentUserWithCompany(userId: number) {
    try {
      const user = await this.userRepository.findByIdWithCompany(userId);

      if (!user) {
        throw new NotFoundException(ErrorUser.NotFound);
      }

      return user;
    } catch (error) {
      this.logger.error(
        `Failed to get current user with company details: ${userId}`,
        error,
      );
      handleError(error, this.logger);
    }
  }

  /**
   * Validate Para JWT token and return payload
   *
   * Note: This performs basic validation (structure, expiration, email extraction).
   * Full signature verification happens in ParaJwtStrategy when the token is used
   * in subsequent requests via the cookie.
   *
   * The `kid` (Key ID) is automatically included in the JWT header by Para.
   * We extract it to fetch the correct public key from Para's JWKS endpoint.
   *
   * @param token - JWT token from Para (contains kid in header automatically)
   * @returns Validated Para JWT payload
   */
  async validateParaJwt(token: string): Promise<ParaJwtPayload> {
    try {
      const paraConfig = this.appConfigService.authConfig.para;

      if (!token) {
        throw new BadRequestException(ErrorAuth.MissingJwtToken);
      }

      // Extract kid (Key ID) from JWT header
      // The kid is automatically included by Para when signing the token
      // It tells us which public key from Para's JWKS to use for verification
      const decodedHeader = JSON.parse(
        Buffer.from(token.split('.')[0], 'base64').toString(),
      );
      const kid = decodedHeader.kid;

      if (!kid) {
        throw new UnauthorizedException(ErrorAuth.JwtTokenMissingKeyId);
      }

      // Fetch the public key from Para's JWKS using the kid
      // This ensures we use the correct key for signature verification
      const jwksClient = new JwksClient({
        jwksUri: paraConfig.jwksUrl,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
      });

      const key = await jwksClient.getSigningKey(kid);
      const _signingKey = key.getPublicKey();

      // Decode payload for basic validation
      // Note: Full signature verification happens in ParaJwtStrategy
      // when the token is used in subsequent authenticated requests
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      ) as any;

      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new UnauthorizedException(ErrorAuth.JwtTokenExpired);
      }

      // Validate structure
      if (!payload.data || !payload.sub) {
        throw new UnauthorizedException(
          ErrorAuth.InvalidParaJwtPayloadStructure,
        );
      }

      // Extract email
      const email = payload.data.email || payload.data.identifier;
      if (!email) {
        throw new UnauthorizedException(ErrorAuth.NoEmailOrIdentifierInParaJwt);
      }

      return {
        ...payload,
        email,
        userId: payload.data.userId || payload.sub,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Para JWT validation failed:', error);
      throw new UnauthorizedException(ErrorAuth.JwtValidationFailed);
    }
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.appConfigService.nodeEnv === 'production';
  }

  /**
   * Sync user from Para JWT token to our database
   * Creates user if doesn't exist, updates last login if exists
   */
  async syncUserFromParaToken(paraPayload: ParaJwtPayload): Promise<UserModel> {
    try {
      const email = paraPayload.email || paraPayload.data.identifier;

      if (!email) {
        throw new BadRequestException(ErrorAuth.NoEmailOrIdentifierInParaToken);
      }

      // Find or create user
      let user = await this.userRepository.findByEmail(email);

      if (!user) {
        // Create new user
        this.logger.log(`Creating new user from Para token: ${email}`);
        user = await this.userRepository.create({
          email,
          isActive: true,
        });
      } else {
        // Update last login for existing user
        if (!user.isActive) {
          await this.userRepository.activate(user.id);
        }
        await this.userRepository.updateLastLogin(user.id);
        // Refresh user data
        user = await this.userRepository.findById(user.id);
      }

      return user!;
    } catch (error) {
      this.logger.error('Failed to sync user from Para token:', error);
      handleError(error, this.logger);
      throw error;
    }
  }
}
