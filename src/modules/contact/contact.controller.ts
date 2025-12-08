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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CompanyContactService } from './services/company-contact.service';
import {
  CreateContactDto,
  UpdateAddressBookDto,
  AddressBookOrderDto,
  CreateCompanyGroupDto,
} from './contact.dto';
import { PaginationOptions } from '../../database/base.repository';
import {
  CurrentUser,
  UserWithCompany,
} from '../auth/decorators/current-user.decorator';
import { JwtPayload } from 'src/common/interfaces';
import { Auth } from '../auth/decorators/auth.decorator';
import { CompanyAuth } from '../auth/decorators/company-auth.decorator';

@ApiTags('Contacts')
@CompanyAuth()
@Controller('contacts')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(private readonly contactService: CompanyContactService) {}

  //#region GET METHODS
  // *************************************************
  // **************** GET METHODS ********************
  // *************************************************

  // @Get()
  // @ApiOperation({
  //   summary: 'Get all contacts',
  //   description:
  //     'Retrieve all contacts for the authenticated user with optional pagination',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Address book entries retrieved successfully',
  //   type: [AddressBookDto],
  // })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // @ApiQuery({
  //   name: 'page',
  //   required: false,
  //   description: 'Page number (1-based)',
  // })
  // @ApiQuery({
  //   name: 'limit',
  //   required: false,
  //   description: 'Items per page (max 100)',
  // })
  // async getAllEntries(
  //   @UserAddress() userAddress: string,
  //   @Query('page', new ParseIntPipe({ optional: true })) page?: number,
  //   @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  // ) {
  //   this.logger.log(
  //     `Getting all address book entries for user: ${userAddress}`,
  //   );

  //   const pagination: PaginationOptions | undefined =
  //     page || limit
  //       ? {
  //           page: page || 1,
  //           limit: limit || 10,
  //         }
  //       : undefined;

  //   return this.contactService.getAllAddressBookEntries(
  //     userAddress,
  //     pagination,
  //   );
  // }

  // @Get('categories')
  // @ApiOperation({
  //   summary: 'Get all categories',
  //   description: 'Retrieve all categories for the authenticated user',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Categories retrieved successfully',
  //   type: [CategoryDto],
  // })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // async getAllCategories(@UserAddress() userAddress: string) {
  //   this.logger.log(`Getting all categories for user: ${userAddress}`);
  //   return this.contactService.getAllCategories(userAddress);
  // }

  // @Get('search')
  // @ApiOperation({
  //   summary: 'Search address book entries',
  //   description: 'Search entries by name, address, or email',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Search results retrieved successfully',
  //   type: [AddressBookDto],
  // })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // @ApiQuery({
  //   name: 'search',
  //   required: true,
  //   description: 'Search term (min 2 characters)',
  // })
  // @ApiQuery({
  //   name: 'categoryId',
  //   required: false,
  //   description: 'Filter by category ID',
  // })
  // async searchEntries(
  //   @UserAddress() userAddress: string,
  //   @Query('search') searchTerm: string,
  //   @Query('categoryId', new ParseIntPipe({ optional: true }))
  //   categoryId?: number,
  // ) {
  //   this.logger.log(
  //     `Searching entries for user: ${userAddress}, term: ${searchTerm}`,
  //   );
  //   return this.contactService.searchEntries(
  //     userAddress,
  //     searchTerm,
  //     categoryId,
  //   );
  // }

  // @Get('category/:categoryId')
  // @ApiOperation({
  //   summary: 'Get entries by category',
  //   description: 'Retrieve all address book entries for a specific category',
  // })
  // @ApiParam({ name: 'categoryId', description: 'Category ID' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Category entries retrieved successfully',
  //   type: [AddressBookDto],
  // })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // async getEntriesByCategory(
  //   @UserAddress() userAddress: string,
  //   @Param('categoryId', ParseIntPipe) categoryId: number,
  // ) {
  //   this.logger.log(
  //     `Getting entries by category ${categoryId} for user: ${userAddress}`,
  //   );
  //   return this.contactService.getEntriesByCategory(userAddress, categoryId);
  // }

  // @Get('stats')
  // @ApiOperation({
  //   summary: 'Get address book statistics',
  //   description: "Get summary statistics for the user's address book",
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Statistics retrieved successfully',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       totalEntries: { type: 'number' },
  //       totalCategories: { type: 'number' },
  //       entriesByCategory: {
  //         type: 'object',
  //         additionalProperties: { type: 'number' },
  //       },
  //       recentlyAdded: { type: 'number' },
  //     },
  //   },
  // })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // async getStatistics(@UserAddress() userAddress: string) {
  //   this.logger.log(`Getting statistics for user: ${userAddress}`);
  //   return this.contactService.getStatistics(userAddress);
  // }

  // @Get(':id')
  // @ApiOperation({
  //   summary: 'Get address book entry by ID',
  //   description: 'Retrieve a specific address book entry by its ID',
  // })
  // @ApiParam({ name: 'id', description: 'Address book entry ID' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Entry retrieved successfully',
  //   type: AddressBookDto,
  // })
  // @ApiResponse({ status: 404, description: 'Entry not found' })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // async getEntryById(
  //   @UserAddress() userAddress: string,
  //   @Param('id', ParseIntPipe) id: number,
  // ) {
  //   this.logger.log(`Getting entry ${id} for user: ${userAddress}`);
  //   return this.contactService.getEntryById(id, userAddress);
  // }
  //#endregion GET METHODS

  //#region POST METHODS
  @Post('group')
  @ApiOperation({
    summary: 'Create new group',
    description: 'Create a new group for organizing address book entries',
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: CreateCompanyGroupDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or duplicate category',
  })
  async createCompanyGroup(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Body() dto: CreateCompanyGroupDto,
  ) {
    return this.contactService.createNewCompanyGroup(dto, user.company);
  }

  @Post('contact')
  @ApiOperation({
    summary: 'Create new contact for a company',
    description:
      'Create a new contact for a company with validation and duplicate checking',
  })
  @ApiResponse({
    status: 201,
    description: 'Contact created successfully',
    type: CreateContactDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or duplicate entry',
  })
  async createCompanyContact(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Body() dto: CreateContactDto,
  ) {
    // Company info is automatically available!
    return this.contactService.createNewCompanyGroupContact(dto, user.company);
  }

  // @Post('bulk-import')
  // @ApiOperation({
  //   summary: 'Bulk import address book entries',
  //   description: 'Import multiple address book entries at once',
  // })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Entries imported successfully',
  //   type: [AddressBookDto],
  // })
  // @ApiResponse({ status: 400, description: 'Invalid input data' })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // async bulkImport(
  //   @UserAddress() userAddress: string,
  //   @Body() entries: AddressBookDto[],
  // ) {
  //   this.logger.log(
  //     `Bulk importing ${entries.length} entries for user: ${userAddress}`,
  //   );
  //   return this.contactService.bulkImportEntries(entries, userAddress);
  // }

  // @Post(':id/duplicate')
  // @ApiOperation({
  //   summary: 'Duplicate address book entry',
  //   description: 'Create a copy of an existing address book entry',
  // })
  // @ApiParam({ name: 'id', description: 'Address book entry ID to duplicate' })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Entry duplicated successfully',
  //   type: AddressBookDto,
  // })
  // @ApiResponse({ status: 404, description: 'Entry not found' })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // async duplicateEntry(
  //   @UserAddress() userAddress: string,
  //   @Param('id', ParseIntPipe) id: number,
  // ) {
  //   this.logger.log(`Duplicating entry ${id} for user: ${userAddress}`);
  //   return this.contactService.duplicateEntry(id, userAddress);
  // }
  //#endregion POST METHODS

  // // *************************************************
  // // **************** PUT METHODS *******************
  // // *************************************************

  // @Put(':id')
  // @ApiOperation({
  //   summary: 'Update address book entry',
  //   description: 'Update an existing address book entry',
  // })
  // @ApiParam({ name: 'id', description: 'Address book entry ID' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Entry updated successfully',
  //   type: AddressBookDto,
  // })
  // @ApiResponse({ status: 404, description: 'Entry not found' })
  // @ApiResponse({
  //   status: 400,
  //   description: 'Invalid input data or duplicate entry',
  // })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // async updateEntry(
  //   @UserAddress() userAddress: string,
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() updateDto: UpdateAddressBookDto,
  // ) {
  //   this.logger.log(`Updating entry ${id} for user: ${userAddress}`);
  //   return this.contactService.updateAddressBookEntry(
  //     id,
  //     updateDto,
  //     userAddress,
  //   );
  // }

  // @Put('order/bulk')
  // @ApiOperation({
  //   summary: 'Update order of multiple entries',
  //   description: 'Update the display order of multiple address book entries',
  // })
  // @ApiResponse({ status: 200, description: 'Order updated successfully' })
  // @ApiResponse({ status: 400, description: 'Invalid input data' })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // @HttpCode(HttpStatus.OK)
  // async updateEntriesOrder(
  //   @UserAddress() userAddress: string,
  //   @Body() orderUpdates: AddressBookOrderDto[],
  // ) {
  //   this.logger.log(
  //     `Updating order for ${orderUpdates.length} entries for user: ${userAddress}`,
  //   );
  //   await this.contactService.updateEntriesOrder(orderUpdates, userAddress);
  //   return { message: 'Order updated successfully' };
  // }

  // // *************************************************
  // // **************** DELETE METHODS ****************
  // // *************************************************

  // @Delete(':id')
  // @ApiOperation({
  //   summary: 'Delete address book entry',
  //   description: 'Delete an address book entry by ID',
  // })
  // @ApiParam({ name: 'id', description: 'Address book entry ID' })
  // @ApiResponse({ status: 200, description: 'Entry deleted successfully' })
  // @ApiResponse({ status: 404, description: 'Entry not found' })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // async deleteEntry(
  //   @UserAddress() userAddress: string,
  //   @Param('id', ParseIntPipe) id: number,
  // ) {
  //   this.logger.log(`Deleting entry ${id} for user: ${userAddress}`);
  //   await this.contactService.deleteAddressBookEntry(id, userAddress);
  //   return { message: 'Entry deleted successfully' };
  // }

  // @Delete('bulk')
  // @ApiOperation({
  //   summary: 'Bulk delete address book entries',
  //   description: 'Delete multiple address book entries at once',
  // })
  // @ApiResponse({ status: 200, description: 'Entries deleted successfully' })
  // @ApiResponse({ status: 400, description: 'Invalid input data' })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // @HttpCode(HttpStatus.OK)
  // async bulkDelete(
  //   @UserAddress() userAddress: string,
  //   @Body('ids') ids: number[],
  // ) {
  //   this.logger.log(
  //     `Bulk deleting ${ids.length} entries for user: ${userAddress}`,
  //   );
  //   await this.contactService.bulkDeleteEntries(ids, userAddress);
  //   return { message: `${ids.length} entries deleted successfully` };
  // }

  // // *************************************************
  // // **************** VALIDATION ENDPOINTS **********
  // // *************************************************

  // @Get('validate/name-duplicate')
  // @ApiOperation({
  //   summary: 'Check if name is duplicate in category',
  //   description: 'Validate if a name already exists in a specific category',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Validation result',
  //   schema: {
  //     type: 'object',
  //     properties: { isDuplicate: { type: 'boolean' } },
  //   },
  // })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // @ApiQuery({ name: 'name', required: true, description: 'Name to check' })
  // @ApiQuery({ name: 'category', required: true, description: 'Category name' })
  // async checkNameDuplicate(
  //   @UserAddress() userAddress: string,
  //   @Query('name') name: string,
  //   @Query('category') category: string,
  // ) {
  //   this.logger.log(`Checking name duplicate for user: ${userAddress}`);
  //   const isDuplicate = await this.contactService.isAddressBookNameDuplicate(
  //     userAddress,
  //     name,
  //     category,
  //   );
  //   return { isDuplicate };
  // }

  // @Get('validate/address-duplicate')
  // @ApiOperation({
  //   summary: 'Check if address is duplicate in category',
  //   description: 'Validate if an address already exists in a specific category',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Validation result',
  //   schema: {
  //     type: 'object',
  //     properties: { isDuplicate: { type: 'boolean' } },
  //   },
  // })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // @ApiQuery({
  //   name: 'address',
  //   required: true,
  //   description: 'Address to check',
  // })
  // @ApiQuery({ name: 'category', required: true, description: 'Category name' })
  // async checkAddressDuplicate(
  //   @UserAddress() userAddress: string,
  //   @Query('address') address: string,
  //   @Query('category') category: string,
  // ) {
  //   this.logger.log(`Checking address duplicate for user: ${userAddress}`);
  //   const isDuplicate = await this.contactService.isAddressBookAddressDuplicate(
  //     userAddress,
  //     address,
  //     category,
  //   );
  //   return { isDuplicate };
  // }

  // @Get('validate/category-exists')
  // @ApiOperation({
  //   summary: 'Check if category exists',
  //   description: 'Validate if a category exists for the user',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Validation result',
  //   schema: { type: 'object', properties: { exists: { type: 'boolean' } } },
  // })
  // @ApiQuery({
  //   name: 'userAddress',
  //   required: true,
  //   description: 'User wallet address',
  // })
  // @ApiQuery({ name: 'category', required: true, description: 'Category name' })
  // async checkCategoryExists(
  //   @UserAddress() userAddress: string,
  //   @Query('category') category: string,
  // ) {
  //   this.logger.log(`Checking category exists for user: ${userAddress}`);
  //   const exists = await this.contactService.checkIfCategoryExists(
  //     userAddress,
  //     category,
  //   );
  //   return { exists };
  // }
}
