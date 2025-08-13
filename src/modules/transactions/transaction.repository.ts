import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {  Prisma, Transactions } from '@prisma/client';

@Injectable()
export class TransactionRepository {
  private readonly logger = new Logger(TransactionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findOne(
    where: Prisma.TransactionsWhereInput,
    options?: Prisma.TransactionsFindFirstArgs,
  ): Promise<Transactions | null> {
    try {
      const row = await this.prisma.transactions.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        ...options,
      });
      return row ?? null;
    } catch (error) {
      this.logger.error('Error finding transaction', error);
      throw error;
    }
  }

  public async find(
    where: Prisma.TransactionsWhereInput,
    options?: Prisma.TransactionsFindManyArgs,
  ): Promise<Transactions[]> {
    try {
      const rows = await this.prisma.transactions.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...options,
      });
      return rows;
    } catch (error) {
      this.logger.error('Error finding transactions', error);
      throw error;
    }
  }

  public async create(dto: Partial<Transactions>): Promise<Transactions> {
    try {
      const now = new Date();
      const row = await this.prisma.transactions.create({
        data: {
          createdAt: now,
          updatedAt: now,
          sender: dto.sender as string,
          recipient: dto.recipient as string,
          assets: dto.assets as Prisma.InputJsonValue,
          private: (dto.private as boolean) ?? true,
          recallable: (dto.recallable as boolean) ?? true,
          recallableTime: (dto.recallableTime as Date) ?? null,
          recallableHeight: (dto.recallableHeight as number) ?? null,
          serialNumber: dto.serialNumber as Prisma.InputJsonValue,
          noteType: dto.noteType as any,
          status: dto.status as any,
          noteId: (dto.noteId as string) ?? null,
          requestPaymentId: (dto.requestPaymentId as number) ?? null,
        },
      });
      return row;
    } catch (error) {
      this.logger.error('Error creating transaction', error);
      throw error;
    }
  }

  public async createMany(
    dtos: Partial<Transactions>[],
  ): Promise<Transactions[]> {
    try {
      const now = new Date();
      const rows = await Promise.all(
        dtos.map((dto) =>
          this.prisma.transactions.create({
            data: {
              createdAt: now,
              updatedAt: now,
              sender: dto.sender as string,
              recipient: dto.recipient as string,
              assets: dto.assets as Prisma.InputJsonValue,
              private: (dto.private as boolean) ?? true,
              recallable: (dto.recallable as boolean) ?? true,
              recallableTime: (dto.recallableTime as Date) ?? null,
              recallableHeight: (dto.recallableHeight as number) ?? null,
              serialNumber: dto.serialNumber as Prisma.InputJsonValue,
              noteType: dto.noteType as any,
              status: dto.status as any,
              noteId: (dto.noteId as string) ?? null,
              requestPaymentId: (dto.requestPaymentId as number) ?? null,
            },
          }),
        ),
      );
      return rows;
    } catch (error) {
      this.logger.error('Error creating many transactions', error);
      throw error;
    }
  }

  public async update(
    where: Prisma.TransactionsWhereUniqueInput,
    dto: Partial<Transactions>,
  ): Promise<Transactions | null> {
    try {
      await this.prisma.transactions.update({
        where,
        data: { ...dto, updatedAt: new Date() },
      });
      return this.prisma.transactions.findUnique({ where });
    } catch (error) {
      this.logger.error('Error updating transaction', error);
      throw error;
    }
  }

  public async updateMany(
    where: Prisma.TransactionsWhereInput,
    dto: Partial<Transactions>,
  ): Promise<number> {
    try {
      const result = await this.prisma.transactions.updateMany({
        where,
        data: { ...dto, updatedAt: new Date() },
      });
      return result.count;
    } catch (error) {
      this.logger.error('Error updating many transactions', error);
      throw error;
    }
  }
}
