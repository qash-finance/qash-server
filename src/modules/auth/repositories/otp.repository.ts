import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { OtpCodeModel } from '../../../database/generated/models/OtpCode';
import { OtpTypeEnum } from '../../../database/generated/enums';
import {
  BaseRepository,
  PrismaTransactionClient,
} from 'src/database/base.repository';
import { Prisma, PrismaClient } from 'src/database/generated/client';

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
export class OtpRepository extends BaseRepository<
  OtpCodeModel,
  Prisma.OtpCodeWhereInput,
  Prisma.OtpCodeCreateInput,
  Prisma.OtpCodeUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel(tx?: PrismaTransactionClient): PrismaClient['otpCode'] {
    return tx ? tx.otpCode : this.prisma.otpCode;
  }

  protected getModelName(): string {
    return 'OtpCode';
  }

  /**
   * Find OTP by ID
   */
  async findById(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<OtpCodeModel | null> {
    return this.findOne({ id }, tx);
  }

  /**
   * Find valid OTP for user
   */
  async findValidOtpForUser(
    userId: number,
    type: OtpTypeEnum = OtpTypeEnum.LOGIN,
    tx?: PrismaTransactionClient,
  ): Promise<OtpCodeModel | null> {
    const model = this.getModel(tx);
    return model.findFirst({
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
  async updateById(
    id: number,
    data: UpdateOtpData,
    tx?: PrismaTransactionClient,
  ): Promise<OtpCodeModel> {
    const model = this.getModel(tx);
    return model.update({
      where: { id },
      data,
    });
  }

  /**
   * Mark OTP as used
   */
  async markAsUsed(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<OtpCodeModel> {
    const model = this.getModel(tx);
    return model.update({
      where: { id },
      data: { isUsed: true },
    });
  }

  /**
   * Increment OTP attempts
   */
  async incrementAttempts(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<OtpCodeModel> {
    const model = this.getModel(tx);
    return model.update({
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
    tx?: PrismaTransactionClient,
  ): Promise<void> {
    const model = this.getModel(tx);
    await model.updateMany({
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
  async hasRecentOtp(
    userId: number,
    minutesAgo: number,
    tx?: PrismaTransactionClient,
  ): Promise<boolean> {
    const model = this.getModel(tx);
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - minutesAgo);

    const recentOtp = await model.findFirst({
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
  async cleanupExpired(tx?: PrismaTransactionClient): Promise<number> {
    const model = this.getModel(tx);
    const result = await model.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isUsed: true }],
      },
    });

    return result.count;
  }

  /**
   * Get OTP statistics for monitoring
   */
  async getStats(tx?: PrismaTransactionClient) {
    const model = this.getModel(tx);
    const [total, active, expired, used] = await Promise.all([
      model.count(),
      model.count({
        where: {
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
      }),
      model.count({
        where: {
          isUsed: false,
          expiresAt: { lt: new Date() },
        },
      }),
      model.count({
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
