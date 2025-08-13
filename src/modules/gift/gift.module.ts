import { Module } from '@nestjs/common';
import { GiftService } from './gift.service';
import { GiftController } from './gift.controller';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { NotificationModule } from '../notification/notification.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    WalletAuthModule,
    NotificationModule,
  ],
  providers: [GiftService],
  controllers: [GiftController],
  exports: [GiftService],
})
export class GiftModule {}
