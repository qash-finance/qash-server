import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Categories, Prisma } from '@prisma/client';
import { BaseRepository } from '../../common/repositories/base.repository';

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
  async findAll(): Promise<Categories[]> {
    return this.findMany({});
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
  async createByName(name: string): Promise<Categories> {
    const now = new Date();
    return this.create({
      name,
      createdAt: now,
      updatedAt: now,
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
}
