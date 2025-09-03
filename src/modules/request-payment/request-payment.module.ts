import { Module, forwardRef } from '@nestjs/common';
import { RequestPaymentService } from './request-payment.service';
import { RequestPaymentController } from './request-payment.controller';
import { RequestPaymentRepository } from './request-payment.repository';
import { GroupPaymentModule } from '../group-payment/group-payment.module';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { AddressBookModule } from '../address-book/address-book.module';
import { NotificationModule } from '../notification/notification.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => GroupPaymentModule),
    WalletAuthModule,
    AddressBookModule,
    NotificationModule,
  ],
  providers: [RequestPaymentService, RequestPaymentRepository],
  controllers: [RequestPaymentController],
  exports: [RequestPaymentService, RequestPaymentRepository],
})
export class RequestPaymentModule {}
