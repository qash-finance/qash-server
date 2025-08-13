import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsQueryDto } from './analytics.dto';
import { AnalyticsEventType } from './analytics.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Event tracking methods
  async createEvent(eventData: {
    eventType: AnalyticsEventType;
    userAddress?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
  }): Promise<void> {
    const now = new Date();
    await this.prisma.analyticsEvents.create({
      data: {
        createdAt: now,
        updatedAt: now,
        eventType: eventData.eventType as any,
        userAddress: eventData.userAddress ?? null,
        sessionId: eventData.sessionId ?? null,
        metadata: (eventData.metadata as Prisma.InputJsonValue) ?? null,
        ipAddress: eventData.ipAddress ?? null,
        userAgent: eventData.userAgent ?? null,
        referer: eventData.referer ?? null,
      },
    });
  }

  async getEvents(query: AnalyticsQueryDto) {
    const where: Prisma.AnalyticsEventsWhereInput = {};
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) (where.createdAt as any).gte = new Date(query.startDate);
      if (query.endDate) (where.createdAt as any).lte = new Date(query.endDate);
    }
    if (query.userAddress) where.userAddress = query.userAddress;
    if (query.eventType) where.eventType = query.eventType as any;

    const rows = await this.prisma.analyticsEvents.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: query.page && query.limit ? (query.page - 1) * query.limit : undefined,
    });
    return rows;
  }

  // Session management methods
  async createSession(sessionData: {
    sessionId: string;
    userAddress?: string;
    startTime: Date;
    endTime?: Date | null;
    duration?: number;
    pageViews?: number;
    apiCalls?: number;
    ipAddress?: string;
    userAgent?: string;
    isActive?: boolean;
  }) {
    const now = new Date();
    await this.prisma.analyticsUserSessions.create({
      data: {
        createdAt: now,
        updatedAt: now,
        sessionId: sessionData.sessionId,
        userAddress: sessionData.userAddress ?? null,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime ?? null,
        duration: sessionData.duration ?? 0,
        pageViews: sessionData.pageViews ?? 0,
        apiCalls: sessionData.apiCalls ?? 0,
        ipAddress: sessionData.ipAddress ?? null,
        userAgent: sessionData.userAgent ?? null,
        isActive: sessionData.isActive ?? true,
      },
    });
  }

  async updateSession(sessionId: string, updateData: any): Promise<void> {
    const data: Prisma.AnalyticsUserSessionsUpdateInput = {
      updatedAt: new Date(),
    };
    if (updateData.endTime !== undefined) data.endTime = updateData.endTime;
    if (updateData.duration !== undefined) data.duration = updateData.duration;
      if (updateData.isActive !== undefined) data.isActive = updateData.isActive;
    if (updateData.pageViews !== undefined) data.pageViews = updateData.pageViews;
    if (updateData.apiCalls !== undefined) data.apiCalls = updateData.apiCalls;
    if (updateData.userAddress !== undefined) data.userAddress = updateData.userAddress;

    await this.prisma.analyticsUserSessions.update({
      where: { sessionId },
      data,
    });
  }

  async getSession(sessionId: string) {
    return this.prisma.analyticsUserSessions.findUnique({
      where: { sessionId },
    });
  }

  async getActiveSessions(userAddress?: string) {
    return this.prisma.analyticsUserSessions.findMany({
      where: { isActive: true, ...(userAddress ? { userAddress } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Endpoint stats methods
  async createEndpointStat(statData: {
    endpoint: string;
    method: string;
    responseTime: number;
    statusCode: number;
    userAddress?: string;
    sessionId?: string;
    ipAddress?: string;
    errorDetails?: Record<string, any> | null;
  }) {
    const now = new Date();
    await this.prisma.analyticsEndpointStats.create({
      data: {
        createdAt: now,
        updatedAt: now,
        endpoint: statData.endpoint,
        method: statData.method,
        responseTime: statData.responseTime,
        statusCode: statData.statusCode,
        userAddress: statData.userAddress ?? null,
        sessionId: statData.sessionId ?? null,
        ipAddress: statData.ipAddress ?? null,
        errorDetails: (statData.errorDetails as Prisma.InputJsonValue) ?? null,
      },
    });
  }

  async getEndpointStats(startDate: Date, endDate: Date): Promise<any[]> {
    const rows: Array<{
      endpoint: string;
      method: string;
      callcount: string;
      avgresponsetime: string;
      errorcount: string;
    }> = await this.prisma.$queryRaw`
      SELECT endpoint, method,
             COUNT(*) AS callCount,
             AVG(responseTime) AS avgResponseTime,
             SUM(CASE WHEN statusCode >= 400 THEN 1 ELSE 0 END) AS errorCount
      FROM analyticsEndpointStats
      WHERE createdAt BETWEEN ${startDate} AND ${endDate}
      GROUP BY endpoint, method
      ORDER BY callCount DESC
    ` as any;
    return rows.map(r => ({
      endpoint: r.endpoint,
      method: r.method,
      callCount: Number(r.callcount),
      avgResponseTime: Number(r.avgresponsetime),
      errorCount: Number(r.errorcount),
    }));
  }

  // Transaction stats methods
  async createTransactionStat(statData: {
    transactionType: string;
    token: string;
    amount: string;
    senderAddress: string;
    receiverAddress?: string | null;
    status?: string | null;
    entityId?: number | null;
    additionalData?: Record<string, any> | null;
  }) {
    const now = new Date();
    await this.prisma.analyticsTransactionStats.create({
      data: {
        createdAt: now,
        updatedAt: now,
        transactionType: statData.transactionType,
        token: statData.token,
        amount: new Prisma.Decimal(statData.amount),
        senderAddress: statData.senderAddress,
        receiverAddress: statData.receiverAddress ?? null,
        status: statData.status ?? null,
        entityId: statData.entityId ?? null,
        additionalData: (statData.additionalData as Prisma.InputJsonValue) ?? null,
      },
    });
  }

  async getTransactionStats(startDate: Date, endDate: Date): Promise<any[]> {
    const rows: Array<{
      token: string;
      transactiontype: string;
      totalamount: string;
      transactioncount: string;
    }> = await this.prisma.$queryRaw`
      SELECT token, transactionType,
             SUM(CAST(amount AS DECIMAL)) as totalAmount,
             COUNT(*) as transactionCount
      FROM analyticsTransactionStats
      WHERE createdAt BETWEEN ${startDate} AND ${endDate}
      GROUP BY token, transactionType
    ` as any;
    return rows.map(r => ({
      token: r.token,
      transactionType: (r as any).transactionType ?? r.transactiontype,
      totalAmount: String((r as any).totalAmount ?? r.totalamount),
      transactionCount: String((r as any).transactionCount ?? r.transactioncount),
    }));
  }

  // Analytics aggregation methods
  async getDailyActiveUsers(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT userAddress) as count
      FROM analyticsUserSessions
      WHERE createdAt BETWEEN ${startDate} AND ${endDate}
        AND userAddress IS NOT NULL
    `;
    const count = result?.[0]?.count ?? 0n;
    return Number(count);
  }

  async getMonthlyActiveUsers(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT userAddress) as count
      FROM analyticsUserSessions
      WHERE createdAt BETWEEN ${startDate} AND ${endDate}
        AND userAddress IS NOT NULL
    `;
    const count = result?.[0]?.count ?? 0n;
    return Number(count);
  }

  async getAverageSessionDuration(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.$queryRaw<{ avgduration: number }[]>`
      SELECT AVG(duration) as avgDuration
      FROM analyticsUserSessions
      WHERE createdAt BETWEEN ${startDate} AND ${endDate}
        AND duration > 0
    `;
    const avg = (result?.[0] as any)?.avgDuration ?? result?.[0]?.avgduration ?? 0;
    return Number(avg) || 0;
  }

  async getTotalPageViews(startDate: Date, endDate: Date): Promise<number> {
    const count = await this.prisma.analyticsEvents.count({
      where: {
        eventType: AnalyticsEventType.PAGE_VIEW as any,
        createdAt: { gte: startDate, lte: endDate },
      },
    });
    return count;
  }

  async getTotalApiCalls(startDate: Date, endDate: Date): Promise<number> {
    const count = await this.prisma.analyticsEndpointStats.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    });
    return count;
  }

  async getTimeSeriesData(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'hour' = 'day',
  ): Promise<any[]> {
    const dateFormat = groupBy === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH24:00:00';
    const rows: Array<{ date: string; activeusers: string; pageviews: string; apicalls: string }>= await this.prisma.$queryRaw`
      SELECT TO_CHAR(createdAt, ${dateFormat}) as date,
             COUNT(DISTINCT userAddress) as activeUsers,
             SUM(pageViews) as pageViews,
             SUM(apiCalls) as apiCalls
      FROM analyticsUserSessions
        WHERE createdAt BETWEEN ${startDate} AND ${endDate}
      GROUP BY TO_CHAR(createdAt, ${dateFormat})
      ORDER BY date ASC
    ` as any;
    return rows.map(r => ({
      date: r.date,
      activeUsers: Number((r as any).activeUsers ?? r.activeusers ?? 0),
      pageViews: Number((r as any).pageViews ?? r.pageviews ?? 0),
      apiCalls: Number((r as any).apiCalls ?? r.apicalls ?? 0),
    }));
  }

  // User retention and engagement methods
  async getNewUsers(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT s.userAddress) as count
      FROM analyticsUserSessions s
      WHERE s.userAddress IS NOT NULL
        AND s.userAddress NOT IN (
          SELECT DISTINCT s2.userAddress
          FROM analyticsUserSessions s2
          WHERE s2.createdAt < ${startDate} AND s2.userAddress IS NOT NULL
        )
        AND s.createdAt BETWEEN ${startDate} AND ${endDate}
    `;
    const count = result?.[0]?.count ?? 0n;
    return Number(count);
  }

  async getReturningUsers(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT s.userAddress) as count
      FROM analyticsUserSessions s
      WHERE s.userAddress IS NOT NULL
        AND s.userAddress IN (
          SELECT DISTINCT s2.userAddress
          FROM analyticsUserSessions s2
          WHERE s2.createdAt < ${startDate} AND s2.userAddress IS NOT NULL
        )
        AND s.createdAt BETWEEN ${startDate} AND ${endDate}
    `;
    const count = result?.[0]?.count ?? 0n;
    return Number(count);
  }
}
