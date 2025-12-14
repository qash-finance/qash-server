import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  InvoiceDelegate,
  InvoiceModel,
} from '../../../database/generated/models/Invoice';
import {
  InvoiceStatusEnum,
  Prisma,
  PrismaClient,
} from '../../../database/generated/client';
import {
  BaseRepository,
  PrismaTransactionClient,
} from 'src/database/base.repository';

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    payroll: {
      include: {
        company: true;
      };
    };
    employee: {
      include: {
        group: true;
      };
    };
    fromCompany: true;
    toCompany: true;
    items: true;
    bill: true;
  };
}>;

export interface CreateInvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  payrollId: number;
  employeeId: number;
  fromDetails: any;
  billToDetails: any;
  items: any;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  metadata?: any;
}

export interface UpdateInvoiceData {
  dueDate?: Date;
  fromDetails?: any;
  billToDetails?: any;
  items?: any;
  subtotal?: string;
  taxRate?: string;
  taxAmount?: string;
  total?: string;
  status?: InvoiceStatusEnum;
  sentAt?: Date;
  reviewedAt?: Date;
  confirmedAt?: Date;
  metadata?: any;
}

export interface InvoiceFilters {
  payrollId?: number;
  employeeId?: number;
  status?: InvoiceStatusEnum;
  search?: string;
  companyId?: number;
}

@Injectable()
export class InvoiceRepository extends BaseRepository<
  InvoiceModel,
  Prisma.InvoiceWhereInput,
  Prisma.InvoiceCreateInput,
  Prisma.InvoiceUpdateInput
> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  protected getModel(tx?: PrismaTransactionClient): PrismaClient['invoice'] {
    return tx ? tx.invoice : this.prisma.invoice;
  }

  protected getModelName(): string {
    return 'Invoice';
  }

  async findByUUID(
    uuid: string,
    tx?: PrismaTransactionClient,
  ): Promise<InvoiceWithRelations | null> {
    const model = this.getModel(tx);
    return model.findUnique({
      where: { uuid },
      include: {
        payroll: {
          include: {
            company: true,
          },
        },
        employee: {
          include: {
            group: true,
          },
        },
        // B2B relations (for B2B invoices)
        fromCompany: true,
        toCompany: true,
        // Common relations
        items: true,
        bill: true,
      },
    });
  }

  async getStats(
    companyId: number,
    tx?: PrismaTransactionClient,
  ): Promise<{
    totalDraft: number;
    totalSent: number;
    totalReviewed: number;
    totalConfirmed: number;
    totalAmount: string;
    dueThisMonth: number;
  }> {
    const model = this.getModel(tx);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const baseWhere: Prisma.InvoiceWhereInput = {
      payroll: {
        companyId,
      },
    };

    const [
      draftCount,
      sentCount,
      reviewedCount,
      confirmedCount,
      dueThisMonth,
      allInvoices,
    ] = await Promise.all([
      model.count({
        where: { ...baseWhere, status: InvoiceStatusEnum.DRAFT },
      }),
      model.count({
        where: { ...baseWhere, status: InvoiceStatusEnum.SENT },
      }),
      model.count({
        where: { ...baseWhere, status: InvoiceStatusEnum.REVIEWED },
      }),
      model.count({
        where: { ...baseWhere, status: InvoiceStatusEnum.CONFIRMED },
      }),
      model.count({
        where: {
          ...baseWhere,
          dueDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      model.findMany({
        where: baseWhere,
        select: { total: true },
      }),
    ]);

    // Calculate total amount
    const totalAmount = allInvoices
      .reduce((sum, invoice) => sum + parseFloat(invoice.total), 0)
      .toFixed(2);

    return {
      totalDraft: draftCount,
      totalSent: sentCount,
      totalReviewed: reviewedCount,
      totalConfirmed: confirmedCount,
      totalAmount,
      dueThisMonth,
    };
  }

  async findDueInvoices(
    date: Date,
    tx?: PrismaTransactionClient,
  ): Promise<InvoiceModel[]> {
    const model = this.getModel(tx);

    return model.findMany({
      where: {
        status: {
          in: [InvoiceStatusEnum.SENT, InvoiceStatusEnum.REVIEWED],
        },
        dueDate: {
          lte: date,
        },
      },
      include: {
        payroll: {
          include: {
            employee: {
              include: {
                group: true,
              },
            },
            company: true,
          },
        },
        employee: {
          include: {
            group: true,
          },
        },
      },
    });
  }

  async findByEmployeeEmail(
    email: string,
    tx?: PrismaTransactionClient,
  ): Promise<InvoiceModel[]> {
    const model = this.getModel(tx);

    return model.findMany({
      where: {
        employee: {
          email,
        },
      },
      include: {
        payroll: {
          include: {
            employee: {
              include: {
                group: true,
              },
            },
            company: true,
          },
        },
        employee: {
          include: {
            group: true,
          },
        },
        bill: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateMultiple(
    uuids: string[],
    status: InvoiceStatusEnum,
    paidAt: Date,
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const model = this.getModel(tx);

    const result = await model.updateMany({
      where: {
        uuid: { in: uuids },
      },
      data: {
        status,
        paidAt,
      },
    });

    return result.count;
  }

  /**
   * Generate an invoice number.
   * If payrollId is provided, sequence is per payroll (employee-centric).
   * Otherwise, fallback to monthly per-company sequence.
   */
  async generatePayrollInvoiceNumber(
    payrollId: number,
    employeeId: number,
    tx?: PrismaTransactionClient,
  ): Promise<string> {
    const model = this.getModel(tx);
    const count = await model.count({
      where: { payrollId, employeeId },
    });
    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${sequence}`;
  }

  /**
   * Find latest invoice for a payroll
   */
  async findLatestInvoiceForPayroll(
    payrollId: number,
    tx?: PrismaTransactionClient,
  ): Promise<InvoiceModel | null> {
    const model = this.getModel(tx);
    return model.findFirst({
      where: { payrollId },
      orderBy: { issueDate: 'desc' },
    });
  }
}
