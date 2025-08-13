import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Categories, Prisma } from '@prisma/client';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(
    where: Prisma.CategoriesWhereInput,
    options?: Prisma.CategoriesFindManyArgs,
  ): Promise<Categories[]> {
    const rows = await this.prisma.categories.findMany({
      where,
      include: options?.include,
    });
    return rows;
  }

  async findAll(): Promise<Categories[]> {
    const rows = await this.prisma.categories.findMany();
    return rows;
  }

  async findById(id: number): Promise<Categories | null> {
    const row = await this.prisma.categories.findUnique({ where: { id } });
    return row;
  }

  async findByName(name: string): Promise<Categories | null> {
    const row = await this.prisma.categories.findUnique({ where: { name } });
    return row;
  }

  async create(category: Partial<Categories>): Promise<Categories> {
    const now = new Date();
    const row = await this.prisma.categories.create({
      data: { name: category.name as string, createdAt: now, updatedAt: now },
    });
    return row;
  }

  async update(
    id: number,
    category: Partial<Categories>,
  ): Promise<Categories | null> {
    const row = await this.prisma.categories.update({
      where: { id },
      data: { name: category.name as string, updatedAt: new Date() },
    });
    return row;
  }

  async delete(id: number): Promise<void> {
    await this.prisma.categories.delete({ where: { id } });
  }
}
