import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UserSessionModel } from '../../../database/generated/models/UserSession';
import {
  BaseRepository,
  PrismaTransactionClient,
} from 'src/database/base.repository';
import { Prisma, PrismaClient } from 'src/database/generated/client';

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
export class UserSessionRepository extends BaseRepository<
  UserSessionModel,
  Prisma.UserSessionWhereInput,
  Prisma.UserSessionCreateInput,
  Prisma.UserSessionUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel(
    tx?: PrismaTransactionClient,
  ): PrismaClient['userSession'] {
    return tx ? tx.userSession : this.prisma.userSession;
  }

  protected getModelName(): string {
    return 'UserSession';
  }

  /**
   * Find session by ID
   */
  async findById(
    id: string,
    tx?: PrismaTransactionClient,
  ): Promise<UserSessionModel | null> {
    return this.findOne({ id }, tx);
  }

  /**
   * Find session by refresh token
   */
  async findByRefreshToken(
    refreshToken: string,
    tx?: PrismaTransactionClient,
  ): Promise<UserSessionModel | null> {
    const model = this.getModel(tx);
    return model.findUnique({
      where: { refreshToken },
    });
  }

  /**
   * Find active session by ID and token with user
   */
  async findActiveSessionWithUser(
    id: string,
    refreshToken: string,
    tx?: PrismaTransactionClient,
  ): Promise<SessionWithUser | null> {
    const model = this.getModel(tx);
    return model.findUnique({
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
    tx?: PrismaTransactionClient,
  ): Promise<UserSessionModel> {
    const model = this.getModel(tx);
    return model.update({
      where: { id },
      data,
    });
  }

  /**
   * Deactivate session
   */
  async deactivate(
    id: string,
    tx?: PrismaTransactionClient,
  ): Promise<UserSessionModel> {
    const model = this.getModel(tx);
    return model.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Deactivate all sessions for user
   */
  async deactivateAllForUser(
    userId: number,
    tx?: PrismaTransactionClient,
  ): Promise<void> {
    const model = this.getModel(tx);
    await model.updateMany({
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
  async getActiveSessionsForUser(userId: number, tx?: PrismaTransactionClient) {
    const model = this.getModel(tx);
    return model.findMany({
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
  async isValidSession(
    id: string,
    refreshToken: string,
    tx?: PrismaTransactionClient,
  ): Promise<boolean> {
    const model = this.getModel(tx);
    const session = await model.findUnique({
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
  async cleanupExpired(tx?: PrismaTransactionClient): Promise<number> {
    const model = this.getModel(tx);
    const result = await model.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isActive: false }],
      },
    });

    return result.count;
  }

  /**
   * Get session statistics for monitoring
   */
  async getStats(tx?: PrismaTransactionClient) {
    const model = this.getModel(tx);
    const [total, active, expired, inactive] = await Promise.all([
      model.count(),
      model.count({
        where: {
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      }),
      model.count({
        where: {
          isActive: true,
          expiresAt: { lt: new Date() },
        },
      }),
      model.count({
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
    tx?: PrismaTransactionClient,
  ) {
    const model = this.getModel(tx);
    const { skip = 0, take = 10, includeInactive = false } = options;

    const whereClause: any = { userId };
    if (!includeInactive) {
      whereClause.isActive = true;
      whereClause.expiresAt = { gt: new Date() };
    }

    return model.findMany({
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
