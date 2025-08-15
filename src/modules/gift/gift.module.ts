import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GiftEntity } from './gift.entity';
import { GiftRepository } from './gift.repository';
import { GiftService } from './gift.service';
import { GiftController } from './gift.controller';
import { AppConfigService } from '../../common/config/services/config.service';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GiftEntity]),
    WalletAuthModule,
    NotificationModule,
  ],
  providers: [GiftRepository, GiftService, AppConfigService],
  controllers: [GiftController],
  exports: [GiftService, GiftRepository],
})
export class GiftModule {}
