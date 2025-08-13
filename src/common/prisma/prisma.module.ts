import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AppConfigService } from '../config/services/config.service';

@Global()
@Module({
  providers: [PrismaService, AppConfigService],
  exports: [PrismaService, AppConfigService],
})
export class PrismaModule {}


