import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Patch,
  UseGuards,
  Req,
  Delete,
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
import { CreateGroupDto, CreateGroupPaymentDto, CreateDefaultGroupDto, CreateQuickSharePaymentDto, UpdateQuickShareMemberDto } from './group-payment.dto';
import { WalletAuthGuard } from '../wallet-auth/wallet-auth.guard';
import { RequestWithWalletAuth } from '../../common/interfaces';

@ApiTags('Group Payment')
@ApiBearerAuth()
@Controller('group-payment')
export class GroupPaymentController {
  constructor(private readonly service: GroupPaymentService) {}

  /************************************************** */
  /******************** POST ************************* */
  /************************************************** */

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

  @Post('default-group')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Create a default group (e.g., Quick Share) with optional members' })
  @ApiResponse({ status: 201, description: 'Default group created' })
  @ApiBody({ type: CreateDefaultGroupDto })
  async createDefaultGroup(
    @Body() dto: CreateDefaultGroupDto,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.service.createDefaultGroup(dto, req.walletAuth.walletAddress);
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

  @Post('quick-share/create-payment')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Create a Quick Share payment (starts with 0 members)' })
  @ApiResponse({ status: 201, description: 'Quick Share payment created', schema: { type: 'object', properties: { code: { type: 'string' } } } })
  @ApiBody({ type: CreateQuickSharePaymentDto })
  async createQuickSharePayment(
    @Body() dto: CreateQuickSharePaymentDto,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.service.createQuickSharePayment(dto, req.walletAuth.walletAddress);
  }

  @Patch('quick-share/:code/add-member')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Add user to Quick Share payment after transaction success' })
  @ApiResponse({ status: 200, description: 'Member added to Quick Share payment' })
  @ApiParam({ name: 'code', description: 'Quick Share payment code' })
  @ApiBody({ type: UpdateQuickShareMemberDto })
  async addMemberToQuickShare(
    @Param('code') code: string,
    @Body() dto: UpdateQuickShareMemberDto,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.service.addMemberToQuickShare(code, dto.userAddress, req.walletAuth.walletAddress);
  }

  /************************************************** */
  /******************** GET ************************* */
  /************************************************** */

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

  /************************************************** */
  /******************** PATCH *********************** */
  /************************************************** */

  @Patch('group/:groupId')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Update a group' })
  @ApiResponse({ status: 200, description: 'Group updated successfully' })
  @ApiParam({ name: 'groupId', description: 'Group ID to update' })
  async updateGroup(@Param('groupId') groupId: number, @Body() dto: CreateGroupDto, @Req() req: RequestWithWalletAuth) {
    return this.service.updateGroup(groupId, dto, req.walletAuth.walletAddress);
  }

  /************************************************** */
  /******************** DELETE ********************** */
  /************************************************** */

  @Delete('group/:groupId')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Delete a group' })
  @ApiResponse({ status: 200, description: 'Group deleted successfully' })
  @ApiParam({ name: 'groupId', description: 'Group ID to delete' })
  async deleteGroup(@Param('groupId') groupId: number, @Req() req: RequestWithWalletAuth) {
    return this.service.deleteGroup(groupId, req.walletAuth.walletAddress);
  }
}
