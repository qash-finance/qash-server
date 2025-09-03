import { Module, forwardRef } from '@nestjs/common';
import { GroupPaymentService } from './group-payment.service';
import { GroupPaymentController } from './group-payment.controller';
import {
  GroupPaymentRepository,
  GroupPaymentGroupRepository,
} from './group-payment.repository';
import { PrismaModule } from 'src/database/prisma.module';
import { RequestPaymentModule } from '../request-payment/request-payment.module';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => RequestPaymentModule),
    WalletAuthModule,
  ],
  providers: [
    GroupPaymentService,
    GroupPaymentRepository,
    GroupPaymentGroupRepository,
  ],
  controllers: [GroupPaymentController],
  exports: [
    GroupPaymentService,
    GroupPaymentRepository,
    GroupPaymentGroupRepository,
  ],
})
export class GroupPaymentModule {}
