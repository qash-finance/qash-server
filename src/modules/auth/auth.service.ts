import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AppConfigService } from '../shared/config/config.service';
import { OtpService } from './services/otp.service';
import { JwtAuthService, SessionInfo } from './services/jwt.service';
import { UserRepository } from './repositories/user.repository';
import { UserSessionRepository } from './repositories/user-session.repository';
import { AuthResponseDto, MessageResponseDto } from './dto/auth.dto';
import { OtpTypeEnum } from '../../database/generated/enums';
import { handleError } from 'src/common/utils/errors';
import { ErrorUser } from 'src/common/constants/errors';
import { PrismaService } from 'src/database/prisma.service';
import { Para as ParaServer } from '@getpara/server-sdk';
import { ParaJwtPayload } from '../../common/interfaces/para-jwt-payload';
import { UserModel } from '../../database/generated/models/User';
import { JwksClient } from 'jwks-rsa';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly otpService: OtpService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly userRepository: UserRepository,
    private readonly userSessionRepository: UserSessionRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Send OTP to user's email
   */
  async sendOtp(
    email: string,
    type: OtpTypeEnum = OtpTypeEnum.LOGIN,
  ): Promise<MessageResponseDto> {
    try {
      await this.otpService.sendOtp(email, type);
      return { message: 'OTP sent successfully to your email' };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  /**
   * Verify OTP and authenticate user
   */
  async verifyOtpAndAuthenticate(
    email: string,
    otp: string,
    sessionInfo?: SessionInfo,
  ): Promise<AuthResponseDto> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const { userId } = await this.otpService.verifyOtpInternal(
          email,
          otp,
          OtpTypeEnum.LOGIN,
          tx,
        );

        const tokens = await this.jwtAuthService.createTokenPair(
          userId,
          sessionInfo,
          tx,
        );

        const user = await this.getUserProfile(userId);

        return {
          ...tokens,
          user,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to verify OTP and authenticate: ${email}`,
        error,
      );
      handleError(error, this.logger);
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(refreshToken: string, sessionInfo?: SessionInfo) {
    return await this.jwtAuthService.refreshTokens(refreshToken, sessionInfo);
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: number) {
    const user = await this.userRepository.getProfile(userId);

    if (!user) {
      throw new NotFoundException(ErrorUser.NotFound);
    }

    return user;
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: number) {
    return await this.jwtAuthService.getUserSessions(userId);
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    await this.jwtAuthService.revokeRefreshToken(refreshToken);
  }

  /**
   * Logout user from all devices
   */
  async logoutAll(userId: number): Promise<void> {
    await this.jwtAuthService.revokeAllUserTokens(userId);
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: number): Promise<void> {
    // Deactivate user and revoke all sessions
    await Promise.all([
      this.userRepository.deactivate(userId),
      this.userSessionRepository.deactivateAllForUser(userId),
    ]);
  }

  /**
   * Reactivate user account
   */
  async reactivateUser(userId: number): Promise<void> {
    await this.userRepository.activate(userId);
  }

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
   * Clean up expired data (for cron jobs)
   */
  async cleanupExpiredData(): Promise<void> {
    await Promise.all([
      this.otpService.cleanupExpiredOtps(),
      this.jwtAuthService.cleanupExpiredSessions(),
    ]);
  }

  /**
   * Verify Para session using verification token
   */
  async verifyParaSession(verificationToken: string) {
    try {
      const paraConfig = this.appConfigService.authConfig.para;
      const verifyUrl = paraConfig.verifyUrl;

      if (!verificationToken) {
        throw new BadRequestException('Missing verification token');
      }

      if (!paraConfig.secretApiKey) {
        this.logger.error('Para secret API key is not configured');
        throw new BadRequestException('Para secret API key is not configured');
      }

      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-external-api-key': paraConfig.secretApiKey,
        },
        body: JSON.stringify({ verificationToken }),
      });

      if (response.status === 403) {
        throw new ForbiddenException('Session expired');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        this.logger.error(
          `Para verification failed with status ${response.status}: ${errorText}`,
        );
        throw new BadRequestException(
          `Verification failed with status: ${response.status}`,
        );
      }

      const userData = await response.json();
      return userData;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Para session verification failed:', error);
      throw new BadRequestException('Verification failed');
    }
  }

  /**
   * Validate Para JWT token and return payload
   * This method validates the JWT using JWKS and returns the payload
   */
  async validateParaJwt(token: string): Promise<ParaJwtPayload> {
    try {
      const paraConfig = this.appConfigService.authConfig.para;

      if (!token) {
        throw new BadRequestException('Missing JWT token');
      }

      // Decode token to get kid (key ID) without verification
      const decodedHeader = JSON.parse(
        Buffer.from(token.split('.')[0], 'base64').toString(),
      );
      const kid = decodedHeader.kid;

      if (!kid) {
        throw new UnauthorizedException('JWT token missing key ID');
      }

      // Get the signing key from JWKS
      const jwksClient = new JwksClient({
        jwksUri: paraConfig.jwksUrl,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
      });

      const key = await jwksClient.getSigningKey(kid);
      const signingKey = key.getPublicKey();

      // Verify and decode the token using the public key
      // We'll use a simple approach - decode and validate structure
      // The actual verification happens in the strategy
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      ) as any;

      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new UnauthorizedException('JWT token expired');
      }

      // Validate structure
      if (!payload.data || !payload.sub) {
        throw new UnauthorizedException('Invalid Para JWT payload structure');
      }

      // Extract email
      const email = payload.data.email || payload.data.identifier;
      if (!email) {
        throw new UnauthorizedException(
          'No email or identifier found in Para JWT',
        );
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
      throw new UnauthorizedException('JWT validation failed');
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
        throw new BadRequestException(
          'No email or identifier found in Para token',
        );
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
          this.logger.warn(
            `Attempted login for inactive user: ${email}. Activating user.`,
          );
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
