import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppConfigService } from '../shared/config/config.service';
import { OtpService } from './services/otp.service';
import { JwtAuthService, SessionInfo } from './services/jwt.service';
import { UserRepository } from './repositories/user.repository';
import { UserSessionRepository } from './repositories/user-session.repository';
import { AuthResponseDto } from './dto/auth.dto';
import { OtpTypeEnum } from '../../database/generated/enums';
import { handleError } from 'src/common/utils/errors';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly otpService: OtpService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly userRepository: UserRepository,
    private readonly userSessionRepository: UserSessionRepository,
  ) {}

  /**
   * Send OTP to user's email
   */
  async sendOtp(
    email: string,
    type: OtpTypeEnum = OtpTypeEnum.LOGIN,
  ): Promise<void> {
    try {
      await this.otpService.sendOtp(email, type);
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
    this.logger.log(`Verifying OTP for: ${email}`);

    // Verify OTP
    const { userId, isNewUser } = await this.otpService.verifyOtp(email, otp);

    // Generate tokens
    const tokens = await this.jwtAuthService.generateTokens(
      userId,
      sessionInfo,
    );

    // Get user profile
    const user = await this.getUserProfile(userId);

    this.logger.log(
      `User authenticated successfully: ${email} (${isNewUser ? 'new' : 'existing'} user)`,
    );

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(refreshToken: string, sessionInfo?: SessionInfo) {
    this.logger.log('Refreshing tokens');
    return await this.jwtAuthService.refreshTokens(refreshToken, sessionInfo);
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: number) {
    const user = await this.userRepository.getProfile(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: number) {
    this.logger.log(`Getting sessions for user: ${userId}`);
    return await this.jwtAuthService.getUserSessions(userId);
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    this.logger.log('Logging out user');
    await this.jwtAuthService.revokeRefreshToken(refreshToken);
  }

  /**
   * Logout user from all devices
   */
  async logoutAll(userId: number): Promise<void> {
    this.logger.log(`Logging out user from all devices: ${userId}`);
    await this.jwtAuthService.revokeAllUserTokens(userId);
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: number): Promise<void> {
    this.logger.log(`Deactivating user: ${userId}`);

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
    this.logger.log(`Reactivating user: ${userId}`);
    await this.userRepository.activate(userId);
  }

  /**
   * Clean up expired data (for cron jobs)
   */
  async cleanupExpiredData(): Promise<void> {
    this.logger.log('Starting cleanup of expired data');

    await Promise.all([
      this.otpService.cleanupExpiredOtps(),
      this.jwtAuthService.cleanupExpiredSessions(),
    ]);

    this.logger.log('Cleanup completed');
  }
}
