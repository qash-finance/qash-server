import { Module } from '@nestjs/common';
import { WalletAuthService } from './wallet-auth.service';
import { WalletAuthController } from './wallet-auth.controller';
import { WalletAuthGuard } from './wallet-auth.guard';
import {
  WalletAuthChallengeRepository,
  WalletAuthKeyRepository,
  WalletAuthSessionRepository,
} from './wallet-auth.repository';
import { NotificationModule } from '../notification/notification.module';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [
    WalletAuthService,
    WalletAuthGuard,
    WalletAuthChallengeRepository,
    WalletAuthKeyRepository,
    WalletAuthSessionRepository,
  ],
  controllers: [WalletAuthController],
  exports: [
    WalletAuthService,
    WalletAuthGuard,
    WalletAuthChallengeRepository,
    WalletAuthKeyRepository,
    WalletAuthSessionRepository,
  ],
})
export class WalletAuthModule {}
