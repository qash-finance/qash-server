import { Injectable, Logger } from '@nestjs/common';
// import { AddressBookEntity } from './address-book.entity';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddressBook, Categories, Prisma } from '@prisma/client';

@Injectable()
export class AddressBookRepository {
  private readonly logger = new Logger(AddressBookRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async create(
    dto: Omit<Partial<AddressBook>, 'category'> & {
      category: Categories;
      userAddress: string;
    },
  ): Promise<AddressBook> {
    try {
      const now = new Date();
      const row = await this.prisma.addressBook.create({
        data: {
          createdAt: now,
          updatedAt: now,
          userAddress: dto.userAddress,
          name: dto.name,
          address: dto.address,
          token: dto.token ?? null,
          categoryId: dto.category.id,
        },
        include: { categories: true },
      });

      return row;
    } catch (error) {
      this.logger.error('Error creating address book entry:', error);
      throw error;
    }
  }

  public async findOne(
    where: Prisma.AddressBookWhereInput,
    options?: Prisma.AddressBookFindFirstArgs,
  ): Promise<AddressBook | null> {
    try {
      const row = await this.prisma.addressBook.findFirst({
        where,
        include: options?.include,
        orderBy: { createdAt: 'desc' },
      });

      if (!row) return null;
      return row;
    } catch (error) {
      this.logger.error('Error finding address book entry:', error);
      throw error;
    }
  }

  public async find(
    where: Prisma.AddressBookWhereInput,
    options?: Prisma.AddressBookFindManyArgs,
  ): Promise<AddressBook[]> {
    try {
      const rows = await this.prisma.addressBook.findMany({
        where,
        include: options?.include,
        orderBy: { createdAt: 'desc' },
        skip: options?.skip,
        take: options?.take,
      });
      return rows;
    } catch (error) {
      this.logger.error('Error finding address book entries:', error);
      throw error;
    }
  }
}
