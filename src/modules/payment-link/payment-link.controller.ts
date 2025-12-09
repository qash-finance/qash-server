import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentLinkService } from './payment-link.service';
import {
  CreatePaymentLinkDto,
  UpdatePaymentLinkDto,
  PaymentLinkRecordDto,
  PaymentLinkOrderDto,
  DeletePaymentLinksDto,
} from './payment-link.dto';
import { RequestWithWalletAuth } from '../../common/interfaces';
import { Public } from '../shared/decorators';

@ApiTags('Payment Link')
@ApiBearerAuth()
@Controller('payment-link')
export class PaymentLinkController {
  constructor(private readonly service: PaymentLinkService) {}

  // *************************************************
  // **************** GET METHODS ******************
  // *************************************************

  // @Get()
  // @ApiOperation({ summary: 'Get all payment links for authenticated user' })
  // @ApiResponse({ status: 200, description: 'List of payment links' })
  // async getAllPaymentLinks(@Req() req: RequestWithWalletAuth) {
  //   return this.service.getPaymentLinks(req.walletAuth.walletAddress);
  // }

  // @Get(':code')
  // @Public()
  // @ApiOperation({ summary: 'Get payment link by code (public)' })
  // @ApiResponse({ status: 200, description: 'Payment link details' })
  // @ApiResponse({ status: 404, description: 'Payment link not found' })
  // @ApiParam({ name: 'code', description: 'Payment link code' })
  // async getPaymentLinkByCode(@Param('code') code: string) {
  //   return this.service.getPaymentLinkByCode(code);
  // }

  // @Get(':code/owner')
  // @ApiOperation({
  //   summary: 'Get payment link by code for owner (with ownership check)',
  // })
  // @ApiResponse({ status: 200, description: 'Payment link details' })
  // @ApiResponse({ status: 404, description: 'Payment link not found' })
  // @ApiResponse({
  //   status: 403,
  //   description: 'Forbidden - Not the owner of this payment link',
  // })
  // @ApiParam({ name: 'code', description: 'Payment link code' })
  // async getPaymentLinkByCodeForOwner(
  //   @Param('code') code: string,
  //   @Req() req: RequestWithWalletAuth,
  // ) {
  //   return this.service.getPaymentLinkByCodeForPayee(
  //     code,
  //     req.walletAuth.walletAddress,
  //   );
  // }

  // // *************************************************
  // // **************** POST METHODS ******************
  // // *************************************************

  // @Post()
  // @ApiOperation({ summary: 'Create a new payment link' })
  // @ApiResponse({ status: 201, description: 'Payment link created' })
  // @ApiResponse({ status: 400, description: 'Bad Request - Validation failed' })
  // @ApiBody({ type: CreatePaymentLinkDto })
  // async createPaymentLink(
  //   @Body() dto: CreatePaymentLinkDto,
  //   @Req() req: RequestWithWalletAuth,
  // ) {
  //   // Override the payee with authenticated user's address
  //   dto.payee = req.walletAuth.walletAddress;
  //   return this.service.createPaymentLink(dto);
  // }

  // @Post(':code/pay')
  // @Public()
  // @ApiOperation({ summary: 'Record a payment to a payment link (public)' })
  // @ApiResponse({ status: 201, description: 'Payment recorded' })
  // @ApiResponse({ status: 400, description: 'Bad Request - Validation failed' })
  // @ApiResponse({ status: 404, description: 'Payment link not found' })
  // @ApiParam({ name: 'code', description: 'Payment link code' })
  // @ApiBody({ type: PaymentLinkRecordDto })
  // async recordPayment(
  //   @Param('code') code: string,
  //   @Body() dto: PaymentLinkRecordDto,
  // ) {
  //   return this.service.recordPayment(code, dto);
  // }

  // // *************************************************
  // // **************** PUT METHODS ******************
  // // *************************************************

  // @Put(':code')
  // @ApiOperation({ summary: 'Update a payment link' })
  // @ApiResponse({ status: 200, description: 'Payment link updated' })
  // @ApiResponse({ status: 400, description: 'Bad Request - Validation failed' })
  // @ApiResponse({ status: 404, description: 'Payment link not found' })
  // @ApiResponse({
  //   status: 403,
  //   description: 'Forbidden - Not the owner of this payment link',
  // })
  // @ApiParam({ name: 'code', description: 'Payment link code' })
  // @ApiBody({ type: UpdatePaymentLinkDto })
  // async updatePaymentLink(
  //   @Param('code') code: string,
  //   @Body() dto: UpdatePaymentLinkDto,
  //   @Req() req: RequestWithWalletAuth,
  // ) {
  //   return this.service.updatePaymentLink(
  //     code,
  //     req.walletAuth.walletAddress,
  //     dto,
  //   );
  // }

