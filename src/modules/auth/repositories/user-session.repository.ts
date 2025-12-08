import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UserSessionModel } from '../../../database/generated/models/UserSession';

export interface CreateSessionData {
  id: string;
  userId: number;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

export interface UpdateSessionData {
  isActive?: boolean;
  userAgent?: string;
  ipAddress?: string;
  expiresAt?: Date;
}

export interface SessionWithUser extends UserSessionModel {
  user: {
    id: number;
    email: string;
    isActive: boolean;
  };
}

@Injectable()
export class UserSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create new session
   */
  async create(data: CreateSessionData): Promise<UserSessionModel> {
    return this.prisma.userSession.create({
      data,
    });
  }

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<UserSessionModel | null> {
    return this.prisma.userSession.findUnique({
      where: { id },
    });
  }

  /**
   * Find session by refresh token
   */
  async findByRefreshToken(
    refreshToken: string,
  ): Promise<UserSessionModel | null> {
    return this.prisma.userSession.findUnique({
      where: { refreshToken },
    });
  }

  /**
   * Find active session by ID and token with user
   */
  async findActiveSessionWithUser(
    id: string,
    refreshToken: string,
  ): Promise<SessionWithUser | null> {
    return this.prisma.userSession.findUnique({
      where: {
        id,
        refreshToken,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
      },
    }) as Promise<SessionWithUser | null>;
  }

  /**
   * Update session by ID
   */
  async updateById(
    id: string,
    data: UpdateSessionData,
  ): Promise<UserSessionModel> {
    return this.prisma.userSession.update({
      where: { id },
      data,
    });
  }

  /**
   * Deactivate session
   */
  async deactivate(id: string): Promise<UserSessionModel> {
    return this.prisma.userSession.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Deactivate all sessions for user
   */
  async deactivateAllForUser(userId: number): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessionsForUser(userId: number) {
    return this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Check if session is valid
   */
  async isValidSession(id: string, refreshToken: string): Promise<boolean> {
    const session = await this.prisma.userSession.findUnique({
      where: {
        id,
        refreshToken,
        isActive: true,
      },
      select: {
        expiresAt: true,
      },
    });

    return session ? session.expiresAt > new Date() : false;
  }

  /**
   * Clean up expired and inactive sessions
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.userSession.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isActive: false }],
      },
    });

    return result.count;
  }

  /**
   * Get session statistics for monitoring
   */
  async getStats() {
    const [total, active, expired, inactive] = await Promise.all([
      this.prisma.userSession.count(),
      this.prisma.userSession.count({
        where: {
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.userSession.count({
        where: {
          isActive: true,
          expiresAt: { lt: new Date() },
        },
      }),
      this.prisma.userSession.count({
        where: { isActive: false },
      }),
    ]);

    return {
      total,
      active,
      expired,
      inactive,
    };
  }

  /**
   * Get sessions by user with pagination
   */
  async getSessionsByUser(
    userId: number,
    options: {
      skip?: number;
      take?: number;
      includeInactive?: boolean;
    } = {},
  ) {
    const { skip = 0, take = 10, includeInactive = false } = options;

    const whereClause: any = { userId };
    if (!includeInactive) {
      whereClause.isActive = true;
      whereClause.expiresAt = { gt: new Date() };
    }

    return this.prisma.userSession.findMany({
      where: whereClause,
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        isActive: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });
  }
}
