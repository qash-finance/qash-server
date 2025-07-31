import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CategoryEntity } from './category.entity';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly repository: Repository<CategoryEntity>,
  ) {}

  async find(options?: any): Promise<CategoryEntity[]> {
    return this.repository.find(options);
  }

  async findAll(): Promise<CategoryEntity[]> {
    return this.repository.find();
  }

  async findById(id: number): Promise<CategoryEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<CategoryEntity | null> {
    return this.repository.findOne({ where: { name } });
  }

  async create(category: Partial<CategoryEntity>): Promise<CategoryEntity> {
    const newCategory = this.repository.create(category);
    return this.repository.save(newCategory);
  }

  async update(
    id: number,
    category: Partial<CategoryEntity>,
  ): Promise<CategoryEntity | null> {
    await this.repository.update(id, category);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
