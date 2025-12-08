import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateContactDto,
  UpdateAddressBookDto,
  AddressBookOrderDto,
  CreateCompanyGroupDto,
} from '../contact.dto';
import { handleError } from '../../../common/utils/errors';
import {
  validateAddress,
  validateName,
  validateCategory,
  normalizeAddress,
  validateDifferentAddresses,
  sanitizeString,
} from '../../../common/utils/validation.util';
import { ErrorAddressBook } from '../../../common/constants/errors';
import { PrismaService } from '../../../database/prisma.service';
import { CompanyContact, Prisma } from 'src/database/generated/client';
import {
  PaginationOptions,
  PaginatedResult,
} from '../../../database/base.repository';
import { CompanyService } from '../../company/company.service';
import { TeamMemberRepository } from '../../team-member/team-member.repository';
import { TeamMemberRoleEnum } from '../../../database/generated/enums';
import { sanitizeInput } from 'src/common/utils/sanitize';
import { CompanyGroupRepository } from '../repositories/company-group.repository';
import { CompanyContactRepository } from '../repositories/company-contact.repository';
import { CompanyModel } from 'src/database/generated/models';

export interface AddressBookWithCategory extends CompanyContact {
  categories: {
    id: number;
    name: string;
    shape: string;
    color: string;
    order: number;
  };
}

@Injectable()
export class CompanyContactService {
  private readonly logger = new Logger(CompanyContactService.name);

  constructor(
    private readonly companyContactRepository: CompanyContactRepository,
    private readonly companyGroupRepository: CompanyGroupRepository,
    private readonly prisma: PrismaService,
  ) {}

  // /**
  //  * Check if user has read access to company address book
  //  */
  // private async checkReadAccess(
  //   companyId: number,
  //   userId: number,
  // ): Promise<void> {
  //   const hasAccess = await this.teamMemberRepository.hasPermission(
  //     companyId,
  //     userId,
  //     [
  //       TeamMemberRoleEnum.OWNER,
  //       TeamMemberRoleEnum.ADMIN,
  //       TeamMemberRoleEnum.VIEWER,
  //     ],
  //   );

  //   if (!hasAccess) {
  //     throw new BadRequestException('Access denied to company address book');
  //   }
  // }

  // /**
  //  * Check if user has write access to company address book
  //  */
  // private async checkWriteAccess(
  //   companyId: number,
  //   userId: number,
  // ): Promise<void> {
  //   const hasAccess = await this.teamMemberRepository.hasPermission(
  //     companyId,
  //     userId,
  //     [TeamMemberRoleEnum.OWNER, TeamMemberRoleEnum.ADMIN],
  //   );

  //   if (!hasAccess) {
  //     throw new BadRequestException(
  //       'Insufficient permissions to modify address book',
  //     );
  //   }
  // }

  // /**
  //  * Validate company exists and user has access
  //  */
  // private async validateCompanyAccess(
  //   companyId: number,
  //   userId: number,
  //   requireWrite = false,
  // ): Promise<void> {
  //   await this.companyService.validateCompanyAccess(companyId, userId);

  //   if (requireWrite) {
  //     await this.checkWriteAccess(companyId, userId);
  //   } else {
  //     await this.checkReadAccess(companyId, userId);
  //   }
  // }

  // // *************************************************
  // // **************** GET METHODS ******************
  // // *************************************************

  // /**
  //  * Get all address book entries for a user with pagination
  //  */
  // async getAllAddressBookEntries(
  //   companyId: number,
  //   userId: number,
  //   pagination?: PaginationOptions,
  // ): Promise<
  //   PaginatedResult<AddressBookWithCategory> | AddressBookWithCategory[]
  // > {
  //   return this.executeWithErrorHandling(
  //     async () => {
  //       // Validate company access
  //       await this.validateCompanyAccess(companyId, userId);

  //       if (pagination) {
  //         return this.addressBookRepository.findByCompanyWithCategoriesPaginated(
  //           companyId,
  //           pagination,
  //         );
  //       }

