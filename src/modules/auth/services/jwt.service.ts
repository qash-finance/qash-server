import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { AppConfigService } from '../../shared/config/config.service';
import { JwtPayload } from '../../../common/interfaces/jwt-payload';
import { UserRepository } from '../repositories/user.repository';
import { UserSessionRepository } from '../repositories/user-session.repository';
import { nanoid } from 'nanoid';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SessionInfo {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class JwtAuthService {
  private readonly logger = new Logger(JwtAuthService.name);
  private readonly ACCESS_TOKEN_EXPIRY = '7d';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly userRepository: UserRepository,
    private readonly userSessionRepository: UserSessionRepository,
    private readonly appConfigService: AppConfigService,
  ) {}

  /**
   * Generate access and refresh token pair
   */
  async generateTokens(
    userId: number,
    sessionInfo?: SessionInfo,
  ): Promise<TokenPair> {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const payload: JwtPayload = {
        sub: userId,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
      };

      // Generate tokens
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: this.ACCESS_TOKEN_EXPIRY,
      });

      const refreshTokenId = nanoid(32);
      const refreshToken = this.jwtService.sign(
        { ...payload, tokenId: refreshTokenId },
        { expiresIn: this.REFRESH_TOKEN_EXPIRY },
      );

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      // Store refresh token in database
      await this.userSessionRepository.create({
        id: refreshTokenId,
        userId,
        refreshToken,
        userAgent: sessionInfo?.userAgent,
        ipAddress: sessionInfo?.ipAddress,
        expiresAt,
      });

      this.logger.log(`Tokens generated for user: ${user.email}`);
      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(`Failed to generate tokens for user ${userId}:`, error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to generate tokens');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(
    refreshToken: string,
    sessionInfo?: SessionInfo,
  ): Promise<TokenPair> {
    try {
      // Verify refresh token
      const decoded = this.jwtService.verify(refreshToken);
      const { sub: userId, tokenId } = decoded;

      // Find session in database
      const session =
        await this.userSessionRepository.findActiveSessionWithUser(
          tokenId,
          refreshToken,
        );

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      if (!session.user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Deactivate old session
      await this.userSessionRepository.deactivate(tokenId);

      // Generate new token pair
      const newTokens = await this.generateTokens(userId, sessionInfo);

      this.logger.log(`Tokens refreshed for user: ${session.user.email}`);
      return newTokens;
    } catch (error) {
      this.logger.error('Failed to refresh tokens:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validate access token and return user payload
   */
  async validateToken(token: string): Promise<JwtPayload> {
    try {
      const payload = this.jwtService.verify(token);

      // Check if user still exists and is active
      const isActive = await this.userRepository.isActiveUser(payload.sub);

      if (!isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return payload;
    } catch (error) {
      this.logger.error('Token validation failed:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Revoke refresh token (logout)
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const { tokenId } = decoded;

      await this.userSessionRepository.deactivate(tokenId);

      this.logger.log(`Refresh token revoked: ${tokenId}`);
    } catch (error) {
      this.logger.error('Failed to revoke refresh token:', error);
      // Don't throw error for logout - just log it
    }
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    try {
      await this.userSessionRepository.deactivateAllForUser(userId);

      this.logger.log(`All tokens revoked for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to revoke all tokens for user ${userId}:`,
        error,
      );
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: number) {
    try {
      return await this.userSessionRepository.getActiveSessionsForUser(userId);
    } catch (error) {
      this.logger.error(`Failed to get sessions for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Clean up expired sessions (can be called by a cron job)
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const count = await this.userSessionRepository.cleanupExpired();
      this.logger.log(`Cleaned up ${count} expired/inactive sessions`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions:', error);
    }
  }
}
