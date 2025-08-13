import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ReferralCodeDto } from './referral.dto';
import { ReferralCodes } from '@prisma/client';
import { ErrorReferralCode } from '../../common/constants/errors';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReferralCodeService {
  private readonly logger = new Logger(ReferralCodeService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // create referral code for user who verified successfully
  public async create(dto: ReferralCodeDto): Promise<ReferralCodes> {
    try {
      const now = new Date();
      return await this.prisma.referralCodes.create({
        data: {
          code: dto.code,
          timesUsed: dto.timesUsed ?? 0,
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch (error) {
      this.logger.error('Error creating referral code:', error);
      throw error;
    }
  }

  public async useReferralCode(
    referredBy: { referralCode: { id: number } | null },
  ): Promise<ReferralCodes> {
    const referralCodeId = referredBy?.referralCode?.id;
    if (!referralCodeId) {
      throw new NotFoundException(ErrorReferralCode.ReferralCodeNotFound);
    }
    
    try {
      return await this.prisma.referralCodes.update({
        where: { id: referralCodeId },
        data: { 
          timesUsed: { increment: 1 }, 
          updatedAt: new Date() 
        },
      });
    } catch (error) {
      this.logger.error('Error incrementing referral code usage:', error);
      throw error;
    }
  }

  public generateCode(): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < 8) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }
}
