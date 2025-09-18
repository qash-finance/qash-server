import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  AddressBookDto,
  AddressBookNameDuplicateDto,
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
import { AddressBook } from '@prisma/client';
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

      if (dto.token) {
        validateAddress(dto.token, 'token');
      }

      // Normalize addresses
      const normalizedUserAddress = normalizeAddress(userAddress);
      const normalizedAddress = normalizeAddress(dto.address);
      const normalizedToken = dto.token
        ? normalizeAddress(dto.token)
        : undefined;

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

      if (!category) {
        // Create new category if it doesn't exist
        category =
          await this.categoryRepository.createByName(sanitizedCategory);
      }

      // Create the entry with normalized and sanitized data
      return this.addressBookRepository.createWithCategory(
        normalizedUserAddress,
        sanitizedName,
        normalizedAddress,
        category.id,
        normalizedToken,
      );
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
}
