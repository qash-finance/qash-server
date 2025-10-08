import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  PaymentLink,
  PaymentLinkRecord,
  Prisma,
  PaymentLinkStatusEnum,
} from '@prisma/client';
import { BaseRepository } from '../../database/base.repository';

@Injectable()
export class PaymentLinkRepository extends BaseRepository<
  PaymentLink,
  Prisma.PaymentLinkWhereInput,
  Prisma.PaymentLinkCreateInput,
  Prisma.PaymentLinkUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel() {
    return this.prisma.paymentLink;
  }

  /**
   * Find payment link by code
   */
  async findByCode(code: string): Promise<PaymentLink | null> {
    return this.findOne({ code });
  }

  /**
   * Find payment link by code with records included
   */
  async findByCodeWithRecords(
    code: string,
  ): Promise<(PaymentLink & { records: PaymentLinkRecord[] }) | null> {
    try {
      return await this.prisma.paymentLink.findFirst({
        where: { code },
        include: { records: true },
      });
    } catch (error) {
      this.logger.error(`Error finding payment link with records:`, error);
      throw error;
    }
  }

  /**
   * Find payment links by payee address
   */
  async findByPayee(
    payeeAddress: string,
    options?: {
      skip?: number;
      take?: number;
      status?: PaymentLinkStatusEnum;
    },
  ): Promise<PaymentLink[]> {
    const where: Prisma.PaymentLinkWhereInput = { payee: payeeAddress };
    if (options?.status) where.status = options.status;

    return this.findMany(where, {
      skip: options?.skip,
      take: options?.take,
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Find payment links by payee with records included
   */
  async findByPayeeWithRecords(
    payeeAddress: string,
    options?: {
      skip?: number;
      take?: number;
      status?: PaymentLinkStatusEnum;
    },
  ): Promise<(PaymentLink & { records: PaymentLinkRecord[] })[]> {
    try {
      const where: Prisma.PaymentLinkWhereInput = { payee: payeeAddress };
      if (options?.status) where.status = options.status;

      return await this.prisma.paymentLink.findMany({
        where,
        include: { records: true },
        skip: options?.skip,
        take: options?.take,
        orderBy: { order: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error finding payment links by payee with records:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update payment link status
   */
  async updateStatus(
    code: string,
    status: PaymentLinkStatusEnum,
  ): Promise<PaymentLink> {
    return this.update({ code }, { status });
  }

  /**
   * Count payment links by payee
   */
  async countByPayee(payeeAddress: string): Promise<number> {
    return this.count({ payee: payeeAddress });
  }

  /**
   * Count active payment links by payee
   */
  async countActiveByPayee(payeeAddress: string): Promise<number> {
    return this.count({
      payee: payeeAddress,
      status: PaymentLinkStatusEnum.ACTIVE,
    });
  }

  /**
   * Delete payment link by code
   * This method handles cascade deletion of related records
   */
  async deleteByCode(code: string): Promise<PaymentLink> {
    try {
      // First, delete all related PaymentLinkRecord entries
      await this.prisma.paymentLinkRecord.deleteMany({
        where: {
          PaymentLink: {
            code: code
          }
        }
      });

      // Then delete the PaymentLink entry
      return this.delete({ code });
    } catch (error) {
      this.logger.error(`Error deleting payment link with cascade:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple payment links by codes
   * This method handles cascade deletion of related records
   */
  async deleteByCodes(codes: string[]): Promise<{ count: number }> {
    try {
      // First, delete all related PaymentLinkRecord entries
      await this.prisma.paymentLinkRecord.deleteMany({
        where: {
          PaymentLink: {
            code: { in: codes }
          }
        }
      });

      // Then delete the PaymentLink entries
      return await this.deleteMany({ code: { in: codes } });
    } catch (error) {
      this.logger.error(`Error deleting payment links with cascade:`, error);
      throw error;
    }
  }

  /**
   * Find payment links by codes for ownership validation
   */
  async findByCodes(
    codes: string[],
    payeeAddress: string,
  ): Promise<PaymentLink[]> {
    return this.findMany({
      code: { in: codes },
      payee: payeeAddress,
    });
  }

  /**
   * Update payment link order
   */
  async updateLinkOrder(
    payeeAddress: string,
    linkIds: number[],
  ): Promise<PaymentLink[]> {
    const updates = linkIds.map((id, index) =>
      this.update({ id, payee: payeeAddress }, { order: index + 1 }),
    );

    await Promise.all(updates);

    // Return updated links in the new order
    return this.findMany(
      {
        payee: payeeAddress,
        id: { in: linkIds },
      },
      {
        orderBy: { order: 'asc' },
      },
    );
  }
}

@Injectable()
export class PaymentLinkRecordRepository {
  protected readonly logger = new Logger(PaymentLinkRecordRepository.name);

  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Create a payment record
   */
  async create(
    data: Prisma.PaymentLinkRecordCreateInput,
  ): Promise<PaymentLinkRecord> {
    try {
      const now = new Date();
      return await this.prisma.paymentLinkRecord.create({
        data: {
          ...data,
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch (error) {
      this.logger.error(`Error creating payment link record:`, error);
      throw error;
    }
  }

  /**
   * Find records by payment link ID
   */
  async findByPaymentLinkId(
    paymentLinkId: number,
  ): Promise<PaymentLinkRecord[]> {
    try {
      return await this.prisma.paymentLinkRecord.findMany({
        where: { paymentLinkId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error finding records by payment link ID:`, error);
      throw error;
    }
  }

  /**
   * Find record by ID
   */
  async findById(id: number): Promise<PaymentLinkRecord | null> {
    try {
      return await this.prisma.paymentLinkRecord.findUnique({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error finding payment link record by ID:`, error);
      throw error;
    }
  }

  /**
   * Update record with txid
   */
  async updateTxid(id: number, txid: string): Promise<PaymentLinkRecord> {
    try {
      return await this.prisma.paymentLinkRecord.update({
        where: { id },
        data: {
          txid,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error updating payment link record txid:`, error);
      throw error;
    }
  }

  /**
   * Count records for a payment link
   */
  async countByPaymentLinkId(paymentLinkId: number): Promise<number> {
    try {
      return await this.prisma.paymentLinkRecord.count({
        where: { paymentLinkId },
      });
    } catch (error) {
      this.logger.error(`Error counting records for payment link:`, error);
      throw error;
    }
  }

  /**
   * Count records with txid (completed payments)
   */
  async countCompletedByPaymentLinkId(
    paymentLinkId: number,
  ): Promise<number> {
    try {
      return await this.prisma.paymentLinkRecord.count({
        where: {
          paymentLinkId,
          txid: { not: null },
        },
      });
    } catch (error) {
      this.logger.error(
        `Error counting completed records for payment link:`,
        error,
      );
      throw error;
    }
  }
}

import { Logger } from '@nestjs/common';

