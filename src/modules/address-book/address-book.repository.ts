import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddressBook, Prisma } from '@prisma/client';
import { BaseRepository } from '../../common/repositories/base.repository';

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

  protected getModel() {
    return this.prisma.addressBook;
  }

  /**
   * Find all address book entries for a user with categories
   */
  async findByUserWithCategories(userAddress: string): Promise<AddressBook[]> {
    return this.findMany(
      { userAddress },
      {
        include: { categories: true },
      },
    );
  }

  /**
   * Find address book entry by user and name
   */
  async findByUserAndName(
    userAddress: string,
    name: string,
  ): Promise<AddressBook | null> {
    return this.findOne({ userAddress, name });
  }

  /**
   * Find address book entry by user and address
   */
  async findByUserAndAddress(
    userAddress: string,
    address: string,
  ): Promise<AddressBook | null> {
    return this.findOne({ userAddress, address });
  }

  /**
   * Find address book entries by category name
   */
  async findByCategoryName(
    userAddress: string,
    categoryName: string,
  ): Promise<AddressBook[]> {
    return this.findMany({
      userAddress,
      categories: {
        name: categoryName,
      },
    });
  }

  /**
   * Check if category exists for user
   */
  async categoryExistsForUser(
    userAddress: string,
    categoryName: string,
  ): Promise<boolean> {
    const entry = await this.findOne({
      userAddress,
      categories: {
        name: categoryName,
      },
    });
    return entry !== null;
  }

  /**
   * Create address book entry with category connection
   */
  async createWithCategory(
    userAddress: string,
    name: string,
    address: string,
    categoryId: number,
    token?: string,
  ): Promise<AddressBook> {
    const now = new Date();
    return this.create({
      userAddress,
      name,
      address,
      token,
      categories: {
        connect: { id: categoryId },
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Update address book entry
   */
  async updateEntry(
    id: number,
    data: {
      name?: string;
      address?: string;
      token?: string;
      categoryId?: number;
    },
  ): Promise<AddressBook> {
    const updateData: any = {
      name: data.name,
      address: data.address,
      token: data.token,
    };

    if (data.categoryId) {
      updateData.categories = {
        connect: { id: data.categoryId },
      };
    }

    return this.update({ id }, updateData);
  }

  /**
   * Delete address book entry by ID
   */
  async deleteById(id: number): Promise<AddressBook> {
    return this.delete({ id });
  }

  /**
   * Count entries by user
   */
  async countByUser(userAddress: string): Promise<number> {
    return this.count({ userAddress });
  }
}
