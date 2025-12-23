import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, PrismaClient } from '../../../database/generated/client';
import {
  BaseRepository,
  PrismaTransactionClient,
} from 'src/database/base.repository';

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
export class InvoiceScheduleRepository extends BaseRepository<
  any,
  Prisma.InvoiceScheduleWhereInput,
  Prisma.InvoiceScheduleCreateInput,
  Prisma.InvoiceScheduleUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel(
    tx?: PrismaTransactionClient,
  ): PrismaClient['invoiceSchedule'] {
    return tx ? tx.invoiceSchedule : this.prisma.invoiceSchedule;
  }

  protected getModelName(): string {
    return 'InvoiceSchedule';
  }

  async createSchedule(
    data: CreateInvoiceScheduleData,
    tx?: PrismaTransactionClient,
  ): Promise<any> {
    const model = this.getModel(tx);
    return model.create({
      data,
    });
  }

  async findById(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<any | null> {
    const model = this.getModel(tx);
    return model.findUnique({
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
    const model = this.getModel(tx);
    return model.findFirst({
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
    const model = this.getModel(tx);
    return model.findMany({
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

  async updateSchedule(
    id: number,
    data: UpdateInvoiceScheduleData,
    tx?: PrismaTransactionClient,
  ): Promise<any> {
    const model = this.getModel(tx);
    return model.update({
      where: { id },
      data,
    });
  }

  async deleteSchedule(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<void> {
    const model = this.getModel(tx);
    await model.delete({
      where: { id },
    });
  }

  async updateLastGenerated(
    id: number,
    lastGeneratedAt: Date,
    nextGenerateDate: Date,
    tx?: PrismaTransactionClient,
  ): Promise<any> {
    const model = this.getModel(tx);
    return model.update({
      where: { id },
      data: {
        lastGeneratedAt: lastGeneratedAt,
        nextGenerateDate: nextGenerateDate,
      },
    });
  }
}
