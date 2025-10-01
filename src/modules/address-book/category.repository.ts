import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Categories, CategoryShapeEnum, Prisma } from '@prisma/client';
import { BaseRepository } from '../../database/base.repository';

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

  protected getModel() {
    return this.prisma.categories;
  }

  /**
   * Find all categories
   */
  async findAll(ownerAddress: string): Promise<Categories[]> {
    return this.findMany({
      ownerAddress,
    }, {
      orderBy: {
        order: 'asc',
      },
    });
  }

  /**
   * Find category by ID
   */
  async findById(id: number): Promise<Categories | null> {
    return this.findOne({ id });
  }

  /**
   * Find category by name
   */
  async findByName(name: string): Promise<Categories | null> {
    return this.findOne({ name });
  }

  /**
   * Create category with name
   */
  async createByName(ownerAddress: string, name: string, color: string, shape: CategoryShapeEnum): Promise<Categories> {
    const now = new Date();
    return this.create({
      name,
      color,
      shape,
      ownerAddress,
      createdAt: now,
      updatedAt: now
    });
  }

  /**
   * Update category name
   */
  async updateName(id: number, name: string): Promise<Categories> {
    return this.update({ id }, { name });
  }

  /**
   * Delete category by ID
   */
  async deleteById(id: number): Promise<Categories> {
    return this.delete({ id });
  }

  /**
   * Update category order
   */
  async updateCategoryOrder(ownerAddress: string, categoryIds: number[]): Promise<Categories[]> {
    const updates = categoryIds.map((id, index) => 
      this.update({ id, ownerAddress }, { order: index + 1 })
    );
    
    await Promise.all(updates);
    
    // Return updated categories in the new order
    return this.findMany({
      ownerAddress,
      id: { in: categoryIds }
    });
  }
}