  //       const entries =
  //         await this.addressBookRepository.findByCompanyWithCategories(
  //           companyId,
  //         );
  //       return entries as AddressBookWithCategory[];
  //     },
  //     'getAllAddressBookEntries',
  //     { companyId, userId },
  //   );
  // }

  // /**
  //  * Get all categories for a user
  //  */
  // async getAllCategories(
  //   userAddress: string,
  // ): Promise<Prisma.CategoriesGetPayload<{}>[]> {
  //   return this.executeWithErrorHandling(
  //     async () => {
  //       validateAddress(userAddress, 'userAddress');
  //       const normalizedUserAddress = normalizeAddress(userAddress);
  //       return this.categoryRepository.findAll(normalizedUserAddress);
  //     },
  //     'getAllCategories',
  //     { userAddress },
  //   );
  // }

  // /**
  //  * Get address book entries by category
  //  */
  // async getEntriesByCategory(
  //   userAddress: string,
  //   categoryId: number,
  // ): Promise<AddressBook[]> {
  //   return this.executeWithErrorHandling(
  //     async () => {
  //       validateAddress(userAddress, 'userAddress');
  //       const normalizedUserAddress = normalizeAddress(userAddress);
  //       return this.addressBookRepository.findByCategory(
  //         normalizedUserAddress,
  //         categoryId,
  //       );
  //     },
  //     'getEntriesByCategory',
  //     { userAddress, categoryId },
  //   );
  // }

  // /**
  //  * Search address book entries
  //  */
  // async searchEntries(
  //   userAddress: string,
  //   searchTerm: string,
  //   categoryId?: number,
  // ): Promise<AddressBookWithCategory[]> {
  //   return this.executeWithErrorHandling(
  //     async () => {
  //       validateAddress(userAddress, 'userAddress');

  //       if (!searchTerm || searchTerm.trim().length < 2) {
  //         throw new BadRequestException(
  //           'Search term must be at least 2 characters long',
  //         );
  //       }

  //       const normalizedUserAddress = normalizeAddress(userAddress);

  //       return this.addressBookRepository.searchEntries(
  //         normalizedUserAddress,
  //         searchTerm.trim(),
  //         categoryId,
  //       ) as Promise<AddressBookWithCategory[]>;
  //     },
  //     'searchEntries',
  //     { userAddress, searchTerm, categoryId },
  //   );
  // }

  // /**
  //  * Get a single address book entry by ID
  //  */
  // async getEntryById(
  //   id: number,
  //   userAddress: string,
  // ): Promise<AddressBookWithCategory> {
  //   return this.executeWithErrorHandling(
  //     async () => {
  //       validateAddress(userAddress, 'userAddress');
  //       const normalizedUserAddress = normalizeAddress(userAddress);

  //       const entry = await this.addressBookRepository.findOne({
  //         id,
  //         userAddress: normalizedUserAddress,
  //       });

  //       if (!entry) {
  //         throw new NotFoundException('Address book entry not found');
  //       }

  //       // Get entry with category info
  //       const entryWithCategory = await this.addressBookRepository.findMany(
  //         { id, userAddress: normalizedUserAddress },
  //         { include: { categories: true } },
  //       );

  //       return entryWithCategory[0] as AddressBookWithCategory;
  //     },
  //     'getEntryById',
  //     { id, userAddress },
  //   );
  // }

  //# region POST METHODS service
  // *************************************************
  // **************** POST METHODS ******************
  // *************************************************

  /**
   * Create a new group
   */
  async createNewCompanyGroup(
    dto: CreateCompanyGroupDto,
    company: CompanyModel,
  ) {
    // return this.prisma.executeInTransaction(async (tx) => {
    //   dto = sanitizeInput(dto);
    //   // Check if group already exists
    //   const existingCompanyGroup = await this.companyGroupRepository.findOne({
    //     name: dto.name,
    //     shape: dto.shape,
    //   });
    //   if (existingCompanyGroup) {
    //     throw new BadRequestException('Company group already exists');
    //   }
    //   // Get next order
    //   const order = await this.companyGroupRepository.getNextOrder(
    //     company.id,
    //     tx,
    //   );
    //   const newCompanyGroup = await this.companyGroupRepository.create(
    //     {
    //       name: dto.name,
    //       shape: dto.shape,
    //       color: dto.color,
    //       order,
    //       company: { connect: { id: company.id } },
    //       createdAt: new Date(),
    //       updatedAt: new Date(),
    //     },
    //     tx,
    //   );
    //   this.logger.log(
    //     `Created category: ${newCompanyGroup.name} for company: ${company.companyName}`,
    //   );
    //   return newCompanyGroup;
    // }, 'createNewCompanyGroup');
  }

