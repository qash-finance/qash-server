import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CompanyContactService } from './services/company-contact.service';
import {
  CreateContactDto,
  UpdateAddressBookDto,
  AddressBookOrderDto,
  CreateCompanyGroupDto,
  PaginatedContactsResponseDto,
  PaginatedGroupsResponseDto,
  CompanyContactResponseDto,
  CompanyGroupResponseDto,
} from './contact.dto';
import { PaginationOptions } from '../../database/base.repository';
import {
  CurrentUser,
  UserWithCompany,
} from '../auth/decorators/current-user.decorator';
import { CompanyAuth } from '../auth/decorators/company-auth.decorator';
import { CompanyGroupService } from './services/company-group.service';

@ApiTags('Contacts')
@CompanyAuth()
@Controller('contacts')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(
    private readonly companyContactService: CompanyContactService,
    private readonly companyGroupService: CompanyGroupService,
  ) {}

  //#region GET METHODS
  // *************************************************
  // **************** GET METHODS ********************
  // *************************************************

  @Get()
  @ApiOperation({
    summary: 'Get all contacts',
    description:
      'Retrieve all contacts for the authenticated user with optional pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Contacts retrieved successfully',
    type: PaginatedContactsResponseDto,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (max 100)',
  })
  async getAllCompanyContacts(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    const pagination: PaginationOptions = { page, limit };
    return this.companyContactService.getAllCompanyContacts(
      user.company,
      pagination,
    );
  }

  @Get('groups')
  @ApiOperation({
    summary: 'Get all groups',
    description: "Retrieve all groups for the authenticated user's company",
  })
  @ApiResponse({
    status: 200,
    description: 'Groups retrieved successfully',
    type: [CompanyGroupResponseDto],
  })
  async getAllCompanyGroups(@CurrentUser('withCompany') user: UserWithCompany) {
    return this.companyGroupService.getAllCompanyGroups(user.company.id);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search company contacts',
    description:
      'Search contacts by name, address, or description within the company',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: PaginatedContactsResponseDto,
  })
  @ApiQuery({
    name: 'search',
    required: true,
    description: 'Search term (min 2 characters)',
    example: 'john',
  })
  @ApiQuery({
    name: 'groupId',
    required: false,
    description: 'Filter by group ID',
    type: Number,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results per page',
    type: Number,
    example: 20,
  })
  async searchCompanyContacts(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Query('search') searchTerm: string,
    @Query('groupId', new ParseIntPipe({ optional: true }))
    groupId?: number,
    @Query('page', new ParseIntPipe({ optional: true }))
    page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit: number = 20,
  ) {
    return this.companyContactService.searchCompanyContacts(
      user.company.id,
      searchTerm,
      { groupId, page, limit },
    );
  }

  @Get('group/:groupId')
  @ApiOperation({
    summary: 'Get contacts by group',
    description:
      'Retrieve all contacts for a specific group within the company',
  })
  @ApiParam({
    name: 'groupId',
    description: 'Group ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Group contacts retrieved successfully',
    type: PaginatedContactsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found or access denied',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of contacts per page',
    type: Number,
    example: 20,
  })
  async getContactsByCompanyGroup(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query('page', new ParseIntPipe({ optional: true }))
    page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit: number = 20,
  ) {
    return this.companyContactService.getContactsByCompanyGroup(
      user.company.id,
      groupId,
      {
        page,
        limit,
      },
    );
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get company contact statistics',
    description: "Get summary statistics for the company's contacts and groups",
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalContacts: { type: 'number' },
        totalGroups: { type: 'number' },
        contactsByGroup: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
      },
    },
  })
  async getCompanyContactStatistics(
    @CurrentUser('withCompany') user: UserWithCompany,
  ) {
    return this.companyContactService.getCompanyContactStatistics(
      user.company.id,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get contact by ID',
    description: 'Retrieve a specific contact by its ID within the company',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Contact retrieved successfully',
    type: CompanyContactResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Contact not found or access denied',
  })
  async getCompanyContactById(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.companyContactService.getCompanyContactById(
      user.company.id,
      id,
    );
  }

  @Get('validate/name-duplicate')
  @ApiOperation({
    summary: 'Check if contact name is duplicate in group',
    description:
      'Validate if a contact name already exists in a specific group within the company',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    schema: {
      type: 'object',
      properties: { isDuplicate: { type: 'boolean' } },
    },
  })
  @ApiQuery({
    name: 'name',
    required: true,
    description: 'Contact name to check',
    example: 'John Doe',
  })
  @ApiQuery({
    name: 'groupId',
    required: true,
    description: 'Group ID',
    type: Number,
    example: 1,
  })
  async checkCompanyContactNameDuplicate(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Query('name') name: string,
    @Query('groupId', ParseIntPipe) groupId: number,
  ) {
    const isDuplicate =
      await this.companyContactService.isCompanyContactNameDuplicate(
        user.company.id,
        name,
        groupId,
      );
    return { isDuplicate };
  }

  @Get('validate/address-duplicate')
  @ApiOperation({
    summary: 'Check if address is duplicate in group',
    description:
      'Validate if an address already exists in a specific group within the company',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    schema: {
      type: 'object',
      properties: { isDuplicate: { type: 'boolean' } },
    },
  })
  @ApiQuery({
    name: 'address',
    required: true,
    description: 'Address to check',
    example: '0x1234567890abcdef...',
  })
  @ApiQuery({
    name: 'groupId',
    required: true,
    description: 'Group ID',
    type: Number,
    example: 1,
  })
  async checkCompanyContactAddressDuplicate(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Query('address') address: string,
    @Query('groupId', ParseIntPipe) groupId: number,
  ) {
    const isDuplicate =
      await this.companyContactService.isCompanyContactAddressDuplicate(
        user.company.id,
        address,
        groupId,
      );
    return { isDuplicate };
  }

  @Get('validate/group-exists')
  @ApiOperation({
    summary: 'Check if group exists',
    description: 'Validate if a group exists within the company',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    schema: {
      type: 'object',
      properties: { exists: { type: 'boolean' } },
    },
  })
  @ApiQuery({
    name: 'groupName',
    required: true,
    description: 'Group name to check',
    example: 'Employees',
  })
  async checkCompanyGroupExists(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Query('groupName') groupName: string,
  ) {
    const exists = await this.companyContactService.isCompanyGroupExists(
      user.company.id,
      groupName,
    );
    return { exists };
  }
  //#endregion GET METHODS

  //#region POST METHODS
  // *************************************************
  // **************** POST METHODS *******************
  // *************************************************
  @Post('group')
  @ApiOperation({
    summary: 'Create new group',
    description: 'Create a new group for organizing address book entries',
  })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
    type: CompanyGroupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or duplicate category',
  })
  async createCompanyGroup(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Body() dto: CreateCompanyGroupDto,
  ) {
    return this.companyGroupService.createNewCompanyGroup(dto, user.company);
  }

  @Post('new-contact')
  @ApiOperation({
    summary: 'Create new contact for a company',
    description:
      'Create a new contact for a company with validation and duplicate checking',
  })
  @ApiResponse({
    status: 201,
    description: 'Contact created successfully',
    type: CompanyContactResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or duplicate entry',
  })
  async createCompanyContact(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Body() dto: CreateContactDto,
  ) {
    return this.companyContactService.createNewCompanyGroupContact(
      dto,
      user.company,
    );
  }
  //#endregion POST METHODS

  //#region PUT METHODS
  // *************************************************
  // **************** PUT METHODS ********************
  // *************************************************

  @Put(':id')
  @ApiOperation({
    summary: 'Update company contact',
    description: 'Update an existing contact within the company',
  })
  @ApiParam({ name: 'id', description: 'Contact ID', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Contact updated successfully',
    type: CompanyContactResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Contact not found or access denied',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or duplicate contact',
  })
  async updateCompanyContact(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAddressBookDto,
  ): Promise<CompanyContactResponseDto> {
    return this.companyContactService.updateCompanyContact(
      user.company.id,
      id,
      updateDto,
    );
  }

  @Put('order/bulk')
  @ApiOperation({
    summary: 'Update order of multiple contacts',
    description:
      'Update the display order of multiple contacts within the company',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact order updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Contact order updated successfully',
        },
        updatedCount: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @HttpCode(HttpStatus.OK)
  async updateCompanyContactsOrder(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Body() orderUpdates: AddressBookOrderDto[],
  ): Promise<{ message: string; updatedCount: number }> {
    const updatedCount =
      await this.companyContactService.updateCompanyContactsOrder(
        user.company.id,
        orderUpdates,
      );
    return {
      message: 'Contact order updated successfully',
      updatedCount,
    };
  }
  //#endregion PUT METHODS

  //#region DELETE METHODS
  // *************************************************
  // **************** DELETE METHODS *****************
  // *************************************************
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete contact',
    description: 'Delete a contact by ID within the company',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Contact deleted successfully',
    schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Contact not found or access denied',
  })
  async deleteCompanyContact(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.companyContactService.deleteCompanyContact(user.company.id, id);
    return { message: 'Contact deleted successfully' };
  }

  @Delete('bulk')
  @ApiOperation({
    summary: 'Bulk delete contacts',
    description: 'Delete multiple contacts at once within the company',
  })
  @ApiResponse({
    status: 200,
    description: 'Contacts deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        deletedCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @HttpCode(HttpStatus.OK)
  async bulkDeleteContacts(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Body('ids') ids: number[],
  ) {
    const deletedCount =
      await this.companyContactService.bulkDeleteCompanyContacts(
        user.company.id,
        ids,
      );
    return {
      message: `${deletedCount} contacts deleted successfully`,
      deletedCount,
    };
  }
  //#endregion DELETE METHODS
}
