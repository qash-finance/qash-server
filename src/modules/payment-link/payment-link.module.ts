import { Module } from '@nestjs/common';
import { PaymentLinkService } from './payment-link.service';
import { PaymentLinkController } from './payment-link.controller';
import {
  PaymentLinkRepository,
  PaymentLinkRecordRepository,
} from './payment-link.repository';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule, WalletAuthModule],
  providers: [
    PaymentLinkService,
    PaymentLinkRepository,
    PaymentLinkRecordRepository,
  ],
  controllers: [PaymentLinkController],
  exports: [PaymentLinkService, PaymentLinkRepository, PaymentLinkRecordRepository],
})
export class PaymentLinkModule {}

