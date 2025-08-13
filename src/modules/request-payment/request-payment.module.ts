import { Module, forwardRef } from '@nestjs/common';
import { RequestPaymentService } from './request-payment.service';
import { RequestPaymentController } from './request-payment.controller';
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
  providers: [RequestPaymentService],
  controllers: [RequestPaymentController],
  exports: [RequestPaymentService],
})
export class RequestPaymentModule {}
