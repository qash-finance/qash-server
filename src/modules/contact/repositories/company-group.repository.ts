import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CompanyGroup,
  CategoryShapeEnum,
  Prisma,
} from 'src/database/generated/client';
import {
  BaseRepository,
  PrismaTransactionClient,
} from '../../../database/base.repository';

@Injectable()
export class CompanyGroupRepository extends BaseRepository<
  CompanyGroup,
  Prisma.CompanyGroupWhereInput,
  Prisma.CompanyGroupCreateInput,
  Prisma.CompanyGroupUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel(tx?: PrismaTransactionClient) {
    return tx ? tx.companyGroup : this.prisma.companyGroup;
  }

  protected getModelName(): string {
    return 'CompanyGroup';
  }

  /**
   * Find group by name and company
   */
  async findByName(
    companyId: number,
    name: string,
    tx?: PrismaTransactionClient,
  ): Promise<CompanyGroup | null> {
    return this.findOne({ companyId, name }, tx);
  }

  /**
   * Get next order value for company
   */
  async getNextOrder(
    companyId: number,
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const model = this.getModel(tx);

    const lastCategory = await model.findFirst({
      where: { companyId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return (lastCategory?.order || 0) + 1;
  }

  /**
   * Update category order in batch
   */
  async updateCategoryOrder(
    companyId: number,
    categoryIds: number[],
    tx?: PrismaTransactionClient,
  ): Promise<CompanyGroup[]> {
    const model = this.getModel(tx);

    const updates = categoryIds.map((id, index) =>
      model.update({
        where: { id, companyId },
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
        companyId,
        id: { in: categoryIds },
      },
      {
        orderBy: { order: 'asc' },
      },
      tx,
    );
  }
}
