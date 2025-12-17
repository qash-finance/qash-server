import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
}
