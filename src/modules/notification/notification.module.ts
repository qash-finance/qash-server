import { Logger, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationEntity } from './notification.entity';
import { NotificationRepository } from './notification.repository';
import { NotificationGateway } from './notification.gateway';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]),
    ConfigModule,
    forwardRef(() => WalletAuthModule),
  ],
  controllers: [NotificationController],
  providers: [
    Logger,
    NotificationService,
    NotificationRepository,
    NotificationGateway,
  ],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
