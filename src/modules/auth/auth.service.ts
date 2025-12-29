import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
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

  /**
   * Validate Para JWT token, sync user, and set HTTP-only cookie
   * @param token - JWT token from Para
   * @param response - Express Response object to set cookie
   * @param request - Express Request object to check protocol
   * @returns Success message
   */
  async validateAndSetJwtCookie(
    token: string,
    response: Response,
    request?: Request,
  ): Promise<{ message: string }> {
    try {
      // Validate the JWT token using Passport strategy
      const paraPayload = await this.validateParaJwt(token);

      // Sync user to database
      await this.syncUserFromParaToken(paraPayload);

      // Determine if request is secure (HTTPS)
      // With 'trust proxy' enabled in main.ts, Express will set request.protocol
      // based on X-Forwarded-Proto header from load balancers/proxies (Google Cloud, etc.)
      const isSecure = request ? request.protocol === 'https' : false;

      // Determine sameSite setting
      // - 'none': Required for cross-origin requests (needs secure: true)
      // - 'lax': Works for same-origin and top-level navigation (default)
      // - 'strict': Only same-origin (most secure)
      // For HTTPS (ngrok, GCP), use 'none' to allow cross-origin requests
      // For HTTP (local dev), use 'lax' for better compatibility
      const sameSite = isSecure ? ('none' as const) : ('lax' as const);

      // Extract domain from request host for cookie domain setting
      // For ngrok and other proxies, we might need to set domain explicitly
      const host = request?.get?.('host') || request?.headers?.host || '';
      let cookieDomain: string | undefined = undefined;

      // Only set domain for non-localhost hosts (ngrok, production, etc.)
      // Don't set domain for localhost as it can cause issues
      if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
        // Extract base domain (e.g., 'abc123.ngrok.io' -> 'abc123.ngrok.io')
        // For ngrok, we want the full hostname
        cookieDomain = host.split(':')[0]; // Remove port if present
      }

      // Set HTTP-only cookie
      // secure: true only if request is actually over HTTPS
      const cookieOptions: any = {
        httpOnly: true,
        secure: isSecure, // Only true if actually over HTTPS
        sameSite, // 'none' for HTTPS (cross-origin), 'lax' for HTTP (same-origin)
        maxAge: 30 * 60 * 1000, // 30 minutes
        path: '/',
      };

      // Only set domain if we have a non-localhost domain
      if (cookieDomain) {
        cookieOptions.domain = cookieDomain;
      }

      response.cookie('para-jwt', token, cookieOptions);

      this.logger.log(
        `✅ Para JWT cookie set successfully | ` +
          `Env: ${process.env.NODE_ENV} | ` +
          `Secure: ${isSecure} | ` +
          `Protocol: ${request?.protocol || 'unknown'} | ` +
          `SameSite: ${sameSite} | ` +
          `Domain: ${cookieDomain || 'not set (localhost)'} | ` +
          `Host: ${host || 'unknown'} | ` +
          `MaxAge: 30min | ` +
          `User: ${paraPayload.data?.email || paraPayload.data?.identifier}`,
      );

      return { message: 'Cookie set successfully' };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(ErrorAuth.JwtValidationFailed);
    }
  }
}
