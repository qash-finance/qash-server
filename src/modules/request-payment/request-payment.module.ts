import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestPaymentEntity } from './request-payment.entity';
import { RequestPaymentRepository } from './request-payment.repository';
import { RequestPaymentService } from './request-payment.service';
import { RequestPaymentController } from './request-payment.controller';
import { GroupPaymentModule } from '../group-payment/group-payment.module';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { AddressBookModule } from '../address-book/address-book.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RequestPaymentEntity]),
    forwardRef(() => GroupPaymentModule),
    WalletAuthModule,
    AddressBookModule,
    NotificationModule, 
  ],
  providers: [RequestPaymentRepository, RequestPaymentService],
  controllers: [RequestPaymentController],
  exports: [RequestPaymentService],
})
export class RequestPaymentModule {}
