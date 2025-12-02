import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  Categories,
  CategoryShapeEnum,
  Prisma,
} from 'src/database/generated/client';
import {
  BaseRepository,
  PrismaTransactionClient,
} from '../../database/base.repository';

@Injectable()
export class CategoryRepository extends BaseRepository<
  Categories,
  Prisma.CategoriesWhereInput,
  Prisma.CategoriesCreateInput,
  Prisma.CategoriesUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel(tx?: PrismaTransactionClient) {
    return tx ? tx.categories : this.prisma.categories;
  }

  protected getModelName(): string {
    return 'Categories';
  }

  /**
   * Find all categories for owner
   */
  async findAll(
    ownerAddress: string,
    tx?: PrismaTransactionClient,
  ): Promise<Categories[]> {
    return this.findMany(
      {
        ownerAddress,
      },
      {
        orderBy: {
          order: 'asc',
        },
      },
      tx,
    );
  }

  /**
   * Find category by name
   */
  async findByName(
    name: string,
    tx?: PrismaTransactionClient,
  ): Promise<Categories | null> {
    return this.findOne({ name }, tx);
  }

  /**
   * Get next order value for owner
   */
  async getNextOrder(
    ownerAddress: string,
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const model = this.getModel(tx);

    const lastCategory = await model.findFirst({
      where: { ownerAddress },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return (lastCategory?.order || 0) + 1;
  }

  /**
   * Update category order in batch
   */
  async updateCategoryOrder(
    ownerAddress: string,
    categoryIds: number[],
    tx?: PrismaTransactionClient,
  ): Promise<Categories[]> {
    const model = this.getModel(tx);

    const updates = categoryIds.map((id, index) =>
      model.update({
        where: { id, ownerAddress },
        data: {
          order: index + 1,
          updatedAt: new Date(),
        },
      }),
    );

    await Promise.all(updates);

    // Return updated categories in the new order
    return this.findMany(
      {
        ownerAddress,
        id: { in: categoryIds },
      },
      {
        orderBy: { order: 'asc' },
      },
      tx,
    );
  }
}
