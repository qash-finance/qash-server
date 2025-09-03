import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TransactionRepository } from './transaction.repository';
import { GiftModule } from '../gift/gift.module';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { NotificationModule } from '../notification/notification.module';
import { RequestPaymentModule } from '../request-payment/request-payment.module';
import { PrismaModule } from '../../database/prisma.module';
import { SchedulePaymentModule } from '../schedule-payment/schedule-payment.module';

@Module({
  imports: [
    PrismaModule,
    GiftModule,
    WalletAuthModule,
    NotificationModule,
    RequestPaymentModule,
    SchedulePaymentModule,
  ],
  providers: [TransactionService, TransactionRepository],
  controllers: [TransactionController],
  exports: [TransactionService, TransactionRepository],
})
export class TransactionsModule {}
