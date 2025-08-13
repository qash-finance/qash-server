import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  providers: [AnalyticsRepository, AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
