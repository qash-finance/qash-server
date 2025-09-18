import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  SchedulePayment,
  Prisma,
  SchedulePaymentStatusEnum,
  SchedulePaymentFrequencyEnum,
} from '@prisma/client';
import { BaseRepository } from '../../database/base.repository';

@Injectable()
export class SchedulePaymentRepository extends BaseRepository<
  SchedulePayment,
  Prisma.SchedulePaymentWhereInput,
  Prisma.SchedulePaymentCreateInput,
  Prisma.SchedulePaymentUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel() {
    return this.prisma.schedulePayment;
  }

  /**
   * Create schedule payment with transaction connections
   */
  async createWithTransactions(
    data: Omit<Prisma.SchedulePaymentCreateInput, 'transactions'>,
    transactionIds: number[],
  ): Promise<SchedulePayment> {
    const now = new Date();
    return this.getModel().create({
      data: {
        ...data,
        createdAt: now,
        updatedAt: now,
        transactions: {
          connect: transactionIds.map((id) => ({ id })),
        },
      },
    });
  }

  /**
   * Find schedule payments for a user (payer or payee)
   */
  async findByUser(
    userAddress: string,
    options?: {
      status?: SchedulePaymentStatusEnum;
      payer?: string;
      payee?: string;
      includeTransactions?: boolean;
    },
  ): Promise<SchedulePayment[]> {
    const where: Prisma.SchedulePaymentWhereInput = {
      OR: [{ payer: userAddress }, { payee: userAddress }],
    };

    if (options?.status) where.status = options.status;
    if (options?.payer) where.payer = options.payer;
    if (options?.payee) where.payee = options.payee;

    return this.findMany(where, {
      orderBy: { createdAt: 'desc' },
      include: options?.includeTransactions
        ? {
            transactions: {
              orderBy: { id: 'asc' },
            },
          }
        : undefined,
    });
  }

  /**
   * Find schedule payment by ID and user with transactions
   */
  async findByIdAndUserWithTransactions(
    id: number,
    userAddress: string,
  ): Promise<SchedulePayment | null> {
    return this.getModel().findFirst({
      where: {
        id,
        OR: [{ payer: userAddress }, { payee: userAddress }],
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Find schedule payment by ID and payer (for updates)
   */
  async findByIdAndPayer(
    id: number,
    payerAddress: string,
  ): Promise<SchedulePayment | null> {
    return this.findOne({ id, payer: payerAddress });
  }

  /**
   * Find active schedule payments ready for execution
   */
  async findActiveReadyForExecution(): Promise<SchedulePayment[]> {
    const now = new Date();
    return this.findMany(
      {
        status: SchedulePaymentStatusEnum.ACTIVE,
        nextExecutionDate: {
          lte: now,
        },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      {
        orderBy: { nextExecutionDate: 'asc' },
      },
    );
  }

  /**
   * Find schedule payment by transaction ID
   */
  async findByTransactionId(
    transactionId: number,
  ): Promise<SchedulePayment | null> {
    return this.getModel().findFirst({
      where: {
        transactions: {
          some: {
            id: transactionId,
          },
        },
      },
    });
  }

  /**
   * Update schedule payment status
   */
  async updateStatus(
    id: number,
    status: SchedulePaymentStatusEnum,
    additionalData?: Partial<SchedulePayment>,
  ): Promise<SchedulePayment> {
    return this.update({ id }, { status, ...additionalData });
  }

  /**
   * Update execution details after payment
   */
  async updateExecution(
    id: number,
    executionCount: number,
    nextExecutionDate: Date | null,
    status?: SchedulePaymentStatusEnum,
  ): Promise<SchedulePayment> {
    const updateData: any = {
      executionCount,
      nextExecutionDate,
    };

    if (status) updateData.status = status;

    return this.update({ id }, updateData);
  }

  /**
   * Mark schedule payment as failed
   */
  async markFailed(id: number): Promise<SchedulePayment> {
    return this.updateStatus(id, SchedulePaymentStatusEnum.FAILED);
  }

  /**
   * Find schedule payments by status
   */
  async findByStatus(
    status: SchedulePaymentStatusEnum,
  ): Promise<SchedulePayment[]> {
    return this.findMany({ status });
  }

  /**
   * Find schedule payments by frequency
   */
  async findByFrequency(
    frequency: SchedulePaymentFrequencyEnum,
  ): Promise<SchedulePayment[]> {
    return this.findMany({ frequency });
  }

  /**
   * Count schedule payments by user and status
   */
  async countByUserAndStatus(
    userAddress: string,
    status: SchedulePaymentStatusEnum,
  ): Promise<number> {
    return this.count({
      OR: [{ payer: userAddress }, { payee: userAddress }],
      status,
    });
  }

  /**
   * Find expired schedule payments
   */
  async findExpired(): Promise<SchedulePayment[]> {
    const now = new Date();
    return this.findMany({
      status: SchedulePaymentStatusEnum.ACTIVE,
      endDate: {
        lt: now,
      },
    });
  }

  /**
   * Get schedule payment statistics for a user
   */
  async getUserStats(userAddress: string): Promise<{
    total: number;
    active: number;
    paused: number;
    completed: number;
    cancelled: number;
    failed: number;
  }> {
    const stats = await this.prisma.schedulePayment.groupBy({
      by: ['status'],
      where: {
        OR: [{ payer: userAddress }, { payee: userAddress }],
      },
      _count: { status: true },
    });

    const result = {
      total: 0,
      active: 0,
      paused: 0,
      completed: 0,
      cancelled: 0,
      failed: 0,
    };

    stats.forEach((stat) => {
      result.total += stat._count.status;
      switch (stat.status) {
        case SchedulePaymentStatusEnum.ACTIVE:
          result.active = stat._count.status;
          break;
        case SchedulePaymentStatusEnum.PAUSED:
          result.paused = stat._count.status;
          break;
        case SchedulePaymentStatusEnum.COMPLETED:
          result.completed = stat._count.status;
          break;
        case SchedulePaymentStatusEnum.CANCELLED:
          result.cancelled = stat._count.status;
          break;
        case SchedulePaymentStatusEnum.FAILED:
          result.failed = stat._count.status;
          break;
      }
    });

    return result;
  }

  /**
   * Delete old completed/cancelled schedule payments
   */
  async deleteOldSchedulePayments(daysOld: number): Promise<{ count: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.deleteMany({
      status: {
        in: [
          SchedulePaymentStatusEnum.COMPLETED,
          SchedulePaymentStatusEnum.CANCELLED,
          SchedulePaymentStatusEnum.FAILED,
        ],
      },
      updatedAt: {
        lt: cutoffDate,
      },
    });
  }
}
