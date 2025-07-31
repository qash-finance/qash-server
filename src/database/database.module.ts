import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { UserEntity } from '../modules/user/user.entity';
import { AuthEntity } from '../modules/auth/auth.entity';
import { TokenEntity } from '../modules/auth/token.entity';
import { APP } from '../common/constants';
import { AppConfigService } from '../common/config/services/config.service';
import { ReferralCodeEntity } from '../modules/referral/referral.entity';
import { TransactionEntity } from 'src/modules/transactions/transaction.entity';
import { AddressBookEntity } from 'src/modules/address-book/address-book.entity';
import { RequestPaymentEntity } from 'src/modules/request-payment/request-payment.entity';
import { GiftEntity } from 'src/modules/gift/gift.entity';
import {
  GroupPaymentEntity,
  GroupPaymentGroupEntity,
  GroupPaymentMemberStatusEntity,
} from 'src/modules/group-payment/group-payment.entity';
import {
  AnalyticsEndpointStatsEntity,
  AnalyticsEventEntity,
  AnalyticsTransactionStatsEntity,
  AnalyticsUserSessionEntity,
} from 'src/modules/analytics';
import {
  WalletAuthChallengeEntity,
  WalletAuthKeyEntity,
  WalletAuthSessionEntity,
} from 'src/modules/wallet-auth/wallet-auth.entity';
import { CategoryEntity } from 'src/modules/address-book/category.entity';
import { NotificationEntity } from 'src/modules/notification/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        // typeOrmLoggerService: TypeOrmLoggerService,
        configService: ConfigService,
      ) => {
        const appConfigService = new AppConfigService(configService);
        // typeOrmLoggerService.setOptions('all');
        return {
          name: 'default',
          type: 'postgres',
          entities: [
            UserEntity,
            AuthEntity,
            TokenEntity,
            ReferralCodeEntity,
            // *************************************************
            // **************** TRANSACTIONS ******************
            // *************************************************
            TransactionEntity,
            // *************************************************
            // **************** ADDRESS BOOK ******************
            // *************************************************
            AddressBookEntity,
            CategoryEntity,
            // *************************************************
            // **************** REQUEST PAYMENT ***************
            // *************************************************
            RequestPaymentEntity,
            // *************************************************
            // **************** GIFT ***************************
            // *************************************************
            GiftEntity,
            // *************************************************
            // **************** GROUP PAYMENT ******************
            // *************************************************
            GroupPaymentGroupEntity,
            GroupPaymentEntity,
            GroupPaymentMemberStatusEntity,
            // *************************************************
            // **************** SERVER USAGE ANALYTICS *********
            // *************************************************
            AnalyticsEventEntity,
            AnalyticsUserSessionEntity,
            AnalyticsEndpointStatsEntity,
            AnalyticsTransactionStatsEntity,
            // *************************************************
            // **************** WALLET AUTH ********************
            // *************************************************
            WalletAuthKeyEntity,
            WalletAuthSessionEntity,
            WalletAuthChallengeEntity,
            // *************************************************
            // **************** NOTIFICATIONS ******************
            // *************************************************
            NotificationEntity,
          ],
          // We are using migrations, synchronize should be set to false.
          synchronize: false,
          // Run migrations automatically,
          // you can disable this if you prefer running migration manually.
          migrationsTableName: APP,
          migrationsTransactionMode: 'each',
          namingStrategy: new SnakeNamingStrategy(),
          logging:
            appConfigService.nodeEnv === 'development' ||
            appConfigService.nodeEnv === 'staging',
          // Allow both start:prod and start:dev to use migrations
          // __dirname is either dist or server folder, meaning either
          // the compiled js in prod or the ts in dev.
          migrations: [path.join(__dirname, '/migrations/**/*{.ts,.js}')],
          //"migrations": ["dist/migrations/*{.ts,.js}"],
          //   logger: typeOrmLoggerService,
          host: appConfigService.databaseConfig.host,
          port: appConfigService.databaseConfig.port,
          username: appConfigService.databaseConfig.username,
          password: appConfigService.databaseConfig.password,
          database: appConfigService.databaseConfig.database,
          keepConnectionAlive: appConfigService.nodeEnv === 'test',
          migrationsRun: false,
          ssl: appConfigService.databaseConfig.ssl.require
            ? {
                rejectUnauthorized: false,
                require: appConfigService.databaseConfig.ssl.require === true,
              }
            : false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
