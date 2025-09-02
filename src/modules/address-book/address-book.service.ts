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
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AddressBookService {
  private readonly logger = new Logger(AddressBookService.name);

  constructor(private readonly prisma: PrismaService) {}

  // *************************************************
  // **************** GET METHODS ******************
  // *************************************************
  async getAllAddressBookEntries(userAddress: string): Promise<AddressBook[]> {
    try {
      // Validate user address
      validateAddress(userAddress, 'userAddress');

      const normalizedUserAddress = normalizeAddress(userAddress);

      return this.prisma.addressBook.findMany({
        where: { userAddress: normalizedUserAddress },
        include: { categories: true },
      });
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

      const existingCategory = await this.prisma.addressBook.findFirst({
        where: {
          userAddress: normalizedUserAddress,
          categories: {
            name: sanitizedCategory,
          },
        },
      });
      return existingCategory !== null;
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
      let category = await this.prisma.categories.findFirst({
        where: { name: sanitizedCategory },
      });

      if (!category) {
        // Create new category if it doesn't exist
        category = await this.prisma.categories.create({
          data: {
            name: sanitizedCategory,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // Create the entry with normalized and sanitized data
      const createDto = {
        userAddress: normalizedUserAddress,
        address: normalizedAddress,
        name: sanitizedName,
        categoryId: category.id,
        token: normalizedToken,
      };

      return this.prisma.addressBook.create({
        data: {
          ...createDto,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: { categories: true },
      });
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
    const existingEntry = await this.prisma.addressBook.findFirst({
      where: {
        userAddress,
        name,
        categories: {
          name: category,
        },
      },
    });
    return existingEntry !== null;
  }

  private async isAddressBookAddressDuplicate(
    userAddress: string,
    address: string,
    category: string,
  ): Promise<boolean> {
    const existingEntry = await this.prisma.addressBook.findFirst({
      where: {
        userAddress,
        address,
        categories: {
          name: category,
        },
      },
    });
    return existingEntry !== null;
  }
}
