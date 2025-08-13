import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { AuthService } from './auth.service';
import { AuthJwtController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { TokenRepository } from './token.repository';
import { MailModule } from '../mail/mail.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtHttpStrategy } from './strategy';
import { AppConfigService } from '../../common/config/services/config.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [
    UserModule,
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const appConfigService = new AppConfigService(configService);
        return {
          secret: appConfigService.authConfig.jwt.secret,
          signOptions: {
            expiresIn: appConfigService.authConfig.jwt.accessTokenExpiresIn,
          },
        };
      },
    }),
    MailModule,
  ],
  providers: [
    JwtHttpStrategy,
    AuthService,
    AuthRepository,
    TokenRepository,
    AppConfigService,
  ],
  controllers: [AuthJwtController],
  exports: [AuthService],
})
export class AuthModule {}
