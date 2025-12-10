import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InvoiceModel } from '../../database/generated/models/Invoice';
import { InvoiceStatusEnum, Prisma } from '../../database/generated/client';
import {
  BaseRepository,
  PrismaTransactionClient,
} from 'src/database/base.repository';

// Type for Invoice with all relations included (supports both EMPLOYEE and B2B invoices)
export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    // Employee-Employer relations (for EMPLOYEE invoices)
    payroll: {
      include: {
        employee: {
          include: {
            group: true;
          };
        };
        company: true;
      };
    };
    employee: {
      include: {
        group: true;
      };
    };
    // B2B relations (for B2B invoices)
    fromCompany: true;
    toCompany: true;
    // Common relations
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

  protected getModel(tx?: PrismaTransactionClient) {
    return tx ? tx.invoice : this.prisma.invoice;
  }

  protected getModelName(): string {
    return 'Invoice';
  }

  async findById(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<InvoiceWithRelations | null> {
    const client = tx || this.prisma;
    return client.invoice.findUnique({
      where: { id },
      include: {
        // Employee-Employer relations (for EMPLOYEE invoices)
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
        // B2B relations (for B2B invoices)
        fromCompany: true,
        toCompany: true,
        // Common relations
        bill: true,
      },
    });
  }

  async findByInvoiceNumber(
    invoiceNumber: string,
    tx?: PrismaTransactionClient,
  ): Promise<InvoiceWithRelations | null> {
    const client = tx || this.prisma;
    return client.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        // Employee-Employer relations (for EMPLOYEE invoices)
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
        // B2B relations (for B2B invoices)
        fromCompany: true,
        toCompany: true,
        // Common relations
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
    const client = tx || this.prisma;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const baseWhere = {
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
      client.invoice.count({
        where: { ...baseWhere, status: InvoiceStatusEnum.DRAFT },
      }),
      client.invoice.count({
        where: { ...baseWhere, status: InvoiceStatusEnum.SENT },
      }),
      client.invoice.count({
        where: { ...baseWhere, status: InvoiceStatusEnum.REVIEWED },
      }),
      client.invoice.count({
        where: { ...baseWhere, status: InvoiceStatusEnum.CONFIRMED },
      }),
      client.invoice.count({
        where: {
          ...baseWhere,
          dueDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      client.invoice.findMany({
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
    const client = tx || this.prisma;

    return client.invoice.findMany({
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
    const client = tx || this.prisma;

    return client.invoice.findMany({
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

  async generateInvoiceNumber(
    companyId: number,
    tx?: PrismaTransactionClient,
  ): Promise<string> {
    const client = tx || this.prisma;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Get the count of invoices for this company this month
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0);

    const count = await client.invoice.count({
      where: {
        payroll: {
          companyId,
        },
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${companyId}-${sequence}`;
  }
}
