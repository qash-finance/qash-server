import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  Param,
  Delete,
} from '@nestjs/common';
import { AddressBookService } from './address-book.service';
import { AddressBookDto, CategoryDto, CategoryOrderDto, UpdateAddressBookDto, DeleteAddressBookDto, AddressBookOrderDto } from './address-book.dto';
import { RequestWithWalletAuth } from '../../common/interfaces';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WalletAuthGuard } from '../wallet-auth/wallet-auth.guard';
import { AddressBook, Categories } from '@prisma/client';

@ApiTags('Address Book')
@ApiBearerAuth()
@Controller('address-book')
export class AddressBookController {
  constructor(private readonly addressBookService: AddressBookService) {}

  // *************************************************
  // **************** GET METHODS *******************
  // *************************************************
  @Get()
  @UseGuards(WalletAuthGuard)
  @ApiOperation({
    summary: 'Get all address book entries',
    description: 'Get all address book entries',
  })
  @ApiResponse({
    status: 200,
    description: 'Address book entries fetched successfully',
  })
  async getAllAddressBookEntries(
    @Req() req: RequestWithWalletAuth,
  ): Promise<AddressBook[]> {
    return this.addressBookService.getAllAddressBookEntries(
      req.walletAuth.walletAddress,
    );
  }

  @Get('category')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({
    summary: 'Get all categories',
    description: 'Get all categories',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories fetched successfully',
  })
  async getAllCategories(
    @Req() req: RequestWithWalletAuth,
  ): Promise<Categories[]> {
    return this.addressBookService.getAllCategories(
      req.walletAuth.walletAddress,
    );
  }

  // check if name is duplicate
  @Get('check-name-duplicate')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({
    summary: 'Check if name is duplicate',
    description: 'Check if name is duplicate',
  })
  @ApiResponse({
    status: 200,
    description: 'Name is duplicate',
  })
  async checkIfNameIsDuplicate(
    @Query('name') name: string,
    @Query('category') category: string,
    @Req() req: RequestWithWalletAuth,
  ) {
    const dto = { name, category, userAddress: req.walletAuth.walletAddress };
    return this.addressBookService.checkIfAddressBookNameExists(dto);
  }

  @Get('check-category-exists')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({
    summary: 'Check if category exists',
    description: 'Check if category exists',
  })
  @ApiResponse({
    status: 200,
    description: 'Category exists',
  })
  async checkIfCategoryExists(
    @Query('category') category: string,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.addressBookService.checkIfCategoryExists(
      req.walletAuth.walletAddress,
      category,
    );
  }

  @Get('by-category')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({
    summary: 'Get address book entries by category',
    description: 'Get all address book entries filtered by category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Address book entries fetched successfully',
  })
  async getAddressBookEntriesByCategory(
    @Query('categoryId', ParseIntPipe) categoryId: number,
    @Req() req: RequestWithWalletAuth,
  ): Promise<AddressBook[]> {
    return this.addressBookService.getAddressBookEntriesByCategory(
      req.walletAuth.walletAddress,
      categoryId,
    );
  }

  // *************************************************
  // **************** POST METHODS *******************
  // *************************************************
  @Post()
  @UseGuards(WalletAuthGuard)
  @ApiOperation({
    summary: 'Create a new address book entry',
    description: 'Create a new address book entry',
  })
  @ApiResponse({
    status: 200,
    description: 'Address book entry created successfully',
  })
  @ApiBody({ type: AddressBookDto })
  async createNewAddressBookEntry(
    @Body() dto: AddressBookDto,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.addressBookService.createNewAddressBookEntry(
      dto,
      req.walletAuth.walletAddress,
    );
  }

  @Post('category')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({
    summary: 'Create a new category',
    description: 'Create a new category',
  })
  @ApiResponse({
    status: 200,
    description: 'Category created successfully',
  })
  @ApiBody({ type: CategoryDto })
  async createNewCategory(
    @Body() dto: CategoryDto,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.addressBookService.createNewCategory(
      dto,
      req.walletAuth.walletAddress,
    );
  }

  // *************************************************
  // **************** PATCH METHODS *******************
  // *************************************************
  @Patch('update-order')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({
    summary: 'Update order of address book entries',
    description: 'Update order of address book entries',
  })
  @ApiResponse({ status: 200, description: 'Address book entries ordered successfully' })
  @ApiBody({ type: AddressBookOrderDto })
  async updateAddressBookEntryOrder(
    @Body() dto: AddressBookOrderDto,
    @Req() req: RequestWithWalletAuth,
  ) {
      return this.addressBookService.updateAddressBookEntryOrder(dto, req.walletAuth.walletAddress);
    }

  @Patch('category/update-order')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({
    summary: 'Update order of categories',
    description: 'Update order of categories',
  })
  @ApiResponse({ status: 200, description: 'Categories ordered successfully' })
  @ApiBody({ type: CategoryOrderDto })
  async updateCategoryOrder(
    @Body() dto: CategoryOrderDto,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.addressBookService.updateCategoryOrder(dto, req.walletAuth.walletAddress);
  }

  @Patch(':id')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({
    summary: 'Update address book entry',
    description: 'Update address book entry',
  })
  @ApiResponse({ status: 200, description: 'Address book entry updated successfully' })
  @ApiBody({ type: UpdateAddressBookDto })
  async updateAddressBookEntry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressBookDto,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.addressBookService.updateAddressBookEntry(id, dto, req.walletAuth.walletAddress);
  }

    // *************************************************
  // **************** DELETE METHODS *******************
  // *************************************************
  @Delete()
  @UseGuards(WalletAuthGuard)
  @ApiOperation({
    summary: 'Delete address book entries',
    description: 'Delete multiple address book entries by IDs',
  })
  @ApiResponse({ status: 200, description: 'Address book entries deleted successfully' })
  @ApiBody({ type: DeleteAddressBookDto })
  async deleteAddressBookEntries(
    @Body() dto: DeleteAddressBookDto,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.addressBookService.deleteAddressBookEntries(dto.ids, req.walletAuth.walletAddress);
  }
}
