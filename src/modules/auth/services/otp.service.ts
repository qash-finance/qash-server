import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { MailService } from '../../mail/mail.service';
import { OtpTypeEnum } from '../../../database/generated/enums';
import { UserRepository } from '../repositories/user.repository';
import { OtpRepository } from '../repositories/otp.repository';
import { PrismaService } from 'src/database/prisma.service';
import { ErrorAuth } from 'src/common/constants/errors';
import { PrismaTransactionClient } from 'src/database/base.repository';
import { handleError } from 'src/common/utils/errors';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_OTP_ATTEMPTS = 3;
  private readonly RATE_LIMIT_MINUTES = 1; // Minimum time between OTP requests

  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly otpRepository: OtpRepository,
    private readonly mailService: MailService,
  ) {}

  /**
   * Generate a cryptographically secure 6-digit OTP code
   */
  private generateOtpCode(): string {
    return randomInt(100000, 1000000).toString().padStart(6, '0');
  }

  /**
   * Send OTP to user's email
   */
  async sendOtp(
    email: string,
    type: OtpTypeEnum = OtpTypeEnum.LOGIN,
  ): Promise<void> {
    try {
      this.prisma.$transaction(async (tx) => {
        let user = await this.userRepository.findByEmail(email, tx);

        if (!user) {
          user = await this.userRepository.create({ email }, tx);
        }

        if (!user.isActive) {
          throw new UnauthorizedException(ErrorAuth.AccountDeactivated);
        }

        // Check rate limiting
        await this.checkRateLimit(user.id, tx);

        // Invalidate existing OTP codes for this user and type
        await this.otpRepository.invalidateExistingOtps(user.id, type, tx);

        // Generate new OTP
        const otpCode = this.generateOtpCode();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

        // Save OTP to database
        await this.otpRepository.create(
          {
            user: {
              connect: {
                id: user.id,
              },
            },
            code: otpCode,
            type,
            expiresAt,
          },
          tx,
        );

        // Send OTP via email
        await this.mailService.sendOtpEmail(email, otpCode);
      });
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${email}:`, error);
      handleError(error, this.logger);
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(
    email: string,
    code: string,
    type: OtpTypeEnum = OtpTypeEnum.LOGIN,
  ): Promise<{ userId: number; isNewUser: boolean }> {
    try {
      return this.prisma.$transaction(async (tx) => {
        return this.verifyOtpInternal(email, code, type, tx);
      });
    } catch (error) {
      this.logger.error(`Failed to verify OTP for ${email}:`, error);
      handleError(error, this.logger);
    }
  }

  /**
   * Verify OTP within an existing transaction
   */
  async verifyOtpInternal(
    email: string,
    code: string,
    type: OtpTypeEnum,
    tx: PrismaTransactionClient,
  ): Promise<{ userId: number; isNewUser: boolean }> {
    // Find user
    const user = await this.userRepository.findByEmail(email, tx);

    if (!user) {
      throw new UnauthorizedException(ErrorAuth.InvalidEmailOrOtp);
    }

    if (!user.isActive) {
      throw new UnauthorizedException(ErrorAuth.AccountDeactivated);
    }

    // Find valid OTP for user
    const otpRecord = await this.otpRepository.findValidOtpForUser(
      user.id,
      type,
      tx,
    );
    if (!otpRecord) {
      throw new UnauthorizedException(ErrorAuth.InvalidOtp);
    }

    // Check attempts
    if (otpRecord.attempts >= this.MAX_OTP_ATTEMPTS) {
      await this.otpRepository.markAsUsed(otpRecord.id, tx);
      throw new UnauthorizedException(ErrorAuth.TooManyFailedAttempts);
    }

    // Verify OTP
    if (otpRecord.code !== code) {
      await this.otpRepository.incrementAttempts(otpRecord.id, tx);
      throw new UnauthorizedException(ErrorAuth.InvalidOtp);
    }

    // Mark OTP as used
    await this.otpRepository.markAsUsed(otpRecord.id, tx);

    // Update user's last login
    await this.userRepository.updateLastLogin(user.id, tx);

    const isNewUser = !user.lastLogin;

    return { userId: user.id, isNewUser };
  }

  /**
   * Check rate limiting for OTP requests
   */
  private async checkRateLimit(
    userId: number,
    tx?: PrismaTransactionClient,
  ): Promise<void> {
    const hasRecentOtp = await this.otpRepository.hasRecentOtp(
      userId,
      this.RATE_LIMIT_MINUTES,
      tx,
    );

    if (hasRecentOtp) {
      throw new BadRequestException(ErrorAuth.RateLimitExceeded);
    }
  }

  /**
   * Clean up expired OTP codes (can be called by a cron job)
   */
  async cleanupExpiredOtps(): Promise<void> {
    try {
      this.prisma.$transaction(async (tx) => {
        await this.otpRepository.cleanupExpired(tx);
      });
    } catch (error) {
      this.logger.error('Failed to cleanup expired OTPs:', error);
    }
  }
}
