import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../../common/interfaces/jwt-payload';
import { UserRepository } from '../repositories/user.repository';
import { UserSessionRepository } from '../repositories/user-session.repository';
import { nanoid } from 'nanoid';
import { ErrorAuth, ErrorUser } from 'src/common/constants/errors';
import { PrismaService } from 'src/database/prisma.service';
import { PrismaTransactionClient } from 'src/database/base.repository';

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
    private readonly prisma: PrismaService,
    private readonly jwtService: NestJwtService,
    private readonly userRepository: UserRepository,
    private readonly userSessionRepository: UserSessionRepository,
  ) {}

  /**
   * Generate access and refresh token pair
   */
  async generateTokens(
    userId: number,
    sessionInfo?: SessionInfo,
  ): Promise<TokenPair> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        return this.createTokenPair(userId, sessionInfo, tx);
      });
    } catch (error) {
      this.logger.error(`Failed to generate tokens for user ${userId}:`, error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(ErrorAuth.FailedToGenerateTokens);
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
      return await this.prisma.$transaction(async (tx) => {
        // Verify refresh token
        const decoded = this.jwtService.verify(refreshToken);
        const { sub: userId, tokenId } = decoded;

        // Find session in database
        const session =
          await this.userSessionRepository.findActiveSessionWithUser(
            tokenId,
            refreshToken,
            tx,
          );

        if (!session || session.expiresAt < new Date()) {
          throw new UnauthorizedException(ErrorAuth.InvalidRefreshToken);
        }

        if (!session.user.isActive) {
          throw new UnauthorizedException(ErrorUser.UserNotActive);
        }

        // Deactivate old session
        await this.userSessionRepository.deactivate(tokenId, tx);

        // Generate new token pair within the same transaction
        const newTokens = await this.createTokenPair(userId, sessionInfo, tx);

        return newTokens;
      });
    } catch (error) {
      this.logger.error('Failed to refresh tokens:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(ErrorAuth.InvalidRefreshToken);
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
        throw new UnauthorizedException(ErrorUser.NotFound);
      }

      return payload;
    } catch (error) {
      this.logger.error('Token validation failed:', error);
      throw new UnauthorizedException(ErrorAuth.InvalidToken);
    }
  }

  /**
   * Revoke refresh token (logout)
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const decoded = this.jwtService.verify(refreshToken);
        const { tokenId } = decoded;

        await this.userSessionRepository.deactivate(tokenId, tx);
      });
    } catch (error) {
      this.logger.error('Failed to revoke refresh token:', error);
    }
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.userSessionRepository.deactivateAllForUser(userId, tx);
      });
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
  async cleanupExpiredSessions(): Promise<number> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const count = await this.userSessionRepository.cleanupExpired(tx);
        return count;
      });
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Create token pair within an existing transaction
   */
  async createTokenPair(
    userId: number,
    sessionInfo: SessionInfo | undefined,
    tx: PrismaTransactionClient,
  ): Promise<TokenPair> {
    const user = await this.userRepository.findById(userId, tx);

    if (!user || !user.isActive) {
      throw new UnauthorizedException(ErrorUser.NotFound);
    }

    const payload: JwtPayload = {
      sub: userId,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshTokenId = nanoid(32);
    const refreshToken = this.jwtService.sign(
      { ...payload, tokenId: refreshTokenId },
      { expiresIn: this.REFRESH_TOKEN_EXPIRY },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.userSessionRepository.create(
      {
        id: refreshTokenId,
        user: {
          connect: {
            id: userId,
          },
        },
        refreshToken,
        userAgent: sessionInfo?.userAgent,
        ipAddress: sessionInfo?.ipAddress,
        expiresAt,
        isActive: true,
      },
      tx,
    );

    return { accessToken, refreshToken };
  }
}
