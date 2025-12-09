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
} from '../contact.dto';
import { handleError } from '../../../common/utils/errors';
import {
  validateAddress,
  validateName,
  normalizeAddress,
  sanitizeString,
} from '../../../common/utils/validation.util';
import {
  ErrorCompanyContact,
  ErrorCompanyGroup,
  ErrorQuery,
} from '../../../common/constants/errors';
import { PrismaService } from '../../../database/prisma.service';
import { CompanyContact } from 'src/database/generated/client';
import {
  PaginationOptions,
  PaginatedResult,
} from '../../../database/base.repository';
import { sanitizeInput } from 'src/common/utils/sanitize';
import { CompanyGroupRepository } from '../repositories/company-group.repository';
import { CompanyContactRepository } from '../repositories/company-contact.repository';
import { CompanyModel } from 'src/database/generated/models';

@Injectable()
export class CompanyContactService {
  private readonly logger = new Logger(CompanyContactService.name);

  constructor(
    private readonly companyContactRepository: CompanyContactRepository,
    private readonly companyGroupRepository: CompanyGroupRepository,
    private readonly prisma: PrismaService,
  ) {}

  //# region GET METHODS service
  // *************************************************
  // **************** GET METHODS ********************
  // *************************************************

  /**
   * Get all address book entries for a user with pagination
   */
  async getAllCompanyContacts(
    company: CompanyModel,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<CompanyContact>> {
    return this.prisma.executeWithErrorHandling(async () => {
      if (pagination) {
        return this.companyContactRepository.findManyPaginated(
          { companyId: company.id },
          pagination,
          {
            include: {
              group: true,
            },
          },
        );
      }
    }, 'getAllCompanyContacts');
  }

  /**
   * Search company contacts
   */
  async searchCompanyContacts(
    companyId: number,
    searchTerm: string,
    options: {
      groupId?: number;
      page?: number;
      limit?: number;
    } = {},
  ) {
    return this.prisma.executeWithErrorHandling(async () => {
      const { groupId, page = 1, limit = 20 } = options;

      if (!searchTerm || searchTerm.length < 2) {
        throw new BadRequestException(ErrorQuery.InvalidSearchTerm);
      }

      const whereConditions: any = {
        companyId,
        OR: [{ name: { contains: searchTerm, mode: 'insensitive' } }],
      };

      if (groupId) {
        whereConditions.groupId = groupId;
      }

      return this.companyContactRepository.findManyPaginated(
        whereConditions,
        {
          page,
          limit,
          orderBy: { name: 'asc' },
        },
        {
          include: {
            group: true,
          },
        },
      );
    }, 'searchCompanyContacts');
  }

  /**
   * Get contacts by group
   */
  async getContactsByCompanyGroup(
    companyId: number,
    groupId: number,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ) {
    return this.prisma.executeWithErrorHandling(async () => {
      const { page = 1, limit = 20 } = options;

      const group = await this.companyGroupRepository.findOne({
        id: groupId,
        companyId,
      });

      if (!group) {
        throw new NotFoundException(ErrorCompanyGroup.NotFound);
      }

      return this.companyContactRepository.findManyPaginated(
        { companyId, groupId },
        {
          page,
          limit,
          orderBy: { name: 'asc' },
        },
        {
          include: {
            group: true,
          },
        },
      );
    }, 'getContactsByGroup');
  }

  /**
   * Get contact by ID
   */
  async getCompanyContactById(companyId: number, contactId: number) {
    return this.prisma.executeWithErrorHandling(async () => {
      const contact = await this.companyContactRepository.findOne({
        id: contactId,
        companyId,
      });

      if (!contact) {
        throw new NotFoundException(ErrorCompanyContact.ContactNotFound);
      }

      const group = await this.companyGroupRepository.findOne({
        id: contact.groupId,
      });

      return {
        ...contact,
        group,
      };
    }, 'getContactById');
  }

  /**
   * Get company contact statistics
   */
  async getCompanyContactStatistics(companyId: number) {
    return this.prisma.executeWithErrorHandling(async () => {
      const [totalContacts, groups] = await Promise.all([
        this.companyContactRepository.count({ companyId }),
        this.companyGroupRepository.findMany({ companyId }),
      ]);

      const contactsByGroup: Record<string, number> = {};
      for (const group of groups) {
        const count = await this.companyContactRepository.count({
          companyId,
          groupId: group.id,
        });
        contactsByGroup[group.name] = count;
      }

      return {
        totalContacts,
        totalGroups: groups.length,
        contactsByGroup,
      };
    }, 'getCompanyStatistics');
  }

  /**
   * Check if contact name is duplicate in group
   */
  async isCompanyContactNameDuplicate(
    companyId: number,
    name: string,
    groupId: number,
  ): Promise<boolean> {
    return this.prisma.executeWithErrorHandling(async () => {
      const existing = await this.companyContactRepository.findOne({
        companyId,
        groupId,
        name,
      });

      return !!existing;
    }, 'isContactNameDuplicate');
  }

  /**
   * Check if contact address is duplicate in group
   */
  async isCompanyContactAddressDuplicate(
    companyId: number,
    address: string,
    groupId: number,
  ): Promise<boolean> {
    return this.prisma.executeWithErrorHandling(async () => {
      const existing = await this.companyContactRepository.findOne({
        companyId,
        groupId,
        walletAddress: address,
      });

      return !!existing;
    }, 'isContactAddressDuplicate');
  }

  /**
   * Check if group exists in company
   */
  async isCompanyGroupExists(
    companyId: number,
    groupName: string,
  ): Promise<boolean> {
    return this.prisma.executeWithErrorHandling(async () => {
      const existing = await this.companyGroupRepository.findOne({
        companyId,
        name: groupName,
      });

      return !!existing;
    }, 'checkIfGroupExists');
  }
  //# endregion GET METHODS service

  //# region POST METHODS service
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
      let group = await this.companyGroupRepository.findOne(
        {
          companyId: company.id,
          name: dto.group.name,
          shape: dto.group.shape,
          color: dto.group.color,
        },
        tx,
      );
      if (!group) {
        throw new BadRequestException(ErrorQuery.NotExists);
      }

      const isNameDuplicate = await this.companyContactRepository.findOne({
        name: dto.name,
      });

      if (isNameDuplicate) {
        throw new BadRequestException(ErrorCompanyContact.NameAlreadyExists);
      }

      const order = await this.companyContactRepository.getNextOrderForGroup(
        company.id,
        group.id,
        tx,
      );

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

      return newEntry;
    }, 'createNewCompanyGroupContact');
  }
  //#endregion POST METHODS service

  //# region PUT METHODS service
  /**
   * Update an existing contact
   */
  async updateCompanyContact(
    companyId: number,
    contactId: number,
    dto: UpdateAddressBookDto,
  ): Promise<CompanyContact> {
    return this.prisma.executeInTransaction(async (tx) => {
      const existingContact = await this.companyContactRepository.findOne(
        {
          id: contactId,
          companyId,
        },
        tx,
      );

      if (!existingContact) {
        throw new NotFoundException(ErrorCompanyContact.ContactNotFound);
      }

      const updateData: any = {};

      if (dto.name !== undefined) {
        validateName(dto.name, 'name');
        updateData.name = sanitizeString(dto.name);

        // Check name duplicate if name is being changed
        if (updateData.name !== existingContact.name) {
          const isDuplicate = await this.isCompanyContactNameDuplicate(
            companyId,
            updateData.name,
            existingContact.groupId,
          );

          if (isDuplicate) {
            throw new BadRequestException(
              ErrorCompanyContact.NameAlreadyExists,
            );
          }
        }
      }

      if (dto.address !== undefined) {
        validateAddress(dto.address, 'address');
        const normalizedAddress = normalizeAddress(dto.address);
        updateData.walletAddress = normalizedAddress;

        // Check address duplicate if address is being changed
        if (updateData.walletAddress !== existingContact.walletAddress) {
          const isDuplicate = await this.isCompanyContactAddressDuplicate(
            companyId,
            updateData.walletAddress,
            existingContact.groupId,
          );

          if (isDuplicate) {
            throw new BadRequestException(
              ErrorCompanyContact.AddressAlreadyExists,
            );
          }
        }
      }

      if (dto.email !== undefined) {
        updateData.email = dto.email;
      }

      if (dto.token !== undefined) {
        updateData.token = JSON.parse(JSON.stringify(dto.token));
      }

      if (dto.categoryId !== undefined) {
        // Verify the group exists and belongs to the company
        const group = await this.companyGroupRepository.findOne({
          id: dto.categoryId,
          companyId,
        });

        if (!group) {
          throw new BadRequestException(ErrorCompanyGroup.NotFound);
        }

        updateData.groupId = dto.categoryId;
      }

      // Update the contact
      const updatedContact = await this.companyContactRepository.update(
        { id: contactId, companyId },
        updateData,
      );

      return updatedContact;
    }, 'updateContact');
  }

  /**
   * Update order of multiple contacts
   */
  async updateCompanyContactsOrder(
    companyId: number,
    orderUpdates: AddressBookOrderDto[],
  ): Promise<number> {
    return this.prisma.executeInTransaction(async (tx) => {
      if (orderUpdates.length === 0) {
        return 0;
      }

      let updatedCount = 0;

      for (const update of orderUpdates) {
        try {
          const contact = await this.companyContactRepository.findOne(
            {
              id: update.id,
              companyId,
            },
            tx,
          );

          if (contact) {
            await this.companyContactRepository.update(
              { id: update.id, companyId },
              { order: update.order },
              tx,
            );
            updatedCount++;
          } else {
            this.logger.warn(
              `Contact ${update.id} not found or access denied for company ${companyId}`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to update order for contact ${update.id}: ${error.message}`,
          );
        }
      }

      return updatedCount;
    }, 'updateContactsOrder');
  }
  //#endregion PUT METHODS service

  //#region DELETE METHODS service
  /**
   * Delete contact by ID
   */
  async deleteCompanyContact(companyId: number, contactId: number) {
    await this.prisma.executeInTransaction(async (tx) => {
      const contact = await this.companyContactRepository.findOne(
        {
          id: contactId,
          companyId,
        },
        tx,
      );

      if (!contact) {
        throw new NotFoundException(ErrorCompanyContact.ContactNotFound);
      }

      await this.companyContactRepository.delete(
        { id: contactId, companyId },
        tx,
      );
    }, 'deleteContact');
  }

  /**
   * Bulk delete contacts
   */
  async bulkDeleteCompanyContacts(companyId: number, contactIds: number[]) {
    if (!contactIds || contactIds.length === 0) {
      throw new BadRequestException(ErrorCompanyContact.NoContactIdsProvided);
    }

    let deletedCount = 0;
    await this.prisma.executeInTransaction(async (tx) => {
      // Delete contacts one by one to ensure they belong to the company
      for (const contactId of contactIds) {
        try {
          const contact = await this.companyContactRepository.findOne(
            {
              id: contactId,
              companyId,
            },
            tx,
          );
          if (contact) {
            await this.companyContactRepository.delete(
              {
                id: contactId,
                companyId,
              },
              tx,
            );
            deletedCount++;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to delete contact ${contactId}: ${error.message}`,
          );
        }
      }
    }, 'bulkDeleteCompanyContacts');

    return deletedCount;
  }
  //#endregion DELETE METHODS service
}
