import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ReferralModule } from '../referral/referral.module';
import { ReferralCodeService } from '../referral/referral.service';
import { AppConfigService } from '../../common/config/services/config.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    ReferralModule,
  ],
  controllers: [UserController],
  providers: [
    Logger,
    UserService,
    ReferralCodeService,
    AppConfigService,
  ],
  exports: [UserService],
})
export class UserModule {}
