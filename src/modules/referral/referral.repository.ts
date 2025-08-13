import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma, ReferralCodes } from '@prisma/client';
import { ReferralCodeDto } from './referral.dto';

@Injectable()
export class ReferralCodeRepository {
  private readonly logger = new Logger(ReferralCodeRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findOne(
    where: Prisma.ReferralCodesWhereInput,
    options?: Prisma.ReferralCodesFindFirstArgs,
  ): Promise<ReferralCodes | null> {
    try {
      const row = await this.prisma.referralCodes.findFirst({
        where,
        include: options?.include,
        orderBy: { createdAt: 'desc' },
      });
      return row ?? null;
    } catch (error) {
      this.logger.error('Error finding referral code:', error);
      throw error;
    }
  }

  public async create(dto: ReferralCodeDto): Promise<ReferralCodes> {
    try {
      const now = new Date();
      const row = await this.prisma.referralCodes.create({
        data: {
          code: dto.code,
          timesUsed: dto.timesUsed ?? 0,
          createdAt: now,
          updatedAt: now,
        },
      });
      return row;
    } catch (error) {
      this.logger.error('Error creating referral code:', error);
      throw error;
    }
  }

  public async incrementTimesUsed(id: number): Promise<ReferralCodes> {
    try {
      const row = await this.prisma.referralCodes.update({
        where: { id },
        data: { timesUsed: { increment: 1 }, updatedAt: new Date() },
      });
      return row;
    } catch (error) {
      this.logger.error('Error incrementing referral code usage:', error);
      throw error;
    }
  }
}
