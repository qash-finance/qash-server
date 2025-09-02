import { Module, forwardRef } from '@nestjs/common';
import { GroupPaymentService } from './group-payment.service';
import { GroupPaymentController } from './group-payment.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { RequestPaymentModule } from '../request-payment/request-payment.module';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => RequestPaymentModule),
    WalletAuthModule,
  ],
  providers: [GroupPaymentService],
  controllers: [GroupPaymentController],
  exports: [GroupPaymentService],
})
export class GroupPaymentModule {}
