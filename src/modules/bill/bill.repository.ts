import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BillModel } from '../../database/generated/models/Bill';
import { BillStatusEnum, Prisma } from '../../database/generated/client';
import {
  BaseRepository,
  PrismaTransactionClient,
} from 'src/database/base.repository';

export type BillWithInvoice = Prisma.BillGetPayload<{
  include: {
    invoice: {
      include: {
        employee: {
          include: {
            group: true;
          };
        };
      };
    };
  };
}>;

export interface CreateBillData {
  companyId: number;
  invoiceId: number;
  metadata?: any;
}

export interface UpdateBillData {
  status?: BillStatusEnum;
  paidAt?: Date;
  transactionHash?: string;
  confirmedAt?: Date;
  metadata?: any;
}

export interface BillFilters {
  companyId: number;
  status?: BillStatusEnum;
  groupId?: number;
  search?: string;
}

@Injectable()
export class BillRepository extends BaseRepository<
  BillModel,
  Prisma.BillWhereInput,
  Prisma.BillCreateInput,
  Prisma.BillUpdateInput
> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected getModel(tx?: PrismaTransactionClient) {
    return tx ? tx.bill : this.prisma.bill;
  }

  protected getModelName(): string {
    return 'Bill';
  }

  /**
   * Find a bill by id and company with invoice relation included
   */
  async findByIdWithInvoice(
    id: number,
    companyId: number,
    tx?: PrismaTransactionClient,
  ): Promise<BillWithInvoice | null> {
    const client = tx || this.prisma;
    return client.bill.findFirst({
      where: { id, companyId },
      include: {
        invoice: {
          include: {
            employee: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    });
  }

  async getStats(
    companyId: number,
    tx?: PrismaTransactionClient,
  ): Promise<{
    totalBills: number;
    totalPending: number;
    totalPaid: number;
    totalOverdue: number;
    totalAmount: string;
    pendingAmount: string;
    paidAmount: string;
    overdueAmount: string;
  }> {
    const client = tx || this.prisma;

    const now = new Date();
    const baseWhere = { companyId };

    const [
      totalBills,
      pendingBills,
      paidBills,
      overdueBills,
      allBills,
      pendingBillsWithAmount,
      paidBillsWithAmount,
      overdueBillsWithAmount,
    ] = await Promise.all([
      client.bill.count({ where: baseWhere }),
      client.bill.count({
        where: { ...baseWhere, status: BillStatusEnum.PENDING },
      }),
      client.bill.count({
        where: { ...baseWhere, status: BillStatusEnum.PAID },
      }),
      client.bill.count({
        where: {
          ...baseWhere,
          status: BillStatusEnum.OVERDUE,
        },
      }),
      client.bill.findMany({
        where: baseWhere,
        include: {
          invoice: {
            select: { total: true },
          },
        },
      }),
      client.bill.findMany({
        where: { ...baseWhere, status: BillStatusEnum.PENDING },
        include: {
          invoice: {
            select: { total: true },
          },
        },
      }),
      client.bill.findMany({
        where: { ...baseWhere, status: BillStatusEnum.PAID },
        include: {
          invoice: {
            select: { total: true },
          },
        },
      }),
      client.bill.findMany({
        where: { ...baseWhere, status: BillStatusEnum.OVERDUE },
        include: {
          invoice: {
            select: { total: true },
          },
        },
      }),
    ]);

    // Calculate amounts
    const totalAmount = allBills
      .reduce((sum, bill) => sum + parseFloat(bill.invoice.total), 0)
      .toFixed(2);

    const pendingAmount = pendingBillsWithAmount
      .reduce((sum, bill) => sum + parseFloat(bill.invoice.total), 0)
      .toFixed(2);

    const paidAmount = paidBillsWithAmount
      .reduce((sum, bill) => sum + parseFloat(bill.invoice.total), 0)
      .toFixed(2);

    const overdueAmount = overdueBillsWithAmount
      .reduce((sum, bill) => sum + parseFloat(bill.invoice.total), 0)
      .toFixed(2);

    return {
      totalBills,
      totalPending: pendingBills,
      totalPaid: paidBills,
      totalOverdue: overdueBills,
      totalAmount,
      pendingAmount,
      paidAmount,
      overdueAmount,
    };
  }

  async updateMultiple(
    ids: number[],
    companyId: number,
    data: UpdateBillData,
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;

    const result = await client.bill.updateMany({
      where: {
        id: { in: ids },
        companyId,
      },
      data,
    });

    return result.count;
  }

  async findOverdueBills(
    date?: Date,
    tx?: PrismaTransactionClient,
  ): Promise<BillModel[]> {
    const client = tx || this.prisma;
    const overdueDate = date || new Date();

    return client.bill.findMany({
      where: {
        status: BillStatusEnum.PENDING,
        invoice: {
          dueDate: {
            lt: overdueDate,
          },
        },
      },
      include: {
        company: true,
        invoice: {
          include: {
            payroll: {
              include: {
                employee: {
                  include: {
                    group: true,
                  },
                },
              },
            },
            employee: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    });
  }

  async markOverdueBills(
    date?: Date,
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    const overdueDate = date || new Date();

    const result = await client.bill.updateMany({
      where: {
        status: BillStatusEnum.PENDING,
        invoice: {
          dueDate: {
            lt: overdueDate,
          },
        },
      },
      data: {
        status: BillStatusEnum.OVERDUE,
      },
    });

    return result.count;
  }
}
