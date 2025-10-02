import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  AddressBookDto,
  AddressBookNameDuplicateDto,
  CategoryDto,
  CategoryOrderDto,
  UpdateAddressBookDto,
  DeleteAddressBookDto,
  AddressBookOrderDto,
} from './address-book.dto';
import { handleError } from '../../common/utils/errors';
import {
  validateAddress,
  validateName,
  validateCategory,
  normalizeAddress,
  validateDifferentAddresses,
  sanitizeString,
} from '../../common/utils/validation.util';
import { ErrorAddressBook } from '../../common/constants/errors';
import { AddressBook, Categories } from '@prisma/client';
import { AddressBookRepository } from './address-book.repository';
import { CategoryRepository } from './category.repository';

@Injectable()
export class AddressBookService {
  private readonly logger = new Logger(AddressBookService.name);

  constructor(
    private readonly addressBookRepository: AddressBookRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  // *************************************************
  // **************** GET METHODS ******************
  // *************************************************
  async getAllAddressBookEntries(userAddress: string): Promise<AddressBook[]> {
    try {
      // Validate user address
      validateAddress(userAddress, 'userAddress');

      const normalizedUserAddress = normalizeAddress(userAddress);

      return this.addressBookRepository.findByUserWithCategories(
        normalizedUserAddress,
      );
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async getAllCategories(userAddress: string): Promise<Categories[]> {
    try {
      // Validate user address
      validateAddress(userAddress, 'userAddress');

      const normalizedUserAddress = normalizeAddress(userAddress);

      return this.categoryRepository.findAll(normalizedUserAddress);
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async getAddressBookEntriesByCategory(
    userAddress: string,
    categoryId: number,
  ): Promise<AddressBook[]> {
    try {
      // Validate inputs
      validateAddress(userAddress, 'userAddress');
      
      if (!categoryId || categoryId <= 0) {
        throw new BadRequestException('Category ID must be a positive number');
      }

      const normalizedUserAddress = normalizeAddress(userAddress);

      return this.addressBookRepository.findByCategoryId(
        normalizedUserAddress,
        categoryId,
      );
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async checkIfAddressBookNameExists(dto: AddressBookNameDuplicateDto) {
    try {
      // Validate inputs
      validateAddress(dto.userAddress, 'userAddress');
      validateName(dto.name, 'name');
      validateCategory(dto.category, 'category');

      const normalizedUserAddress = normalizeAddress(dto.userAddress);
      const sanitizedName = sanitizeString(dto.name);
      const sanitizedCategory = sanitizeString(dto.category);

      const isNameDuplicate = await this.isAddressBookNameDuplicate(
        normalizedUserAddress,
        sanitizedName,
        sanitizedCategory,
      );
      return isNameDuplicate;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async checkIfCategoryExists(userAddress: string, category: string) {
    try {
      // Validate inputs
      validateAddress(userAddress, 'userAddress');
      validateCategory(category, 'category');

      const normalizedUserAddress = normalizeAddress(userAddress);
      const sanitizedCategory = sanitizeString(category);

      return this.addressBookRepository.categoryExistsForUser(
        normalizedUserAddress,
        sanitizedCategory,
      );
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** POST METHODS ******************
  // *************************************************
  async createNewAddressBookEntry(dto: AddressBookDto, userAddress: string) {
    try {
      // Validate all inputs
      validateAddress(userAddress, 'userAddress');
      validateAddress(dto.address, 'address');
      validateName(dto.name, 'name');
      validateCategory(dto.category, 'category');

      // Note: token is now a JSON object, no need for address validation

      // Normalize addresses
      const normalizedUserAddress = normalizeAddress(userAddress);
      const normalizedAddress = normalizeAddress(dto.address);

      // Check if user is trying to add their own address
      validateDifferentAddresses(
        normalizedUserAddress,
        normalizedAddress,
        'userAddress',
        'address',
      );

      // Sanitize string inputs
      const sanitizedName = sanitizeString(dto.name);
      const sanitizedCategory = sanitizeString(dto.category);
      const sanitizedEmail = dto.email ? sanitizeString(dto.email) : undefined;

      // Check if name is duplicate in the same category
      const isNameDuplicate = await this.isAddressBookNameDuplicate(
        normalizedUserAddress,
        sanitizedName,
        sanitizedCategory,
      );

      if (isNameDuplicate) {
        throw new BadRequestException(ErrorAddressBook.NameAlreadyExists);
      }

      // Check if address already exists in the same category
      const isAddressDuplicate = await this.isAddressBookAddressDuplicate(
        normalizedUserAddress,
        normalizedAddress,
        sanitizedCategory,
      );

      if (isAddressDuplicate) {
        throw new BadRequestException(ErrorAddressBook.AddressAlreadyExists);
      }

      // Find or create category
      let category =
        await this.categoryRepository.findByName(sanitizedCategory);

      // if (!category) {
      //   // Create new category if it doesn't exist
      //   category =
      //     await this.categoryRepository.createByName(sanitizedCategory);
      // }

      // Create the entry with normalized and sanitized data
      return this.addressBookRepository.createWithCategory(
        normalizedUserAddress,
        sanitizedName,
        normalizedAddress,
        category.id,
        dto.token,
        sanitizedEmail,
      );
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async createNewCategory (dto: CategoryDto, userAddress: string) {
    try {
      // Validate inputs
      validateAddress(userAddress, 'userAddress');
      validateCategory(dto.name, 'category');

      // Normalize addresses
      const normalizedUserAddress = normalizeAddress(userAddress);
      const sanitizedName = sanitizeString(dto.name);

      // Check if category already exists
      const isCategoryExists = await this.categoryRepository.findByName(sanitizedName);
      if (isCategoryExists) {
        throw new BadRequestException(ErrorAddressBook.CategoryAlreadyExists);
      }
      
      // Create new category
      const newCategory = await this.categoryRepository.createByName(normalizedUserAddress, sanitizedName, dto.color, dto.shape);
      return newCategory;

    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** PATCH METHODS ******************
  // *************************************************
  async updateAddressBookEntryOrder(
    dto: AddressBookOrderDto,
    userAddress: string,
  ): Promise<AddressBook[]> {
    try {
      // Validate user address
      validateAddress(userAddress, 'userAddress');

      const normalizedUserAddress = normalizeAddress(userAddress);

      // Validate category ID
      if (!dto.categoryId || dto.categoryId <= 0) {
        throw new BadRequestException('Category ID must be a positive number');
      }

      // Validate that all entry IDs are provided
      if (!dto.entryIds || dto.entryIds.length === 0) {
        throw new BadRequestException('Entry IDs array cannot be empty');
      }

      // Check if category exists and belongs to the user
      const category = await this.categoryRepository.findById(dto.categoryId);
      if (!category || category.ownerAddress !== normalizedUserAddress) {
        throw new BadRequestException('Category not found or does not belong to user');
      }

      // Check if all entries belong to the user and are in the specified category
      const userEntriesInCategory = await this.addressBookRepository.findByCategoryId(
        normalizedUserAddress,
        dto.categoryId,
      );
      const userEntryIds = userEntriesInCategory.map(entry => entry.id);
      
      const invalidIds = dto.entryIds.filter(id => !userEntryIds.includes(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException(`Invalid entry IDs: ${invalidIds.join(', ')}`);
      }

      // Check if all user entries in this category are included
      const missingIds = userEntryIds.filter(id => !dto.entryIds.includes(id));
      if (missingIds.length > 0) {
        throw new BadRequestException(`Missing entry IDs: ${missingIds.join(', ')}`);
      }

      return this.addressBookRepository.updateEntryOrder(normalizedUserAddress, dto.categoryId, dto.entryIds);
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async deleteAddressBookEntries(
    ids: number[],
    userAddress: string,
  ): Promise<{ deletedCount: number; deletedIds: number[] }> {
    try {
      // Validate user address
      validateAddress(userAddress, 'userAddress');

      if (!ids || ids.length === 0) {
        throw new BadRequestException('IDs array cannot be empty');
      }

      // Validate all IDs are positive numbers
      const invalidIds = ids.filter(id => !id || id <= 0);
      if (invalidIds.length > 0) {
        throw new BadRequestException(`Invalid IDs: ${invalidIds.join(', ')}`);
      }

      const normalizedUserAddress = normalizeAddress(userAddress);

      // Check if all entries exist and belong to the user
      const existingEntries = await this.addressBookRepository.findMany({
        id: { in: ids },
        userAddress: normalizedUserAddress,
      });

      if (existingEntries.length !== ids.length) {
        const existingIds = existingEntries.map(entry => entry.id);
        const missingIds = ids.filter(id => !existingIds.includes(id));
        throw new BadRequestException(`Address book entries not found or do not belong to user: ${missingIds.join(', ')}`);
      }

      // Delete all entries
      const deletePromises = ids.map(id => 
        this.addressBookRepository.deleteById(id)
      );

      await Promise.all(deletePromises);

      return {
        deletedCount: ids.length,
        deletedIds: ids,
      };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async updateAddressBookEntry(
    id: number,
    dto: UpdateAddressBookDto,
    userAddress: string,
  ): Promise<AddressBook> {
    try {
      // Validate user address
      validateAddress(userAddress, 'userAddress');

      if (!id || id <= 0) {
        throw new BadRequestException('ID must be a positive number');
      }

      const normalizedUserAddress = normalizeAddress(userAddress);

      // Check if the address book entry exists and belongs to the user
      const existingEntry = await this.addressBookRepository.findOne({
        id,
        userAddress: normalizedUserAddress,
      });

      if (!existingEntry) {
        throw new BadRequestException('Address book entry not found or does not belong to user');
      }

      // Prepare update data
      const updateData: any = {};

      // Validate and normalize address if provided
      if (dto.address !== undefined) {
        validateAddress(dto.address, 'address');
        const normalizedAddress = normalizeAddress(dto.address);
        
        // Check if user is trying to update to their own address
        validateDifferentAddresses(
          normalizedUserAddress,
          normalizedAddress,
          'userAddress',
          'address',
        );

        // Check if address already exists in the same category (excluding current entry)
        const isAddressDuplicate = await this.isAddressBookAddressDuplicateForUpdate(
          normalizedUserAddress,
          normalizedAddress,
          existingEntry.categoryId,
          id,
        );

        if (isAddressDuplicate) {
          throw new BadRequestException(ErrorAddressBook.AddressAlreadyExists);
        }

        updateData.address = normalizedAddress;
      }

      // Validate and sanitize name if provided
      if (dto.name !== undefined) {
        validateName(dto.name, 'name');
        const sanitizedName = sanitizeString(dto.name);

        // Check if name is duplicate in the same category (excluding current entry)
        const isNameDuplicate = await this.isAddressBookNameDuplicateForUpdate(
          normalizedUserAddress,
          sanitizedName,
          existingEntry.categoryId,
          id,
        );

        if (isNameDuplicate) {
          throw new BadRequestException(ErrorAddressBook.NameAlreadyExists);
        }

        updateData.name = sanitizedName;
      }

      // Validate and sanitize email if provided
      if (dto.email !== undefined) {
        const sanitizedEmail = dto.email ? sanitizeString(dto.email) : undefined;
        updateData.email = sanitizedEmail;
      }

      // Add token if provided
      if (dto.token !== undefined) {
        updateData.token = dto.token;
      }

      // Validate category if provided
      if (dto.categoryId !== undefined) {
        if (!dto.categoryId || dto.categoryId <= 0) {
          throw new BadRequestException('Category ID must be a positive number');
        }

        // Check if category exists and belongs to the user
        const category = await this.categoryRepository.findById(dto.categoryId);
        if (!category || category.ownerAddress !== normalizedUserAddress) {
          throw new BadRequestException('Category not found or does not belong to user');
        }

        updateData.categoryId = dto.categoryId;
      }

      // Update the entry
      return this.addressBookRepository.updateEntry(id, updateData);
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async updateCategoryOrder(dto: CategoryOrderDto, userAddress: string): Promise<Categories[]> {
    try {
      // Validate user address
      validateAddress(userAddress, 'userAddress');

      const normalizedUserAddress = normalizeAddress(userAddress);

      // Validate that all category IDs are provided
      if (!dto.categoryIds || dto.categoryIds.length === 0) {
        throw new BadRequestException('Category IDs array cannot be empty');
      }

      // Check if all categories belong to the user
      const userCategories = await this.categoryRepository.findAll(normalizedUserAddress);
      const userCategoryIds = userCategories.map(cat => cat.id);
      
      const invalidIds = dto.categoryIds.filter(id => !userCategoryIds.includes(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException(`Invalid category IDs: ${invalidIds.join(', ')}`);
      }

      // Check if all user categories are included
      const missingIds = userCategoryIds.filter(id => !dto.categoryIds.includes(id));
      if (missingIds.length > 0) {
        throw new BadRequestException(`Missing category IDs: ${missingIds.join(', ')}`);
      }

      return this.categoryRepository.updateCategoryOrder(normalizedUserAddress, dto.categoryIds);
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** UTIL METHODS ******************
  // *************************************************
  private async isAddressBookNameDuplicate(
    userAddress: string,
    name: string,
    category: string,
  ): Promise<boolean> {
    const existingEntry = await this.addressBookRepository.findOne({
      userAddress,
      name,
      categories: {
        name: category,
      },
    });
    return existingEntry !== null;
  }

  private async isAddressBookAddressDuplicate(
    userAddress: string,
    address: string,
    category: string,
  ): Promise<boolean> {
    const existingEntry = await this.addressBookRepository.findOne({
      userAddress,
      address,
      categories: {
        name: category,
      },
    });
    return existingEntry !== null;
  }

  private async isAddressBookNameDuplicateForUpdate(
    userAddress: string,
    name: string,
    categoryId: number,
    excludeId: number,
  ): Promise<boolean> {
    const existingEntry = await this.addressBookRepository.findOne({
      userAddress,
      name,
      categoryId,
      id: {
        not: excludeId,
      },
    });
    return existingEntry !== null;
  }

  private async isAddressBookAddressDuplicateForUpdate(
    userAddress: string,
    address: string,
    categoryId: number,
    excludeId: number,
  ): Promise<boolean> {
    const existingEntry = await this.addressBookRepository.findOne({
      userAddress,
      address,
      categoryId,
      id: {
        not: excludeId,
      },
    });
    return existingEntry !== null;
  }
}
