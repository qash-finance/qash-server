import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GroupPaymentService } from './group-payment.service';
import { CreateGroupDto, CreateGroupPaymentDto } from './group-payment.dto';
import { WalletAuthGuard } from '../wallet-auth/wallet-auth.guard';
import { RequestWithWalletAuth } from '../../common/interfaces';

@ApiTags('Group Payment')
@ApiBearerAuth()
@Controller('group-payment')
export class GroupPaymentController {
  constructor(private readonly service: GroupPaymentService) {}

  @Post('group')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({ status: 201, description: 'Group created' })
  @ApiBody({ type: CreateGroupDto })
  async createGroup(
    @Body() dto: CreateGroupDto,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.service.createGroup(dto, req.walletAuth.walletAddress);
  }

  @Post('create-payment')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Create a group payment ' })
  @ApiResponse({ status: 201, description: 'Group payment created' })
  @ApiBody({ type: CreateGroupPaymentDto })
  async createGroupPayment(
    @Body() dto: CreateGroupPaymentDto,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.service.createGroupPayment(dto, req.walletAuth.walletAddress);
  }

  @Get('groups')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Get all groups by owner address' })
  @ApiResponse({ status: 200, description: 'Groups retrieved successfully' })
  @ApiQuery({
    name: 'ownerAddress',
    description: 'Owner address to filter groups',
  })
  async getAllGroups(@Req() req: RequestWithWalletAuth) {
    return this.service.getAllGroups(req.walletAuth.walletAddress);
  }

  @Get('group/:groupId/payments')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Get all payments in a group, categorized by date' })
  @ApiResponse({
    status: 200,
    description: 'Group payments retrieved successfully',
  })
  @ApiParam({ name: 'groupId', description: 'Group ID to get payments for' })
  async getGroupPayments(
    @Param('groupId') groupId: number,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.service.getGroupPayments(groupId, req.walletAuth.walletAddress);
  }

  @Get('link/:linkCode')
  @ApiOperation({ summary: 'Get group payment details by link code' })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully',
  })
  @ApiParam({
    name: 'linkCode',
    description: 'Link code to get payment details for',
  })
  async getPaymentByLink(@Param('linkCode') linkCode: string) {
    return this.service.getPaymentByLink(linkCode);
  }
}
