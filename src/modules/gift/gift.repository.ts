import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Gift, Prisma, GiftStatusEnum } from '@prisma/client';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class GiftRepository extends BaseRepository<
  Gift,
  Prisma.GiftWhereInput,
  Prisma.GiftCreateInput,
  Prisma.GiftUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel() {
    return this.prisma.gift;
  }

  /**
   * Find gift by secret hash
   */
  async findBySecretHash(secretHash: string): Promise<Gift | null> {
    return this.findOne({ secretHash });
  }

  /**
   * Find gifts by sender address
   */
  async findBySender(
    senderAddress: string,
    options?: { skip?: number; take?: number },
  ): Promise<Gift[]> {
    return this.findMany(
      { sender: senderAddress },
      {
        orderBy: { createdAt: 'desc' },
        ...options,
      },
    );
  }

  /**
   * Find recallable gifts by sender
   */
  async findRecallableBySender(senderAddress: string): Promise<Gift[]> {
    const now = new Date();
    return this.findMany(
      {
        sender: senderAddress,
        recallable: true,
        status: GiftStatusEnum.PENDING,
        OR: [{ recallableTime: null }, { recallableTime: { lte: now } }],
      },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Find recalled gifts by sender
   */
  async findRecalledBySender(senderAddress: string): Promise<Gift[]> {
    return this.findMany(
      {
        sender: senderAddress,
        status: GiftStatusEnum.RECALLED,
      },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Update gift status
   */
  async updateStatus(
    where: Prisma.GiftWhereInput,
    status: GiftStatusEnum,
    additionalData?: Partial<Gift>,
  ): Promise<Gift> {
    return this.update(where, {
      status,
      ...additionalData,
    });
  }
}
