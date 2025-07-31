import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AnalyticsEventEntity,
  AnalyticsUserSessionEntity,
  AnalyticsEndpointStatsEntity,
  AnalyticsTransactionStatsEntity,
  AnalyticsEventType,
} from './analytics.entity';
import { AnalyticsQueryDto } from './analytics.dto';

@Injectable()
export class AnalyticsRepository {
  constructor(
    @InjectRepository(AnalyticsEventEntity)
    private readonly eventRepository: Repository<AnalyticsEventEntity>,
    @InjectRepository(AnalyticsUserSessionEntity)
    private readonly sessionRepository: Repository<AnalyticsUserSessionEntity>,
    @InjectRepository(AnalyticsEndpointStatsEntity)
    private readonly endpointStatsRepository: Repository<AnalyticsEndpointStatsEntity>,
    @InjectRepository(AnalyticsTransactionStatsEntity)
    private readonly transactionStatsRepository: Repository<AnalyticsTransactionStatsEntity>,
  ) {}

  // Event tracking methods
  async createEvent(
    eventData: Partial<AnalyticsEventEntity>,
  ): Promise<AnalyticsEventEntity> {
    const event = this.eventRepository.create(eventData);
    return this.eventRepository.save(event);
  }

  async getEvents(query: AnalyticsQueryDto): Promise<AnalyticsEventEntity[]> {
    const queryBuilder = this.eventRepository.createQueryBuilder('event');

    if (query.startDate) {
      queryBuilder.andWhere('event.createdAt >= :startDate', {
        startDate: query.startDate,
      });
    }
    if (query.endDate) {
      queryBuilder.andWhere('event.createdAt <= :endDate', {
        endDate: query.endDate,
      });
    }
    if (query.userAddress) {
      queryBuilder.andWhere('event.userAddress = :userAddress', {
        userAddress: query.userAddress,
      });
    }
    if (query.eventType) {
      queryBuilder.andWhere('event.eventType = :eventType', {
        eventType: query.eventType,
      });
    }

    queryBuilder.orderBy('event.createdAt', 'DESC');

    if (query.limit) {
      queryBuilder.limit(query.limit);
    }
    if (query.page && query.limit) {
      queryBuilder.offset((query.page - 1) * query.limit);
    }

    return queryBuilder.getMany();
  }

  // Session management methods
  async createSession(
    sessionData: Partial<AnalyticsUserSessionEntity>,
  ): Promise<AnalyticsUserSessionEntity> {
    const session = this.sessionRepository.create(sessionData);
    return this.sessionRepository.save(session);
  }

  async updateSession(
    sessionId: string,
    updateData: Partial<AnalyticsUserSessionEntity>,
  ): Promise<void> {
    await this.sessionRepository.update({ sessionId }, updateData);
  }

  async getSession(
    sessionId: string,
  ): Promise<AnalyticsUserSessionEntity | null> {
    return this.sessionRepository.findOne({ where: { sessionId } });
  }

  async getActiveSessions(
    userAddress?: string,
  ): Promise<AnalyticsUserSessionEntity[]> {
    const query = this.sessionRepository
      .createQueryBuilder('session')
      .where('session.isActive = :isActive', { isActive: true });

    if (userAddress) {
      query.andWhere('session.userAddress = :userAddress', { userAddress });
    }

    return query.getMany();
  }

  // Endpoint stats methods
  async createEndpointStat(
    statData: Partial<AnalyticsEndpointStatsEntity>,
  ): Promise<AnalyticsEndpointStatsEntity> {
    const stat = this.endpointStatsRepository.create(statData);
    return this.endpointStatsRepository.save(stat);
  }

  async getEndpointStats(startDate: Date, endDate: Date): Promise<any[]> {
    return this.endpointStatsRepository
      .createQueryBuilder('stats')
      .select([
        'stats.endpoint',
        'stats.method',
        'COUNT(*) as callCount',
        'AVG(stats.responseTime) as avgResponseTime',
        'SUM(CASE WHEN stats.statusCode >= 400 THEN 1 ELSE 0 END) as errorCount',
      ])
      .where('stats.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('stats.endpoint, stats.method')
      .orderBy('callCount', 'DESC')
      .getRawMany();
  }

  // Transaction stats methods
  async createTransactionStat(
    statData: Partial<AnalyticsTransactionStatsEntity>,
  ): Promise<AnalyticsTransactionStatsEntity> {
    const stat = this.transactionStatsRepository.create(statData);
    return this.transactionStatsRepository.save(stat);
  }

  async getTransactionStats(startDate: Date, endDate: Date): Promise<any[]> {
    return this.transactionStatsRepository
      .createQueryBuilder('stats')
      .select([
        'stats.token',
        'stats.transactionType',
        'SUM(CAST(stats.amount AS DECIMAL)) as totalAmount',
        'COUNT(*) as transactionCount',
      ])
      .where('stats.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('stats.token, stats.transactionType')
      .getRawMany();
  }

  // Analytics aggregation methods
  async getDailyActiveUsers(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder('session')
      .select('COUNT(DISTINCT session.userAddress)', 'count')
      .where('session.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('session.userAddress IS NOT NULL')
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  async getMonthlyActiveUsers(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder('session')
      .select('COUNT(DISTINCT session.userAddress)', 'count')
      .where('session.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('session.userAddress IS NOT NULL')
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  async getAverageSessionDuration(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder('session')
      .select('AVG(session.duration)', 'avgDuration')
      .where('session.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('session.duration > 0')
      .getRawOne();

    return parseFloat(result.avgDuration) || 0;
  }

  async getTotalPageViews(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.eventRepository
      .createQueryBuilder('event')
      .select('COUNT(*)', 'count')
      .where('event.eventType = :eventType', {
        eventType: AnalyticsEventType.PAGE_VIEW,
      })
      .andWhere('event.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  async getTotalApiCalls(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.endpointStatsRepository
      .createQueryBuilder('stats')
      .select('COUNT(*)', 'count')
      .where('stats.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  async getTimeSeriesData(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'hour' = 'day',
  ): Promise<any[]> {
    const dateFormat =
      groupBy === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH24:00:00';

    return this.sessionRepository
      .createQueryBuilder('session')
      .select([
        `TO_CHAR(session.createdAt, '${dateFormat}') as date`,
        'COUNT(DISTINCT session.userAddress) as activeUsers',
        'SUM(session.pageViews) as pageViews',
        'SUM(session.apiCalls) as apiCalls',
      ])
      .where('session.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy(`TO_CHAR(session.createdAt, '${dateFormat}')`)
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  // User retention and engagement methods
  async getNewUsers(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder('session')
      .select('COUNT(DISTINCT session.userAddress)', 'count')
      .where('session.userAddress IS NOT NULL')
      .andWhere(
        'session.userAddress NOT IN (SELECT DISTINCT s2.userAddress FROM analytics_user_sessions s2 WHERE s2.createdAt < :startDate AND s2.userAddress IS NOT NULL)',
        { startDate },
      )
      .andWhere('session.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  async getReturningUsers(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder('session')
      .select('COUNT(DISTINCT session.userAddress)', 'count')
      .where('session.userAddress IS NOT NULL')
      .andWhere(
        'session.userAddress IN (SELECT DISTINCT s2.userAddress FROM analytics_user_sessions s2 WHERE s2.createdAt < :startDate AND s2.userAddress IS NOT NULL)',
        { startDate },
      )
      .andWhere('session.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return parseInt(result.count) || 0;
  }
}
