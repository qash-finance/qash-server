import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  WalletAuthChallenges,
  WalletAuthKeys,
  WalletAuthSessions,
  Prisma,
  WalletAuthKeysStatusEnum,
} from '@prisma/client';
import { BaseRepository } from '../../database/base.repository';

@Injectable()
export class WalletAuthChallengeRepository extends BaseRepository<
  WalletAuthChallenges,
  Prisma.WalletAuthChallengesWhereInput,
  Prisma.WalletAuthChallengesCreateInput,
  Prisma.WalletAuthChallengesUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel() {
    return this.prisma.walletAuthChallenges;
  }

  /**
   * Find challenge by challenge code
   */
  async findByChallengeCode(
    challengeCode: string,
  ): Promise<WalletAuthChallenges | null> {
    return this.findOne({ challengeCode });
  }

  /**
   * Delete expired challenges
   */
  async deleteExpiredChallenges(expiryTime: Date): Promise<{ count: number }> {
    return this.deleteMany({
      createdAt: {
        lt: expiryTime,
      },
    });
  }

  /**
   * Delete challenges by wallet address
   */
  async deleteByChallengeCode(
    challengeCode: string,
  ): Promise<WalletAuthChallenges> {
    return this.delete({ challengeCode });
  }
}

@Injectable()
export class WalletAuthKeyRepository extends BaseRepository<
  WalletAuthKeys,
  Prisma.WalletAuthKeysWhereInput,
  Prisma.WalletAuthKeysCreateInput,
  Prisma.WalletAuthKeysUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel() {
    return this.prisma.walletAuthKeys;
  }

  /**
   * Find keys by wallet address
   */
  async findByWalletAddress(walletAddress: string): Promise<WalletAuthKeys[]> {
    return this.findMany(
      { walletAddress },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Find active keys by wallet address
   */
  async findActiveByWalletAddress(
    walletAddress: string,
  ): Promise<WalletAuthKeys[]> {
    return this.findMany(
      {
        walletAddress,
        status: WalletAuthKeysStatusEnum.ACTIVE,
      },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Find key by ID and wallet address
   */
  async findByIdAndWallet(
    keyId: number,
    walletAddress: string,
  ): Promise<WalletAuthKeys | null> {
    return this.findOne({ id: keyId, walletAddress });
  }

  /**
   * Find key by public key hash
   */
  async findByPublicKey(publicKey: string): Promise<WalletAuthKeys | null> {
    return this.findOne({ publicKey });
  }

  /**
   * Count active keys for wallet
   */
  async countActiveByWallet(walletAddress: string): Promise<number> {
    return this.count({
      walletAddress,
      status: WalletAuthKeysStatusEnum.ACTIVE,
    });
  }

  /**
   * Update key status
   */
  async updateStatus(
    keyId: number,
    status: WalletAuthKeysStatusEnum,
  ): Promise<WalletAuthKeys> {
    return this.update({ id: keyId }, { status });
  }

  /**
   * Delete expired keys
   */
  async deleteExpiredKeys(expiryTime: Date): Promise<{ count: number }> {
    return this.deleteMany({
      expiresAt: {
        lt: expiryTime,
      },
    });
  }
}

@Injectable()
export class WalletAuthSessionRepository extends BaseRepository<
  WalletAuthSessions,
  Prisma.WalletAuthSessionsWhereInput,
  Prisma.WalletAuthSessionsCreateInput,
  Prisma.WalletAuthSessionsUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel() {
    return this.prisma.walletAuthSessions;
  }

  /**
   * Find sessions by key ID
   */
  async findByAuthKeyId(authKeyId: number): Promise<WalletAuthSessions[]> {
    return this.findMany(
      { authKeyId },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Find session by session token
   */
  async findBySessionToken(
    sessionToken: string,
  ): Promise<WalletAuthSessions | null> {
    return this.findOne({ sessionToken });
  }

  /**
   * Find session by refresh token
   */
  async findByWalletAddress(
    walletAddress: string,
  ): Promise<WalletAuthSessions[]> {
    return this.findMany({ walletAddress });
  }

  /**
   * Count active sessions for key
   */
  async countByAuthKeyId(authKeyId: number): Promise<number> {
    return this.count({ authKeyId });
  }

  /**
   * Update session tokens
   */
  async updateSession(
    sessionId: number,
    sessionToken: string,
    expiresAt: Date,
  ): Promise<WalletAuthSessions> {
    return this.update(
      { id: sessionId },
      {
        sessionToken,
        expiresAt,
      },
    );
  }

  /**
   * Delete expired sessions
   */
  async deleteExpiredSessions(expiryTime: Date): Promise<{ count: number }> {
    return this.deleteMany({
      expiresAt: {
        lt: expiryTime,
      },
    });
  }

  /**
   * Delete sessions by key ID
   */
  async deleteByAuthKeyId(authKeyId: number): Promise<{ count: number }> {
    return this.deleteMany({ authKeyId });
  }

  /**
   * Delete session by session token
   */
  async deleteBySessionToken(
    sessionToken: string,
  ): Promise<WalletAuthSessions> {
    return this.delete({ sessionToken });
  }

  /**
   * Get session statistics for wallet
   */
  async getWalletSessionStats(walletAddress: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalKeys: number;
    activeKeys: number;
  }> {
    const [sessionStats, keyStats] = await Promise.all([
      this.prisma.walletAuthSessions.groupBy({
        by: ['authKeyId'],
        where: {
          walletAddress,
        },
        _count: { authKeyId: true },
      }),
      this.prisma.walletAuthKeys.groupBy({
        by: ['status'],
        where: { walletAddress },
        _count: { status: true },
      }),
    ]);

    const totalSessions = sessionStats.reduce(
      (sum, stat) => sum + stat._count.authKeyId,
      0,
    );
    const activeSessions = await this.prisma.walletAuthSessions.count({
      where: {
        walletAddress,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    let totalKeys = 0;
    let activeKeys = 0;
    keyStats.forEach((stat) => {
      totalKeys += stat._count.status;
      if (stat.status === WalletAuthKeysStatusEnum.ACTIVE) {
        activeKeys = stat._count.status;
      }
    });

    return {
      totalSessions,
      activeSessions,
      totalKeys,
      activeKeys,
    };
  }
}
