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
} from '../employee.dto';
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
import { Employee } from 'src/database/generated/client';
import {
  PaginationOptions,
  PaginatedResult,
} from '../../../database/base.repository';
import { sanitizeInput } from 'src/common/utils/sanitize';
import { EmployeeGroupRepository } from '../repositories/employee-group.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { CompanyModel } from 'src/database/generated/models';

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly employeeGroupRepository: EmployeeGroupRepository,
    private readonly prisma: PrismaService,
  ) {}

  //# region GET METHODS service
  // *************************************************
  // **************** GET METHODS ********************
  // *************************************************

  /**
   * Get all address book entries for a user with pagination
   */
  async getAllEmployees(
    company: CompanyModel,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Employee>> {
    return this.prisma.executeWithErrorHandling(async () => {
      if (pagination) {
        return this.employeeRepository.findManyPaginated(
          { companyId: company.id },
          pagination,
          {
            include: {
              group: true,
            },
          },
        );
      }
    }, 'getAllEmployees');
  }

  /**
   * Search company contacts
   */
  async searchEmployees(
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

      return this.employeeRepository.findManyPaginated(
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
    }, 'searchEmployees');
  }

  /**
   * Get contacts by group
   */
  async getEmployeesByEmployeeGroup(
    companyId: number,
    groupId: number,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ) {
    return this.prisma.executeWithErrorHandling(async () => {
      const { page = 1, limit = 20 } = options;

      const group = await this.employeeGroupRepository.findOne({
        id: groupId,
        companyId,
      });

      if (!group) {
        throw new NotFoundException(ErrorCompanyGroup.NotFound);
      }

      return this.employeeRepository.findManyPaginated(
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
    }, 'getEmployeesByEmployeeGroup');
  }

  /**
   * Get contact by ID
   */
  async getEmployeeById(companyId: number, contactId: number) {
    return this.prisma.executeWithErrorHandling(async () => {
      const contact = await this.employeeRepository.findOne({
        id: contactId,
        companyId,
      });

      if (!contact) {
        throw new NotFoundException(ErrorCompanyContact.ContactNotFound);
      }

      const group = await this.employeeGroupRepository.findOne({
        id: contact.groupId,
      });

      return {
        ...contact,
        group,
      };
    }, 'getEmployeeById');
  }

  /**
   * Get company contact statistics
   */
  async getEmployeeStatistics(companyId: number) {
    return this.prisma.executeWithErrorHandling(async () => {
      const [totalContacts, groups] = await Promise.all([
        this.employeeRepository.count({ companyId }),
        this.employeeGroupRepository.findMany({ companyId }),
      ]);

      const contactsByGroup: Record<string, number> = {};
      for (const group of groups) {
        const count = await this.employeeRepository.count({
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
    }, 'getEmployeeStatistics');
  }

  /**
   * Check if contact name is duplicate in group
   */
  async isEmployeeNameDuplicate(
    companyId: number,
    name: string,
    groupId: number,
  ): Promise<boolean> {
    return this.prisma.executeWithErrorHandling(async () => {
      const existing = await this.employeeRepository.findOne({
        companyId,
        groupId,
        name,
      });

      return !!existing;
    }, 'isEmployeeNameDuplicate');
  }

  /**
   * Check if contact address is duplicate in group
   */
  async isEmployeeAddressDuplicate(
    companyId: number,
    address: string,
    groupId: number,
  ): Promise<boolean> {
    return this.prisma.executeWithErrorHandling(async () => {
      const existing = await this.employeeRepository.findOne({
        companyId,
        groupId,
        walletAddress: address,
      });

      return !!existing;
    }, 'isEmployeeAddressDuplicate');
  }

  /**
   * Check if group exists in company
   */
  async isEmployeeGroupExists(
    companyId: number,
    groupName: string,
  ): Promise<boolean> {
    return this.prisma.executeWithErrorHandling(async () => {
      const existing = await this.employeeGroupRepository.findOne({
        companyId,
        name: groupName,
      });

      return !!existing;
    }, 'checkIfEmployeeGroupExists');
  }
  //# endregion GET METHODS service

  //# region POST METHODS service
  /**
   * Create a new address book entry with proper validation and transaction handling
   */
  async createNewEmployee(
    dto: CreateContactDto,
    company: CompanyModel,
  ): Promise<Employee> {
    return this.prisma.executeInTransaction(async (tx) => {
      dto = sanitizeInput(dto);

      // Find if the group exists for this company
      let group = await this.employeeGroupRepository.findOne(
        {
          id: dto.groupId,
          companyId: company.id,
        },
        tx,
      );
      if (!group) {
        throw new BadRequestException(ErrorQuery.NotExists);
      }

      const isNameDuplicate = await this.employeeRepository.findOne({
        name: dto.name,
      });

      if (isNameDuplicate) {
        throw new BadRequestException(ErrorCompanyContact.NameAlreadyExists);
      }

      const order = await this.employeeRepository.getNextOrderForGroup(
        company.id,
        group.id,
        tx,
      );

      const newEntry = await this.employeeRepository.create(
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
    }, 'createNewEmployee');
  }
  //#endregion POST METHODS service

  //# region PUT METHODS service
  /**
   * Update an existing contact
   */
  async updateEmployee(
    companyId: number,
    contactId: number,
    dto: UpdateAddressBookDto,
  ): Promise<Employee> {
    return this.prisma.executeInTransaction(async (tx) => {
      const existingContact = await this.employeeRepository.findOne(
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
          const isDuplicate = await this.isEmployeeNameDuplicate(
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
          const isDuplicate = await this.isEmployeeAddressDuplicate(
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
        const group = await this.employeeGroupRepository.findOne({
          id: dto.categoryId,
          companyId,
        });

        if (!group) {
          throw new BadRequestException(ErrorCompanyGroup.NotFound);
        }

        updateData.groupId = dto.categoryId;
      }

      // Update the contact
      const updatedContact = await this.employeeRepository.update(
        { id: contactId, companyId },
        updateData,
      );

      return updatedContact;
    }, 'updateEmployee');
  }

  /**
   * Update order of multiple contacts
   */
  async updateEmployeesOrder(
    companyId: number,
    orderUpdates: AddressBookOrderDto[],
  ): Promise<number> {
    return this.prisma.executeInTransaction(async (tx) => {
      if (orderUpdates.length === 0) {
        return 0;
      }

      let updatedCount = 0;

      for (const update of orderUpdates) {
        const contact = await this.employeeRepository.findOne(
          {
            id: update.id,
            companyId,
          },
          tx,
        );

        if (contact) {
          await this.employeeRepository.update(
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
      }

      return updatedCount;
    }, 'updateEmployeesOrder');
  }
  //#endregion PUT METHODS service

  //#region DELETE METHODS service
  /**
   * Delete contact by ID
   */
  async deleteEmployee(companyId: number, contactId: number) {
    await this.prisma.executeInTransaction(async (tx) => {
      const contact = await this.employeeRepository.findOne(
        {
          id: contactId,
          companyId,
        },
        tx,
      );

      if (!contact) {
        throw new NotFoundException(ErrorCompanyContact.ContactNotFound);
      }

      await this.employeeRepository.delete({ id: contactId, companyId }, tx);
    }, 'deleteEmployee');
  }

  /**
   * Bulk delete contacts
   */
  async bulkDeleteEmployees(companyId: number, contactIds: number[]) {
    if (!contactIds || contactIds.length === 0) {
      throw new BadRequestException(ErrorCompanyContact.NoContactIdsProvided);
    }

    let deletedCount = 0;
    await this.prisma.executeInTransaction(async (tx) => {
      // Delete contacts one by one to ensure they belong to the company
      for (const contactId of contactIds) {
        const contact = await this.employeeRepository.findOne(
          {
            id: contactId,
            companyId,
          },
          tx,
        );
        if (contact) {
          await this.employeeRepository.delete(
            {
              id: contactId,
              companyId,
            },
            tx,
          );
          deletedCount++;
        }
      }
    }, 'bulkDeleteEmployees');

    return deletedCount;
  }
  //#endregion DELETE METHODS service
}
