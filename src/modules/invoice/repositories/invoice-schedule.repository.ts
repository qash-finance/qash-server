import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../database/generated/client';
import { PrismaTransactionClient } from 'src/database/base.repository';
import { InvoiceScheduleDelegate } from 'src/database/generated/models';

export interface CreateInvoiceScheduleData {
  payrollId: number;
  frequency: string; // 'MONTHLY', 'WEEKLY', 'BIWEEKLY', 'QUARTERLY'
  dayOfMonth?: number;
  dayOfWeek?: number;
  generateDaysBefore: number;
  isActive?: boolean;
  nextGenerateDate?: Date;
  invoiceTemplate?: any;
  metadata?: any;
}

export interface UpdateInvoiceScheduleData {
  frequency?: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  generateDaysBefore?: number;
  isActive?: boolean;
  nextGenerateDate?: Date;
  invoiceTemplate?: any;
  metadata?: any;
}

@Injectable()
export class InvoiceScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateInvoiceScheduleData,
    tx?: PrismaTransactionClient,
  ): Promise<any> {
    const client = tx || this.prisma;
    return (client.invoiceSchedule as InvoiceScheduleDelegate).create({
      data,
    });
  }

  async findById(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<any | null> {
    const client = tx || this.prisma;
    return (client.invoiceSchedule as InvoiceScheduleDelegate).findUnique({
      where: { id },
      include: {
        payroll: {
          include: {
            employee: true,
            company: true,
          },
        },
      },
    });
  }

  async findByPayrollId(
    payrollId: number,
    tx?: PrismaTransactionClient,
  ): Promise<any | null> {
    const client = tx || this.prisma;
    return (client.invoiceSchedule as InvoiceScheduleDelegate).findFirst({
      where: { payrollId, isActive: true },
      include: {
        payroll: {
          include: {
            employee: true,
            company: true,
          },
        },
      },
    });
  }

  async findSchedulesDueForGeneration(
    date: Date,
    tx?: PrismaTransactionClient,
  ) {
    const client = tx || this.prisma;
    return (client.invoiceSchedule as InvoiceScheduleDelegate).findMany({
      where: {
        isActive: true,
        nextGenerateDate: {
          lte: date,
        },
      },
      include: {
        payroll: {
          include: {
            employee: true,
            company: true,
          },
        },
      },
    });
  }

  async update(
    id: number,
    data: UpdateInvoiceScheduleData,
    tx?: PrismaTransactionClient,
  ): Promise<any> {
    const client = tx || this.prisma;
    return (client.invoiceSchedule as InvoiceScheduleDelegate).update({
      where: { id },
      data,
    });
  }

  async delete(id: number, tx?: PrismaTransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await (client.invoiceSchedule as InvoiceScheduleDelegate).delete({
      where: { id },
    });
  }

  async updateLastGenerated(
    id: number,
    lastGeneratedAt: Date,
    nextGenerateDate: Date,
    tx?: PrismaTransactionClient,
  ): Promise<any> {
    const client = tx || this.prisma;
    return (client.invoiceSchedule as InvoiceScheduleDelegate).update({
      where: { id },
      data: {
        lastGeneratedAt: lastGeneratedAt,
        nextGenerateDate: nextGenerateDate,
      },
    });
  }
}
