import { Injectable } from '@nestjs/common';
import { Transactions, Prisma, TransactionsStatusEnum } from '@prisma/client';
import { BaseRepository } from '../../common/repositories/base.repository';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TransactionRepository extends BaseRepository<
  Transactions,
  Prisma.TransactionsWhereInput,
  Prisma.TransactionsCreateInput,
  Prisma.TransactionsUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel() {
    return this.prisma.transactions;
  }

  /**
   * Find consumable transactions for a user
   */
  async findConsumableTransactions(
    userId: string,
    latestBlockHeight: number,
  ): Promise<Transactions[]> {
    return this.findMany(
      {
        recipient: userId,
        status: TransactionsStatusEnum.PENDING,
        OR: [
          { timelockHeight: null },
          { timelockHeight: { lte: latestBlockHeight } },
        ],
      },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Find recallable transactions for a user
   */
  async findRecallableTransactions(
    userId: string,
    latestBlockHeight: number,
  ): Promise<Transactions[]> {
    return this.findMany(
      {
        sender: userId,
        recallable: true,
        status: TransactionsStatusEnum.PENDING,
        OR: [
          { timelockHeight: null },
          { timelockHeight: { lte: latestBlockHeight } },
        ],
      },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Find all recallable transactions sent by a user
   */
  async findAllRecallableByUser(userAddress: string): Promise<Transactions[]> {
    return this.findMany(
      {
        sender: userAddress,
        recallable: true,
        status: TransactionsStatusEnum.PENDING,
      },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Find recalled transactions by user
   */
  async findRecalledByUser(userAddress: string): Promise<Transactions[]> {
    return this.findMany(
      {
        sender: userAddress,
        status: TransactionsStatusEnum.RECALLED,
      },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Find transactions by IDs and status
   */
  async findByIdsAndStatus(
    ids: number[],
    status: TransactionsStatusEnum,
  ): Promise<Transactions[]> {
    return this.findMany(
      {
        id: { in: ids },
        status: status as any,
      },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Find transactions by note IDs and status
   */
  async findByNoteIdsAndStatus(
    noteIds: string[],
    status: TransactionsStatusEnum,
  ): Promise<Transactions[]> {
    return this.findMany(
      {
        noteId: { in: noteIds },
        status: status as any,
      },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Update transaction status by IDs
   */
  async updateStatusByIds(
    ids: number[],
    status: TransactionsStatusEnum,
    currentStatus: TransactionsStatusEnum,
  ): Promise<{ count: number }> {
    return this.updateMany(
      {
        id: { in: ids },
        status: currentStatus as any,
      },
      {
        status: status as any,
      },
    );
  }

  /**
   * Update transaction status by note IDs
   */
  async updateStatusByNoteIds(
    noteIds: string[],
    status: TransactionsStatusEnum,
    currentStatus: TransactionsStatusEnum,
  ): Promise<{ count: number }> {
    return this.updateMany(
      {
        noteId: { in: noteIds },
        status: currentStatus as any,
      },
      {
        status: status as any,
      },
    );
  }

  /**
   * Get top interacted wallets with raw query
   */
  async getTopInteractedWallets(): Promise<
    Array<{
      sender: string;
      transaction_count: bigint;
      total_amount: string;
    }>
  > {
    return this.prisma.$queryRaw<
      Array<{
        sender: string;
        transaction_count: bigint;
        total_amount: string;
      }>
    >`
      SELECT 
        sender,
        COUNT(*)::BIGINT as transaction_count,
        COALESCE(SUM(
          CASE 
            WHEN assets IS NOT NULL AND jsonb_typeof(assets) = 'array' 
            THEN (
              SELECT COALESCE(SUM(CAST(value->>'amount' AS NUMERIC)), 0)
              FROM jsonb_array_elements(assets)
              WHERE jsonb_typeof(value) = 'object' AND value ? 'amount'
            )
            ELSE 0
          END
        ), 0)::TEXT as total_amount
      FROM transactions 
      GROUP BY sender 
      ORDER BY transaction_count DESC, total_amount DESC
      LIMIT 3
    `;
  }

  /**
   * Create multiple transactions in parallel
   */
  async createTransactionsBatch(
    transactionData: Prisma.TransactionsCreateInput[],
  ): Promise<Transactions[]> {
    const now = new Date();

    return Promise.all(
      transactionData.map((data) =>
        this.getModel().create({
          data: {
            createdAt: now,
            updatedAt: now,
            ...data,
          },
        }),
      ),
    );
  }

  /**
   * Find transaction by note ID
   */
  async findByNoteId(noteId: string): Promise<Transactions | null> {
    return this.findOne({ noteId });
  }

  /**
   * Find transactions by request payment ID
   */
  async findByRequestPaymentId(
    requestPaymentId: number,
  ): Promise<Transactions[]> {
    return this.findMany({ requestPaymentId });
  }

  /**
   * Find transactions by schedule payment ID
   */
  async findBySchedulePaymentId(
    schedulePaymentId: number,
  ): Promise<Transactions[]> {
    return this.findMany({ schedulePaymentId });
  }
}
