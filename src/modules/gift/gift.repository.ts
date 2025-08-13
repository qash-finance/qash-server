import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Gift, Prisma } from '@prisma/client';

@Injectable()
export class GiftRepository {
  private readonly logger = new Logger(GiftRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async create(dto: Prisma.GiftCreateInput): Promise<Gift> {
    try {
      const now = new Date();
      const row = await this.prisma.gift.create({
        data: {
          createdAt: now,
          updatedAt: now,
          ...dto,
        },
      });
      return row;
    } catch (error) {
      this.logger.error('Error creating gift:', error);
      throw error;
    }
  }

  public async updateOne(
    where: Prisma.GiftWhereInput,
    dto: Partial<Gift>,
  ): Promise<Gift> {
    try {
      const existing = await this.prisma.gift.findFirst({ where });
      if (!existing) {
        this.logger.warn('Gift not found for update:', where);
        throw new Error('Gift not found');
      }
      const row = await this.prisma.gift.update({
        where: { id: existing.id },
        data: { ...dto, updatedAt: new Date() },
      });
      return row;
    } catch (error) {
      this.logger.error('Error updating gift:', error);
      throw error;
    }
  }

  async findOne(where: Prisma.GiftWhereInput): Promise<Gift | null> {
    try {
      return await this.prisma.gift.findFirst({ where });
    } catch (error) {
      this.logger.error('Error finding gift:', error);
      throw error;
    }
  }

  public find(
    where: Prisma.GiftWhereInput,
    options?: Prisma.GiftFindManyArgs,
  ): Promise<Gift[]> {
    try {
      return this.prisma.gift.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: options?.skip,
        take: options?.take,
      });
    } catch (error) {
      this.logger.error('Error finding gifts:', error);
      throw error;
    }
  }
}
