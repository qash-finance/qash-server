import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AddressBook, Prisma } from '@prisma/client';
import { BaseRepository } from '../../database/base.repository';

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
   * Find address book entries by category ID
   */
  async findByCategoryId(
    userAddress: string,
    categoryId: number,
  ): Promise<AddressBook[]> {
    return this.findMany({
      userAddress,
      categoryId,
    }, {
      orderBy: {
        order: 'asc',
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
    token?: any,
    email?: string,
  ): Promise<AddressBook> {
    const now = new Date();
    return this.create({
      userAddress,
      name,
      address,
      email,
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
      email?: string;
      token?: any;
      categoryId?: number;
    },
  ): Promise<AddressBook> {
    const updateData: any = {
      name: data.name,
      address: data.address,
      email: data.email,
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

  /**
   * Update entry order within a specific category
   */
  async updateEntryOrder(userAddress: string, categoryId: number, entryIds: number[]): Promise<AddressBook[]> {
    const updates = entryIds.map((id, index) => 
      this.update({ id, userAddress, categoryId }, { order: index + 1 })
    );
    
    await Promise.all(updates);
    
    // Return updated entries in the new order
    return this.findMany({
      userAddress,
      categoryId,
      id: { in: entryIds }
    }, {
      include: { categories: true },
      orderBy: {
        order: 'asc',
      },
    });
  }
}
