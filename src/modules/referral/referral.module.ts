import { Module } from '@nestjs/common';
import { ReferralCodeService } from './referral.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ReferralCodeService],
  exports: [ReferralCodeService],
})
export class ReferralModule {}
