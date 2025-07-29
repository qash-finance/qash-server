import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  FindOneOptions,
  FindManyOptions,
} from 'typeorm';
import { AddressBookEntity } from './address-book.entity';
import { AddressBookDto } from './address-book.dto';
import { CategoryEntity } from './category.entity';

@Injectable()
export class AddressBookRepository {
  private readonly logger = new Logger(AddressBookRepository.name);

  constructor(
    @InjectRepository(AddressBookEntity)
    private readonly addressBookRepository: Repository<AddressBookEntity>,
  ) {}

  public async create(
    dto: Omit<Partial<AddressBookDto>, 'category'> & { category: CategoryEntity },
  ): Promise<AddressBookEntity> {
    try {
      const entity = this.addressBookRepository.create({
        ...dto,
        category: dto.category,
      });
      return await entity.save();
    } catch (error) {
      this.logger.error('Error creating address book entry:', error);
      throw error;
    }
  }

  public async findOne(
    where: FindOptionsWhere<AddressBookEntity>,
    options?: FindOneOptions<AddressBookEntity>,
  ): Promise<AddressBookEntity | null> {
    try {
      const addressBookEntity = await this.addressBookRepository.findOne({
        where,
        ...options,
      });

      return addressBookEntity;
    } catch (error) {
      this.logger.error('Error finding address book entry:', error);
      throw error;
    }
  }

  public async find(
    where: FindOptionsWhere<AddressBookEntity>,
    options?: FindManyOptions<AddressBookEntity>,
  ): Promise<AddressBookEntity[]> {
    try {
      return await this.addressBookRepository.find({
        where,
        order: {
          createdAt: 'DESC',
        },
        ...options,
      });
    } catch (error) {
      this.logger.error('Error finding address book entries:', error);
      throw error;
    }
  }
}
