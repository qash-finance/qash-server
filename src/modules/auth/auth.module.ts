import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../../database/prisma.module';
import { MailModule } from '../mail/mail.module';
import { AppConfigService } from '../shared/config/config.service';
import { CompanyModule } from '../company/company.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OtpService } from './services/otp.service';
import { JwtAuthService } from './services/jwt.service';
import { AuthCleanupService } from './services/cleanup.service';
import { UserRepository } from './repositories/user.repository';
import { OtpRepository } from './repositories/otp.repository';
import { UserSessionRepository } from './repositories/user-session.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CompanyAuthGuard } from './guards/company-auth.guard';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    forwardRef(() => CompanyModule), // Use forwardRef to avoid circular dependency
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (appConfigService: AppConfigService) => ({
        secret: appConfigService.jwtConfig.secret,
        signOptions: {
          expiresIn: '15m', // Default expiry for access tokens
        },
      }),
      inject: [AppConfigService],
    }),
  ],
  providers: [
    // Services
    AuthService,
    OtpService,
    JwtAuthService,
    AuthCleanupService,

    // Repositories
    UserRepository,
    OtpRepository,
    UserSessionRepository,

    // Auth Strategy & Guards
    JwtStrategy,
    CompanyAuthGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [
    // Services
    AuthService,
    OtpService,
    JwtAuthService,

    // Repositories (in case other modules need them)
    UserRepository,
    OtpRepository,
    UserSessionRepository,

    // JWT & Passport
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
