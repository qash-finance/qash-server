import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from 'src/database/generated/client';
import { AddressBook } from 'src/database/generated/client';
import {
  BaseRepository,
  PrismaTransactionClient,
  PaginationOptions,
  PaginatedResult,
} from '../../database/base.repository';

@Injectable()
export class AddressBookRepository extends BaseRepository<
  AddressBook,
  Prisma.AddressBookWhereInput,
  Prisma.AddressBookCreateInput,
  Prisma.AddressBookUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel(tx?: PrismaTransactionClient) {
    return tx ? tx.addressBook : this.prisma.addressBook;
  }

  protected getModelName(): string {
    return 'AddressBook';
  }

  /**
   * Find all address book entries for a user with categories
   */
  async findByUserWithCategories(
    userAddress: string,
    tx?: PrismaTransactionClient,
  ): Promise<(AddressBook & { categories: any })[]> {
    return this.findMany(
      { userAddress },
      {
        include: { categories: true },
        orderBy: [{ categories: { order: 'asc' } }, { order: 'asc' }],
      },
      tx,
    ) as Promise<(AddressBook & { categories: any })[]>;
  }

  /**
   * Find address book entries with categories and pagination
   */
  async findByUserWithCategoriesPaginated(
    userAddress: string,
    pagination: PaginationOptions,
    tx?: PrismaTransactionClient,
  ): Promise<PaginatedResult<AddressBook & { categories: any }>> {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 10));
    const skip = (page - 1) * limit;

    const model = this.getModel(tx);

    const [data, total] = await Promise.all([
      model.findMany({
        where: { userAddress },
        include: { categories: true },
        orderBy: [{ categories: { order: 'asc' } }, { order: 'asc' }],
        skip,
        take: limit,
      }),
      model.count({ where: { userAddress } }),
    ]);

    return {
      data: data as (AddressBook & { categories: any })[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Check if name exists in category for user
   */
  async isNameDuplicateInCategory(
    userAddress: string,
    name: string,
    categoryId: number,
    excludeId?: number,
    tx?: PrismaTransactionClient,
  ): Promise<boolean> {
    const where: Prisma.AddressBookWhereInput = {
      userAddress,
      name,
      categoryId,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return await this.exists(where, tx);
  }

  /**
   * Check if address exists in category for user
   */
  async isAddressDuplicateInCategory(
    userAddress: string,
    address: string,
    categoryId: number,
    excludeId?: number,
    tx?: PrismaTransactionClient,
  ): Promise<boolean> {
    const where: Prisma.AddressBookWhereInput = {
      userAddress,
      address,
      categoryId,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return await this.exists(where, tx);
  }

  /**
   * Find entries by category
   */
  async findByCategory(
    userAddress: string,
    categoryId: number,
    tx?: PrismaTransactionClient,
  ): Promise<AddressBook[]> {
    return this.findMany(
      {
        userAddress,
        categoryId,
      },
      {
        orderBy: { order: 'asc' },
      },
      tx,
    );
  }

  /**
   * Update order for multiple entries in a transaction
   */
  async updateOrdersInBatch(
    updates: Array<{ id: number; order: number }>,
    tx?: PrismaTransactionClient,
  ): Promise<void> {
    const model = this.getModel(tx);

    await Promise.all(
      updates.map(({ id, order }) =>
        model.update({
          where: { id },
          data: {
            order,
            updatedAt: new Date(),
          },
        }),
      ),
    );

    this.logger.debug(
      `Updated order for ${updates.length} address book entries`,
    );
  }

  /**
   * Get next order value for category
   */
  async getNextOrderForCategory(
    userAddress: string,
    categoryId: number,
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const model = this.getModel(tx);

    const lastEntry = await model.findFirst({
      where: {
        userAddress,
        categoryId,
      },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return (lastEntry?.order || 0) + 1;
  }

  /**
   * Bulk upsert address book entries
   */
  async bulkUpsertEntries(
    userAddress: string,
    entries: Array<{
      name: string;
      address: string;
      categoryId: number;
      email?: string;
      token?: any;
    }>,
    tx?: PrismaTransactionClient,
  ): Promise<AddressBook[]> {
    const results: AddressBook[] = [];

    for (const entry of entries) {
      const result = await this.upsert(
        {
          userAddress,
          name: entry.name,
          categoryId: entry.categoryId,
        },
        {
          userAddress,
          name: entry.name,
          address: entry.address,
          categories: {
            connect: { id: entry.categoryId },
          },
          email: entry.email,
          token: entry.token,
          order: await this.getNextOrderForCategory(
            userAddress,
            entry.categoryId,
            tx,
          ),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          address: entry.address,
          email: entry.email,
          token: entry.token,
        },
        tx,
      );

      results.push(result);
    }

    this.logger.debug(`Bulk upserted ${results.length} address book entries`);
    return results;
  }

  /**
   * Search entries by name or address
   */
  async searchEntries(
    userAddress: string,
    searchTerm: string,
    categoryId?: number,
    tx?: PrismaTransactionClient,
  ): Promise<(AddressBook & { categories: any })[]> {
    const where: Prisma.AddressBookWhereInput = {
      userAddress,
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { address: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const result = await this.findMany(
      where,
      {
        include: {
          categories: true,
        },
        orderBy: [{ categories: { order: 'asc' } }, { order: 'asc' }],
      },
      tx,
    );

    this.logger.debug(
      `Found ${result.length} entries matching search term: ${searchTerm}`,
    );
    return result as (AddressBook & { categories: any })[];
  }
}
