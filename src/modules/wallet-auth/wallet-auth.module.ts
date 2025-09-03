import { Module } from '@nestjs/common';
import { WalletAuthService } from './wallet-auth.service';
import { WalletAuthController } from './wallet-auth.controller';
import { WalletAuthGuard } from './wallet-auth.guard';
import { NotificationModule } from '../notification/notification.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [WalletAuthService, WalletAuthGuard],
  controllers: [WalletAuthController],
  exports: [WalletAuthService, WalletAuthGuard],
})
export class WalletAuthModule {}
