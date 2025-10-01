import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AddressBookService } from './address-book.service';
import { AddressBookDto, CategoryDto, CategoryOrderDto } from './address-book.dto';
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
    description: 'Get all address book entries filtered by category',
  })
  @ApiResponse({
    status: 200,
    description: 'Address book entries fetched successfully',
  })
  async getAddressBookEntriesByCategory(
    @Query('category') category: string,
    @Req() req: RequestWithWalletAuth,
  ): Promise<AddressBook[]> {
    return this.addressBookService.getAddressBookEntriesByCategory(
      req.walletAuth.walletAddress,
      category,
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
}
