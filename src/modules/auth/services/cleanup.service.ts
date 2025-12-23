import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Clean up expired OTP codes and sessions every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup() {
    this.logger.log('Starting scheduled cleanup of expired auth data');

    try {
      await this.authService.cleanupExpiredData();
    } catch (error) {
      this.logger.error('Scheduled cleanup failed:', error);
    }
  }

  /**
   * Manual cleanup trigger (can be called via admin endpoint)
   */
  async triggerManualCleanup() {
    await this.authService.cleanupExpiredData();
  }
}