  /**
   * Create a new address book entry with proper validation and transaction handling
   */
  async createNewCompanyGroupContact(
    dto: CreateContactDto,
    company: CompanyModel,
  ): Promise<CompanyContact> {
    return this.prisma.executeInTransaction(async (tx) => {
      dto = sanitizeInput(dto);

      // Find if the group exists for this company
      let group = await this.companyGroupRepository.findByName(
        company.id,
        dto.group,
      );
      if (!group) {
        throw new BadRequestException(
          'Category does not exist for this company',
        );
      }

      // Find if the new contact name already exists in the group
      const isNameDuplicate = await this.companyContactRepository.findOne({
        name: dto.name,
      });

      if (isNameDuplicate) {
        throw new BadRequestException(ErrorAddressBook.NameAlreadyExists);
      }

      // Get next order for the category
      const order = await this.companyContactRepository.getNextOrderForGroup(
        company.id,
        group.id,
        tx,
      );

      // Create the entry
      const newEntry = await this.companyContactRepository.create(
        {
          company: { connect: { id: company.id } },
          group: { connect: { id: group.id } },
          name: dto.name,
          walletAddress: dto.walletAddress,
          email: dto.email || null,
          token: dto.token ? JSON.parse(JSON.stringify(dto.token)) : null,
          network: dto.network ? JSON.parse(JSON.stringify(dto.network)) : null,
          order,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        tx,
      );

      this.logger.log(
        `Created contact: ${newEntry.name} for company: ${company.companyName}`,
      );
      return newEntry;
    }, 'createNewCompanyGroupContact');
  }
  //#endregion POST METHODS service

  // // *************************************************
  // // **************** PUT METHODS ******************
  // // *************************************************

  // /**
  //  * Update an existing address book entry
  //  */
  // async updateAddressBookEntry(
  //   entryId: number,
  //   dto: UpdateAddressBookDto,
  //   userAddress: string,
  // ): Promise<AddressBook> {
  //   return this.executeInTransaction(
  //     async (tx) => {
  //       validateAddress(userAddress, 'userAddress');
  //       const normalizedUserAddress = normalizeAddress(userAddress);

  //       // Find existing entry
  //       const existingEntry = await this.addressBookRepository.findOneOrFail(
  //         { id: entryId, userAddress: normalizedUserAddress },
  //         tx,
  //       );

  //       // Validate and sanitize update data
  //       const updateData: any = {};

  //       if (dto.name !== undefined) {
  //         validateName(dto.name, 'name');
  //         updateData.name = sanitizeString(dto.name);

  //         // Check name duplicate if name is being changed
  //         if (updateData.name !== existingEntry.name) {
  //           const isDuplicate =
  //             await this.addressBookRepository.isNameDuplicateInCategory(
  //               normalizedUserAddress,
  //               updateData.name,
  //               existingEntry.categoryId,
  //               entryId,
  //               tx,
  //             );

  //           if (isDuplicate) {
  //             throw new BadRequestException(ErrorAddressBook.NameAlreadyExists);
  //           }
  //         }
  //       }

  //       if (dto.address !== undefined) {
  //         validateAddress(dto.address, 'address');
  //         const normalizedAddress = normalizeAddress(dto.address);

  //         validateDifferentAddresses(
  //           normalizedUserAddress,
  //           normalizedAddress,
  //           'userAddress',
  //           'address',
  //         );

  //         updateData.address = normalizedAddress;

  //         // Check address duplicate if address is being changed
  //         if (updateData.address !== existingEntry.address) {
  //           const isDuplicate =
  //             await this.addressBookRepository.isAddressDuplicateInCategory(
  //               normalizedUserAddress,
  //               updateData.address,
  //               existingEntry.categoryId,
  //               entryId,
  //               tx,
  //             );

  //           if (isDuplicate) {
  //             throw new BadRequestException(
  //               ErrorAddressBook.AddressAlreadyExists,
  //             );
  //           }
  //         }
  //       }

  //       if (dto.email !== undefined) {
  //         updateData.email = dto.email ? sanitizeString(dto.email) : null;
  //       }

  //       if (dto.token !== undefined) {
  //         updateData.token = dto.token;
  //       }

  //       // Update the entry
  //       const updatedEntry = await this.addressBookRepository.update(
  //         { id: entryId, userAddress: normalizedUserAddress },
  //         updateData,
  //         tx,
  //       );

  //       this.logger.log(
  //         `Updated address book entry: ${updatedEntry.id} for user: ${normalizedUserAddress}`,
  //       );
  //       return updatedEntry;
  //     },
  //     'updateAddressBookEntry',
  //     { entryId, userAddress },
  //   );
  // }

  // /**
  //  * Update order of multiple entries
  //  */
  // async updateEntriesOrder(
  //   orderUpdates: AddressBookOrderDto[],
  //   userAddress: string,
  // ): Promise<void> {
  //   return this.executeInTransaction(
  //     async (tx) => {
  //       validateAddress(userAddress, 'userAddress');
  //       const normalizedUserAddress = normalizeAddress(userAddress);

  //       // Validate all entries belong to the user
  //       const entryIds = orderUpdates.map((update) => update.id);
  //       const entries = await this.addressBookRepository.findMany(
  //         {
  //           id: { in: entryIds },
  //           userAddress: normalizedUserAddress,
  //         },
  //         {},
  //         tx,
  //       );

  //       if (entries.length !== entryIds.length) {
  //         throw new NotFoundException(
  //           'Some entries not found or do not belong to user',
  //         );
  //       }

  //       // Update orders in batch
  //       await this.addressBookRepository.updateOrdersInBatch(
  //         orderUpdates.map((update) => ({
  //           id: update.id,
  //           order: update.order,
  //         })),
  //         tx,
  //       );

  //       this.logger.log(
  //         `Updated order for ${orderUpdates.length} entries for user: ${normalizedUserAddress}`,
  //       );
  //     },
  //     'updateEntriesOrder',
  //     { userAddress, entriesCount: orderUpdates.length },
  //   );
  // }

  // // *************************************************
  // // **************** DELETE METHODS ****************
  // // *************************************************

  // /**
  //  * Delete an address book entry
  //  */
  // async deleteAddressBookEntry(
  //   entryId: number,
  //   userAddress: string,
  // ): Promise<void> {
  //   return this.executeInTransaction(
  //     async (tx) => {
  //       validateAddress(userAddress, 'userAddress');
  //       const normalizedUserAddress = normalizeAddress(userAddress);

  //       const deletedEntry = await this.addressBookRepository.delete(
  //         { id: entryId, userAddress: normalizedUserAddress },
  //         tx,
  //       );

  //       this.logger.log(
  //         `Deleted address book entry: ${deletedEntry.id} for user: ${normalizedUserAddress}`,
  //       );
  //     },
  //     'deleteAddressBookEntry',
  //     { entryId, userAddress },
  //   );
  // }

  // /**
  //  * Bulk delete address book entries
  //  */
  // async bulkDeleteEntries(ids: number[], userAddress: string): Promise<void> {
  //   return this.executeInTransaction(
  //     async (tx) => {
  //       validateAddress(userAddress, 'userAddress');
  //       const normalizedUserAddress = normalizeAddress(userAddress);

  //       // Validate all entries belong to the user
  //       const entries = await this.addressBookRepository.findMany(
  //         {
  //           id: { in: ids },
  //           userAddress: normalizedUserAddress,
  //         },
  //         {},
  //         tx,
  //       );

  //       if (entries.length !== ids.length) {
  //         throw new NotFoundException(
  //           'Some entries not found or do not belong to user',
  //         );
  //       }

  //       // Delete all entries
  //       await this.addressBookRepository.deleteMany(
  //         {
  //           id: { in: ids },
  //           userAddress: normalizedUserAddress,
  //         },
  //         tx,
  //       );

  //       this.logger.log(
  //         `Bulk deleted ${ids.length} entries for user: ${normalizedUserAddress}`,
  //       );
  //     },
  //     'bulkDeleteEntries',
  //     { userAddress, entriesCount: ids.length },
  //   );
  // }

  // // *************************************************
  // // **************** BULK OPERATIONS ***************
  // // *************************************************

  // /**
  //  * Bulk import address book entries
  //  */
  // async bulkImportEntries(
  //   entries: AddressBookDto[],
  //   userAddress: string,
  // ): Promise<AddressBook[]> {
  //   return this.executeInTransaction(
  //     async (tx) => {
  //       validateAddress(userAddress, 'userAddress');
  //       const normalizedUserAddress = normalizeAddress(userAddress);

  //       // Validate all entries
  //       for (const entry of entries) {
  //         validateAddress(entry.address, 'address');
  //         validateName(entry.name, 'name');
  //         validateCategory(entry.category, 'category');
  //       }

  //       // Process entries and get category IDs
  //       const processedEntries = [];

  //       for (const entry of entries) {
  //         const sanitizedData = this.sanitizeInput({
  //           name: entry.name,
  //           category: entry.category,
  //           email: entry.email,
  //         });

  //         const category = await this.categoryRepository.findByName(
  //           sanitizedData.category,
  //         );
  //         if (!category) {
  //           throw new BadRequestException(
  //             `Category '${sanitizedData.category}' does not exist`,
  //           );
  //         }

  //         processedEntries.push({
  //           name: sanitizedData.name,
  //           address: normalizeAddress(entry.address),
  //           categoryId: category.id,
  //           email: sanitizedData.email,
  //           token: entry.token,
  //         });
  //       }

  //       // Bulk upsert entries
  //       const importedEntries =
  //         await this.addressBookRepository.bulkUpsertEntries(
  //           normalizedUserAddress,
  //           processedEntries,
  //           tx,
  //         );

  //       this.logger.log(
  //         `Bulk imported ${importedEntries.length} entries for user: ${normalizedUserAddress}`,
  //       );
  //       return importedEntries;
  //     },
  //     'bulkImportEntries',
  //     { userAddress, entriesCount: entries.length },
  //   );
  // }

  // // *************************************************
  // // **************** UTILITY METHODS ***************
  // // *************************************************

  // /**
  //  * Get statistics for user's address book
  //  */
  // async getStatistics(userAddress: string) {
  //   return this.executeWithErrorHandling(
  //     async () => {
  //       validateAddress(userAddress, 'userAddress');
  //       const normalizedUserAddress = normalizeAddress(userAddress);

  //       const [totalEntries, categories] = await Promise.all([
  //         this.addressBookRepository.count({
  //           userAddress: normalizedUserAddress,
  //         }),
  //         this.categoryRepository.findAll(normalizedUserAddress),
  //       ]);

  //       const recentEntries = await this.addressBookRepository.findMany({
  //         userAddress: normalizedUserAddress,
  //         createdAt: {
  //           gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  //         },
  //       });

  //       const entriesByCategory: Record<string, number> = {};
  //       for (const category of categories) {
  //         const count = await this.addressBookRepository.count({
  //           userAddress: normalizedUserAddress,
  //           categoryId: category.id,
  //         });
  //         entriesByCategory[category.name] = count;
  //       }

  //       return {
  //         totalEntries,
  //         totalCategories: categories.length,
  //         entriesByCategory,
  //         recentlyAdded: recentEntries.length,
  //       };
  //     },
  //     'getStatistics',
  //     { userAddress },
  //   );
  // }

  // /**
  //  * Duplicate an existing entry
  //  */
  // async duplicateEntry(id: number, userAddress: string): Promise<AddressBook> {
  //   return this.executeInTransaction(
  //     async (tx) => {
  //       validateAddress(userAddress, 'userAddress');
  //       const normalizedUserAddress = normalizeAddress(userAddress);

  //       // Find the entry to duplicate
  //       const originalEntry = await this.addressBookRepository.findOneOrFail(
  //         { id, userAddress: normalizedUserAddress },
  //         tx,
  //       );

  //       // Create a copy with modified name
  //       const duplicatedEntry = await this.addressBookRepository.create(
  //         {
  //           userAddress: normalizedUserAddress,
  //           name: `${originalEntry.name} (Copy)`,
  //           address: originalEntry.address,
  //           email: originalEntry.email,
  //           token: originalEntry.token,
  //           categories: {
  //             connect: { id: originalEntry.categoryId },
  //           },
  //           order: await this.addressBookRepository.getNextOrderForCategory(
  //             normalizedUserAddress,
  //             originalEntry.categoryId,
  //             tx,
  //           ),
  //           createdAt: new Date(),
  //           updatedAt: new Date(),
  //         },
  //         tx,
  //       );

  //       this.logger.log(
  //         `Duplicated entry ${id} to ${duplicatedEntry.id} for user: ${normalizedUserAddress}`,
  //       );
  //       return duplicatedEntry;
  //     },
  //     'duplicateEntry',
  //     { id, userAddress },
  //   );
  // }

  // // *************************************************
  // // **************** VALIDATION HELPERS ************
  // // *************************************************

  // /**
  //  * Check if address book name is duplicate in category
  //  */
  // async isAddressBookNameDuplicate(
  //   userAddress: string,
  //   name: string,
  //   category: string,
  // ): Promise<boolean> {
  //   return this.executeWithErrorHandling(
  //     async () => {
  //       validateAddress(userAddress, 'userAddress');
  //       validateName(name, 'name');
  //       validateCategory(category, 'category');

  //       const normalizedUserAddress = normalizeAddress(userAddress);
  //       const sanitizedName = sanitizeString(name);
  //       const sanitizedCategory = sanitizeString(category);

  //       const categoryObj =
  //         await this.categoryRepository.findByName(sanitizedCategory);
  //       if (!categoryObj) {
  //         return false;
  //       }

  //       return this.addressBookRepository.isNameDuplicateInCategory(
  //         normalizedUserAddress,
  //         sanitizedName,
  //         categoryObj.id,
  //       );
  //     },
  //     'isAddressBookNameDuplicate',
  //     { userAddress, name, category },
  //   );
  // }

  // /**
  //  * Check if address book address is duplicate in category
  //  */
  // async isAddressBookAddressDuplicate(
  //   userAddress: string,
  //   address: string,
  //   category: string,
  // ): Promise<boolean> {
  //   return this.executeWithErrorHandling(
  //     async () => {
  //       validateAddress(userAddress, 'userAddress');
  //       validateAddress(address, 'address');
  //       validateCategory(category, 'category');

  //       const normalizedUserAddress = normalizeAddress(userAddress);
  //       const normalizedAddress = normalizeAddress(address);
  //       const sanitizedCategory = sanitizeString(category);

  //       const categoryObj =
  //         await this.categoryRepository.findByName(sanitizedCategory);
  //       if (!categoryObj) {
  //         return false;
  //       }

  //       return this.addressBookRepository.isAddressDuplicateInCategory(
  //         normalizedUserAddress,
  //         normalizedAddress,
  //         categoryObj.id,
  //       );
  //     },
  //     'isAddressBookAddressDuplicate',
  //     { userAddress, address, category },
  //   );
  // }

  // /**
  //  * Check if category exists
  //  */
  // async checkIfCategoryExists(userAddress: string, category: string) {
  //   return this.executeWithErrorHandling(
  //     async () => {
  //       validateAddress(userAddress, 'userAddress');
  //       validateCategory(category, 'category');

  //       const sanitizedCategory = sanitizeString(category);
  //       const categoryObj =
  //         await this.categoryRepository.findByName(sanitizedCategory);

  //       return !!categoryObj;
  //     },
  //     'checkIfCategoryExists',
  //     { userAddress, category },
  //   );
  // }
}
