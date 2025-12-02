import { Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppService } from './app.service';
import {
  mailConfig,
  authConfig,
  databaseConfig,
  othersConfig,
  serverConfig,
} from './modules/shared/config/registration';
import { AddressBookModule } from './modules/address-book/address-book.module';
import { AppConfigServiceModule } from './modules/shared/config/config.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PrismaModule } from './database/prisma.module';
import { PaymentLinkModule } from './modules/payment-link/payment-link.module';
import { AuthModule } from './modules/auth/auth.module';
import { envValidator } from './common/validators/env.validation';
import { HttpValidationPipe } from './modules/shared/pipes/http-validation';

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
    AddressBookModule,
    NotificationModule,
    PaymentLinkModule,
    AuthModule,
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
  configure() {}
}
