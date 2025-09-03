import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export abstract class BaseRepository<
  TModel,
  TWhereInput,
  TCreateInput,
  TUpdateInput,
> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Find a single record by where condition
   */
  async findOne(where: TWhereInput): Promise<TModel | null> {
    try {
      return await this.getModel().findFirst({ where });
    } catch (error) {
      this.logger.error(`Error finding record:`, error);
      throw error;
    }
  }

  /**
   * Find multiple records by where condition
   */
  async findMany(
    where: TWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: any;
      include?: any;
      select?: any;
    },
  ): Promise<TModel[]> {
    try {
      return await this.getModel().findMany({
        where,
        ...options,
      });
    } catch (error) {
      this.logger.error(`Error finding records:`, error);
      throw error;
    }
  }

  /**
   * Create a new record
   */
  async create(data: TCreateInput): Promise<TModel> {
    try {
      const now = new Date();
      return await this.getModel().create({
        data: {
          createdAt: now,
          updatedAt: now,
          ...data,
        },
      });
    } catch (error) {
      this.logger.error(`Error creating record:`, error);
      throw error;
    }
  }

  /**
   * Create multiple records
   */
  async createMany(data: TCreateInput[]): Promise<{ count: number }> {
    try {
      const now = new Date();
      const dataWithTimestamps = data.map((item) => ({
        createdAt: now,
        updatedAt: now,
        ...item,
      }));

      return await this.getModel().createMany({
        data: dataWithTimestamps,
      });
    } catch (error) {
      this.logger.error(`Error creating multiple records:`, error);
      throw error;
    }
  }

  /**
   * Update a single record
   */
  async update(where: TWhereInput, data: TUpdateInput): Promise<TModel> {
    try {
      const existing = await this.findOne(where);
      if (!existing) {
        throw new Error('Record not found for update');
      }

      return await this.getModel().update({
        where: { id: (existing as any).id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error updating record:`, error);
      throw error;
    }
  }

  /**
   * Update multiple records
   */
  async updateMany(
    where: TWhereInput,
    data: TUpdateInput,
  ): Promise<{ count: number }> {
    try {
      return await this.getModel().updateMany({
        where,
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error updating multiple records:`, error);
      throw error;
    }
  }

  /**
   * Delete a single record
   */
  async delete(where: TWhereInput): Promise<TModel> {
    try {
      const existing = await this.findOne(where);
      if (!existing) {
        throw new Error('Record not found for deletion');
      }

      return await this.getModel().delete({
        where: { id: (existing as any).id },
      });
    } catch (error) {
      this.logger.error(`Error deleting record:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple records
   */
  async deleteMany(where: TWhereInput): Promise<{ count: number }> {
    try {
      return await this.getModel().deleteMany({ where });
    } catch (error) {
      this.logger.error(`Error deleting multiple records:`, error);
      throw error;
    }
  }

  /**
   * Count records
   */
  async count(where: TWhereInput): Promise<number> {
    try {
      return await this.getModel().count({ where });
    } catch (error) {
      this.logger.error(`Error counting records:`, error);
      throw error;
    }
  }

  /**
   * Abstract method to get the Prisma model
   * Must be implemented by child classes
   */
  protected abstract getModel(): any;
}
