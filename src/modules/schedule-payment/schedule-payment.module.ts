import { Module } from '@nestjs/common';
import { SchedulePaymentService } from './schedule-payment.service';
import { SchedulePaymentController } from './schedule-payment.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, WalletAuthModule, NotificationModule],
  providers: [SchedulePaymentService],
  controllers: [SchedulePaymentController],
  exports: [SchedulePaymentService],
})
export class SchedulePaymentModule {}
