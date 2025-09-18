import { Module } from '@nestjs/common';
import { SchedulePaymentService } from './schedule-payment.service';
import { SchedulePaymentController } from './schedule-payment.controller';
import { SchedulePaymentRepository } from './schedule-payment.repository';
import { PrismaModule } from '../../database/prisma.module';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, WalletAuthModule, NotificationModule],
  providers: [SchedulePaymentService, SchedulePaymentRepository],
  controllers: [SchedulePaymentController],
  exports: [SchedulePaymentService, SchedulePaymentRepository],
})
export class SchedulePaymentModule {}
