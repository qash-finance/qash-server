import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AddressBookService } from './address-book.service';
import { AddressBookDto } from './address-book.dto';
import { RequestWithWalletAuth } from '../../common/interfaces';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WalletAuthGuard } from '../wallet-auth/wallet-auth.guard';
import { AddressBook } from '@prisma/client';

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
}
