import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from './transaction.entity';
import { TransactionRepository } from './transaction.repository';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { GiftModule } from '../gift/gift.module';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { NotificationModule } from '../notification/notification.module';
import { RequestPaymentModule } from '../request-payment/request-payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity]),
    GiftModule,
    WalletAuthModule,
    NotificationModule,
    RequestPaymentModule,
  ],
  providers: [TransactionRepository, TransactionService],
  controllers: [TransactionController],
  exports: [TransactionService, TransactionRepository],
})
export class TransactionsModule {}
