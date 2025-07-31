import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsObject,
  IsArray,
} from 'class-validator';
import { AnalyticsEventType } from './analytics.entity';

export class TrackEventDto {
  @ApiProperty({ enum: AnalyticsEventType })
  @IsEnum(AnalyticsEventType)
  eventType: AnalyticsEventType;

  @ApiPropertyOptional({ description: 'User wallet address' })
  @IsOptional()
  @IsString()
  userAddress?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Event metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class TrackPageViewDto {
  @ApiProperty({ description: 'Page URL or route' })
  @IsString()
  page: string;

  @ApiPropertyOptional({ description: 'User wallet address' })
  @IsOptional()
  @IsString()
  userAddress?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Time spent on page in seconds' })
  @IsOptional()
  @IsNumber()
  timeSpent?: number;
}

export class StartSessionDto {
  @ApiPropertyOptional({ description: 'User wallet address' })
  @IsOptional()
  @IsString()
  userAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Referer URL' })
  @IsOptional()
  @IsString()
  referer?: string;
}

export class EndSessionDto {
  @ApiProperty({ description: 'Session ID to end' })
  @IsString()
  sessionId: string;
}

export class TrackTransactionDto {
  @ApiProperty({ description: 'Transaction type' })
  @IsString()
  transactionType: string;

  @ApiProperty({ description: 'Token address or symbol' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Transaction amount' })
  @IsString()
  amount: string;

  @ApiProperty({ description: 'Sender address' })
  @IsString()
  senderAddress: string;

  @ApiPropertyOptional({ description: 'Receiver address' })
  @IsOptional()
  @IsString()
  receiverAddress?: string;

  @ApiPropertyOptional({ description: 'Transaction status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Entity ID reference' })
  @IsOptional()
  @IsNumber()
  entityId?: number;

  @ApiPropertyOptional({ description: 'Additional data' })
  @IsOptional()
  @IsObject()
  additionalData?: Record<string, any>;
}

export class GenerateReportDto {
  @ApiProperty({ description: 'Start date for report' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date for report' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Report type',
    enum: ['daily', 'weekly', 'monthly'],
  })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  reportType?: 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({ description: 'Metrics to include' })
  @IsOptional()
  @IsArray()
  metrics?: string[];

  @ApiPropertyOptional({
    description: 'Export format',
    enum: ['json', 'csv', 'xlsx'],
  })
  @IsOptional()
  @IsEnum(['json', 'csv', 'xlsx'])
  format?: 'json' | 'csv' | 'xlsx';
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Start date for query' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for query' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'User address filter' })
  @IsOptional()
  @IsString()
  userAddress?: string;

  @ApiPropertyOptional({ description: 'Event type filter' })
  @IsOptional()
  @IsEnum(AnalyticsEventType)
  eventType?: AnalyticsEventType;

  @ApiPropertyOptional({ description: 'Group by field' })
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination' })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export interface AnalyticsReport {
  summary: {
    totalUsers: number;
    dailyActiveUsers: number;
    monthlyActiveUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    totalPageViews: number;
    totalApiCalls: number;
    totalTransactions: number;
    totalVolume: Record<string, string>; // token -> amount
  };
  userMetrics: {
    newUsers: number;
    returningUsers: number;
    userRetentionRate: number;
    avgTimeSpentPerUser: number;
  };
  endpointMetrics: {
    mostUsedEndpoints: Array<{
      endpoint: string;
      method: string;
      callCount: number;
      avgResponseTime: number;
      errorRate: number;
    }>;
    slowestEndpoints: Array<{
      endpoint: string;
      method: string;
      avgResponseTime: number;
    }>;
  };
  transactionMetrics: {
    volumeByToken: Record<
      string,
      {
        amount: string;
        count: number;
      }
    >;
    transactionsByType: Record<string, number>;
    dailyVolume: Array<{
      date: string;
      volume: Record<string, string>;
      count: number;
    }>;
  };
  timeSeriesData: Array<{
    date: string;
    activeUsers: number;
    pageViews: number;
    apiCalls: number;
    transactions: number;
  }>;
}
