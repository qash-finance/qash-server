import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import { OtpTypeEnum } from '../../../database/generated/enums';
import { UserRepository } from '../repositories/user.repository';
import { OtpRepository } from '../repositories/otp.repository';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_OTP_ATTEMPTS = 3;
  private readonly RATE_LIMIT_MINUTES = 1; // Minimum time between OTP requests

  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpRepository: OtpRepository,
    private readonly mailService: MailService,
  ) {}

  /**
   * Generate a 6-digit OTP code
   */
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP to user's email
   */
  async sendOtp(
    email: string,
    type: OtpTypeEnum = OtpTypeEnum.LOGIN,
  ): Promise<void> {
    try {
      let user = await this.userRepository.findByEmail(email);

      if (!user) {
        user = await this.userRepository.create({ email });
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Check rate limiting
      await this.checkRateLimit(user.id);

      // Invalidate existing OTP codes for this user and type
      await this.otpRepository.invalidateExistingOtps(user.id, type);

      // Generate new OTP
      const otpCode = this.generateOtpCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

      // Save OTP to database
      await this.otpRepository.create({
        userId: user.id,
        code: otpCode,
        type,
        expiresAt,
      });

      // Send OTP via email
      // await this.sendOtpEmail(email, otpCode, type); // TODO: Uncomment this when email service is implemented

      this.logger.log(`OTP sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${email}:`, error);
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to send OTP. Please try again.');
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
      // Find user
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        throw new UnauthorizedException('Invalid email or OTP');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Find valid OTP for user
      const otpRecord = await this.otpRepository.findValidOtpForUser(
        user.id,
        type,
      );
      if (!otpRecord) {
        throw new UnauthorizedException('OTP expired or not found');
      }

      // Check attempts
      if (otpRecord.attempts >= this.MAX_OTP_ATTEMPTS) {
        await this.otpRepository.markAsUsed(otpRecord.id);
        throw new UnauthorizedException(
          'Too many failed attempts. Please request a new OTP.',
        );
      }

      // Verify OTP
      if (otpRecord.code !== code) {
        await this.otpRepository.incrementAttempts(otpRecord.id);
        throw new UnauthorizedException('Invalid OTP');
      }

      // Mark OTP as used
      await this.otpRepository.markAsUsed(otpRecord.id);

      // Update user's last login
      await this.userRepository.updateLastLogin(user.id);

      const isNewUser = !user.lastLogin;

      this.logger.log(`OTP verified successfully for user: ${email}`);
      return { userId: user.id, isNewUser };
    } catch (error) {
      this.logger.error(`Failed to verify OTP for ${email}:`, error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Failed to verify OTP');
    }
  }

  /**
   * Check rate limiting for OTP requests
   */
  private async checkRateLimit(userId: number): Promise<void> {
    const hasRecentOtp = await this.otpRepository.hasRecentOtp(
      userId,
      this.RATE_LIMIT_MINUTES,
    );

    if (hasRecentOtp) {
      throw new BadRequestException(
        `Please wait ${this.RATE_LIMIT_MINUTES} minute(s) before requesting another OTP`,
      );
    }
  }

  /**
   * Send OTP email
   */
  private async sendOtpEmail(
    email: string,
    otpCode: string,
    type: OtpTypeEnum,
  ): Promise<void> {
    const subject = this.getEmailSubject(type);
    const html = this.getEmailTemplate(otpCode, type);

    await this.mailService.sendEmail({
      to: email,
      subject,
      html,
      fromEmail: 'no-reply@qash.finance',
    });
  }

  /**
   * Get email subject based on OTP type
   */
  private getEmailSubject(type: OtpTypeEnum): string {
    switch (type) {
      case OtpTypeEnum.LOGIN:
        return 'Your Login OTP Code';
      case OtpTypeEnum.EMAIL_VERIFICATION:
        return 'Email Verification OTP Code';
      default:
        return 'Your OTP Code';
    }
  }

  /**
   * Get email template based on OTP type
   */
  private getEmailTemplate(otpCode: string, type: OtpTypeEnum): string {
    const action = this.getActionText(type);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your OTP Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .otp-box { 
            background: #f8f9fa; 
            border: 2px solid #007bff; 
            border-radius: 8px; 
            padding: 20px; 
            text-align: center; 
            margin: 20px 0; 
          }
          .otp-code { 
            font-size: 32px; 
            font-weight: bold; 
            color: #007bff; 
            letter-spacing: 8px; 
            margin: 10px 0; 
          }
          .warning { 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            border-radius: 4px; 
            padding: 15px; 
            margin: 20px 0; 
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            font-size: 14px; 
            color: #666; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your OTP Code</h1>
          </div>
          
          <p>Hello,</p>
          <p>You have requested to ${action}. Please use the following OTP code:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
            <p><strong>This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.</strong></p>
          </div>
          
          <div class="warning">
            <strong>Security Notice:</strong>
            <ul>
              <li>Never share this code with anyone</li>
              <li>Our team will never ask for your OTP code</li>
              <li>If you didn't request this code, please ignore this email</li>
            </ul>
          </div>
          
          <p>If you have any questions or concerns, please contact our support team.</p>
          
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get action text based on OTP type
   */
  private getActionText(type: OtpTypeEnum): string {
    switch (type) {
      case OtpTypeEnum.LOGIN:
        return 'sign in to your account';
      case OtpTypeEnum.EMAIL_VERIFICATION:
        return 'verify your email address';
      default:
        return 'complete your request';
    }
  }

  /**
   * Clean up expired OTP codes (can be called by a cron job)
   */
  async cleanupExpiredOtps(): Promise<void> {
    try {
      const count = await this.otpRepository.cleanupExpired();
      this.logger.log(`Cleaned up ${count} expired/used OTP codes`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired OTPs:', error);
    }
  }
}
