import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { APP_PIPE } from '@nestjs/core';
import { HttpValidationPipe } from './common/pipes';
import { ScheduleModule } from '@nestjs/schedule';
import { AppService } from './app.service';
import {
  envValidator,
  mailConfig,
  authConfig,
  databaseConfig,
  othersConfig,
  serverConfig,
} from './common/config';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { AddressBookModule } from './modules/address-book/address-book.module';
import { RequestPaymentModule } from './modules/request-payment/request-payment.module';
import { GiftModule } from './modules/gift/gift.module';
import { GroupPaymentModule } from './modules/group-payment/group-payment.module';
import { WalletAuthModule } from './modules/wallet-auth/wallet-auth.module';
import { AppConfigServiceModule } from './common/config/services/config.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { SchedulePaymentModule } from './modules/schedule-payment/schedule-payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV
        ? `.env.${process.env.NODE_ENV}`
        : '.env',
      validationSchema: envValidator,
      load: [
        databaseConfig,
        mailConfig,
        authConfig,
        othersConfig,
        serverConfig,
      ],
      isGlobal: true,
    }),
    AppConfigServiceModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    HealthModule,
    TransactionsModule,
    AddressBookModule,
    RequestPaymentModule,
    GiftModule,
    GroupPaymentModule,
    WalletAuthModule,
    NotificationModule,
    SchedulePaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: HttpValidationPipe,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {}
}