  // @Put(':code/deactivate')
  // @ApiOperation({ summary: 'Deactivate a payment link' })
  // @ApiResponse({ status: 200, description: 'Payment link deactivated' })
  // @ApiResponse({
  //   status: 400,
  //   description: 'Bad Request - Already deactivated',
  // })
  // @ApiResponse({ status: 404, description: 'Payment link not found' })
  // @ApiResponse({
  //   status: 403,
  //   description: 'Forbidden - Not the owner of this payment link',
  // })
  // @ApiParam({ name: 'code', description: 'Payment link code' })
  // async deactivatePaymentLink(
  //   @Param('code') code: string,
  //   @Req() req: RequestWithWalletAuth,
  // ) {
  //   return this.service.deactivatePaymentLink(
  //     code,
  //     req.walletAuth.walletAddress,
  //   );
  // }

  // @Put(':code/activate')
  // @ApiOperation({ summary: 'Activate a payment link' })
  // @ApiResponse({ status: 200, description: 'Payment link activated' })
  // @ApiResponse({ status: 400, description: 'Bad Request - Already active' })
  // @ApiResponse({ status: 404, description: 'Payment link not found' })
  // @ApiResponse({
  //   status: 403,
  //   description: 'Forbidden - Not the owner of this payment link',
  // })
  // @ApiParam({ name: 'code', description: 'Payment link code' })
  // async activatePaymentLink(
  //   @Param('code') code: string,
  //   @Req() req: RequestWithWalletAuth,
  // ) {
  //   return this.service.activatePaymentLink(code, req.walletAuth.walletAddress);
  // }

  // @Put('payment/:paymentId/txid')
  // @ApiOperation({ summary: 'Update payment record with transaction ID' })
  // @ApiResponse({ status: 200, description: 'Payment updated' })
  // @ApiResponse({ status: 404, description: 'Payment record not found' })
  // @ApiResponse({
  //   status: 403,
  //   description: 'Forbidden - Not the owner of this payment link',
  // })
  // @ApiParam({ name: 'paymentId', description: 'Payment record ID' })
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       txid: { type: 'string', example: '0x123...' },
  //     },
  //   },
  // })
  // async updatePaymentTxid(
  //   @Param('paymentId') paymentId: number,
  //   @Body() body: { txid: string },
  //   @Req() req: RequestWithWalletAuth,
  // ) {
  //   return this.service.updatePaymentTxid(
  //     paymentId,
  //     body.txid,
  //     req.walletAuth.walletAddress,
  //   );
  // }

  // // *************************************************
  // // **************** PATCH METHODS *****************
  // // *************************************************

  // @Patch('update-order')
  // @ApiOperation({
  //   summary: 'Update order of payment links',
  //   description: 'Update the display order of payment links',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Payment links reordered successfully',
  // })
  // @ApiResponse({ status: 400, description: 'Bad Request - Invalid link IDs' })
  // @ApiBody({ type: PaymentLinkOrderDto })
  // async updatePaymentLinkOrder(
  //   @Body() dto: PaymentLinkOrderDto,
  //   @Req() req: RequestWithWalletAuth,
  // ) {
  //   return this.service.updatePaymentLinkOrder(
  //     dto,
  //     req.walletAuth.walletAddress,
  //   );
  // }

  // // *************************************************
  // // **************** DELETE METHODS ****************
  // // *************************************************

  // @Delete()
  // @ApiOperation({
  //   summary: 'Delete payment links',
  //   description:
  //     'Delete one or more payment links by providing their codes. Use an array with one code for single deletion.',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Payment links deleted successfully',
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       message: {
  //         type: 'string',
  //         example: '3 payment link(s) deleted successfully',
  //       },
  //       deletedCount: { type: 'number', example: 3 },
  //       deletedCodes: {
  //         type: 'array',
  //         items: { type: 'string' },
  //         example: ['ABC123', 'DEF456', 'GHI789'],
  //       },
  //     },
  //   },
  // })
  // @ApiResponse({
  //   status: 400,
  //   description: 'Bad Request - Invalid codes or validation failed',
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'One or more payment links not found',
  // })
  // @ApiResponse({
  //   status: 403,
  //   description: 'Forbidden - Not the owner of one or more payment links',
  // })
  // @ApiBody({ type: DeletePaymentLinksDto })
  // async deletePaymentLinks(
  //   @Body() dto: DeletePaymentLinksDto,
  //   @Req() req: RequestWithWalletAuth,
  // ) {
  //   return this.service.deletePaymentLinks(dto, req.walletAuth.walletAddress);
  // }
}
