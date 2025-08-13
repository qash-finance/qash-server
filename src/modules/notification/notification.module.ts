import { Logger, Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    forwardRef(() => WalletAuthModule),
  ],
  controllers: [NotificationController],
  providers: [
    Logger,
    NotificationService,
    NotificationGateway,
  ],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}