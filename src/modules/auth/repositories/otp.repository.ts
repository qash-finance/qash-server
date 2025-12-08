import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { OtpCodeModel } from '../../../database/generated/models/OtpCode';
import { OtpTypeEnum } from '../../../database/generated/enums';

export interface CreateOtpData {
  userId: number;
  code: string;
  type: OtpTypeEnum;
  expiresAt: Date;
}

export interface UpdateOtpData {
  isUsed?: boolean;
  attempts?: number;
}

@Injectable()
export class OtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create new OTP code
   */
  async create(data: CreateOtpData): Promise<OtpCodeModel> {
    return this.prisma.otpCode.create({
      data,
    });
  }

  /**
   * Find OTP by ID
   */
  async findById(id: number): Promise<OtpCodeModel | null> {
    return this.prisma.otpCode.findUnique({
      where: { id },
    });
  }

  /**
   * Find valid OTP for user
   */
  async findValidOtpForUser(
    userId: number,
    type: OtpTypeEnum = OtpTypeEnum.LOGIN,
  ): Promise<OtpCodeModel | null> {
    return this.prisma.otpCode.findFirst({
      where: {
        userId,
        type,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update OTP by ID
   */
  async updateById(id: number, data: UpdateOtpData): Promise<OtpCodeModel> {
    return this.prisma.otpCode.update({
      where: { id },
      data,
    });
  }

  /**
   * Mark OTP as used
   */
  async markAsUsed(id: number): Promise<OtpCodeModel> {
    return this.prisma.otpCode.update({
      where: { id },
      data: { isUsed: true },
    });
  }

  /**
   * Increment OTP attempts
   */
  async incrementAttempts(id: number): Promise<OtpCodeModel> {
    return this.prisma.otpCode.update({
      where: { id },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Invalidate all existing OTPs for user and type
   */
  async invalidateExistingOtps(
    userId: number,
    type: OtpTypeEnum,
  ): Promise<void> {
    await this.prisma.otpCode.updateMany({
      where: {
        userId,
        type,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });
  }

  /**
   * Check if user has recent OTP (for rate limiting)
   */
  async hasRecentOtp(userId: number, minutesAgo: number): Promise<boolean> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - minutesAgo);

    const recentOtp = await this.prisma.otpCode.findFirst({
      where: {
        userId,
        createdAt: {
          gt: cutoffTime,
        },
      },
    });

    return !!recentOtp;
  }

  /**
   * Clean up expired and used OTPs
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.otpCode.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isUsed: true }],
      },
    });

    return result.count;
  }

  /**
   * Get OTP statistics for monitoring
   */
  async getStats() {
    const [total, active, expired, used] = await Promise.all([
      this.prisma.otpCode.count(),
      this.prisma.otpCode.count({
        where: {
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.otpCode.count({
        where: {
          isUsed: false,
          expiresAt: { lt: new Date() },
        },
      }),
      this.prisma.otpCode.count({
        where: { isUsed: true },
      }),
    ]);

    return {
      total,
      active,
      expired,
      used,
    };
  }
}
