import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  RequestPayment,
  Prisma,
  RequestPaymentStatusEnum,
} from '@prisma/client';
import { BaseRepository } from '../../database/base.repository';

@Injectable()
export class RequestPaymentRepository extends BaseRepository<
  RequestPayment,
  Prisma.RequestPaymentWhereInput,
  Prisma.RequestPaymentCreateInput,
  Prisma.RequestPaymentUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel() {
    return this.prisma.requestPayment;
  }

  /**
   * Create multiple request payments (for group payments)
   */
  async createMany(
    data: Prisma.RequestPaymentCreateInput[],
  ): Promise<{ count: number }> {
    return this.getModel().createMany({ data });
  }

  /**
   * Find request payments by payer (who needs to pay)
   */
  async findByPayer(
    payerAddress: string,
    options?: {
      skip?: number;
      take?: number;
      status?: RequestPaymentStatusEnum;
    },
  ): Promise<RequestPayment[]> {
    const where: Prisma.RequestPaymentWhereInput = { payer: payerAddress };
    if (options?.status) where.status = options.status;

    return this.findMany(where, {
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find request payments by payee (who will receive payment)
   */
  async findByPayee(
    payeeAddress: string,
    options?: {
      skip?: number;
      take?: number;
      status?: RequestPaymentStatusEnum;
    },
  ): Promise<RequestPayment[]> {
    const where: Prisma.RequestPaymentWhereInput = { payee: payeeAddress };
    if (options?.status) where.status = options.status;

    return this.findMany(where, {
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find request payments by group payment ID
   */
  async findByGroupPaymentId(
    groupPaymentId: number,
  ): Promise<RequestPayment[]> {
    return this.findMany(
      { groupPaymentId },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Find request payment by ID and payer
   */
  async findByIdAndPayer(
    id: number,
    payerAddress: string,
  ): Promise<RequestPayment | null> {
    return this.findOne({ id, payer: payerAddress });
  }

  /**
   * Find request payment by ID and payee
   */
  async findByIdAndPayee(
    id: number,
    payeeAddress: string,
  ): Promise<RequestPayment | null> {
    return this.findOne({ id, payee: payeeAddress });
  }

  /**
   * Update request payment status
   */
  async updateStatus(
    id: number,
    status: RequestPaymentStatusEnum,
    additionalData?: Partial<RequestPayment>,
  ): Promise<RequestPayment> {
    return this.update(
      { id },
      {
        status,
        ...additionalData,
      },
    );
  }

  /**
   * Count pending request payments by payer
   */
  async countPendingByPayer(payerAddress: string): Promise<number> {
    return this.count({
      payer: payerAddress,
      status: RequestPaymentStatusEnum.PENDING,
    });
  }

  /**
   * Count pending request payments by payee
   */
  async countPendingByPayee(payeeAddress: string): Promise<number> {
    return this.count({
      payee: payeeAddress,
      status: RequestPaymentStatusEnum.PENDING,
    });
  }

  /**
   * Find old pending request payments (older than specified days)
   */
  async findOldPendingRequests(daysOld: number): Promise<RequestPayment[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.findMany({
      status: RequestPaymentStatusEnum.PENDING,
      createdAt: {
        lt: cutoffDate,
      },
    });
  }

  /**
   * Get request payment statistics for a user
   */
  async getUserStats(userAddress: string): Promise<{
    sentRequests: {
      total: number;
      pending: number;
      accepted: number;
      denied: number;
    };
    receivedRequests: {
      total: number;
      pending: number;
      accepted: number;
      denied: number;
    };
  }> {
    const [sentStats, receivedStats] = await Promise.all([
      this.prisma.requestPayment.groupBy({
        by: ['status'],
        where: { payee: userAddress },
        _count: { status: true },
      }),
      this.prisma.requestPayment.groupBy({
        by: ['status'],
        where: { payer: userAddress },
        _count: { status: true },
      }),
    ]);

    const processStat = (stats: any[]) => {
      const result = { total: 0, pending: 0, accepted: 0, denied: 0 };
      stats.forEach((stat) => {
        result.total += stat._count.status;
        switch (stat.status) {
          case RequestPaymentStatusEnum.PENDING:
            result.pending = stat._count.status;
            break;
          case RequestPaymentStatusEnum.ACCEPTED:
            result.accepted = stat._count.status;
            break;
          case RequestPaymentStatusEnum.DENIED:
            result.denied = stat._count.status;
            break;
        }
      });
      return result;
    };

    return {
      sentRequests: processStat(sentStats),
      receivedRequests: processStat(receivedStats),
    };
  }

  /**
   * Delete old accepted/denied request payments
   */
  async deleteOldRequests(daysOld: number): Promise<{ count: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.deleteMany({
      status: {
        in: [
          RequestPaymentStatusEnum.ACCEPTED,
          RequestPaymentStatusEnum.DENIED,
        ],
      },
      updatedAt: {
        lt: cutoffDate,
      },
    });
  }
}
