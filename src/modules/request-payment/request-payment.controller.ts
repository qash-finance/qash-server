import {
  Body,
  Controller,
  Get,
  Post,
  Put,
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
} from '@nestjs/swagger';
import { RequestPaymentService } from './request-payment.service';
import { CreateRequestPaymentDto } from './request-payment.dto';
import { WalletAuthGuard } from '../wallet-auth/wallet-auth.guard';
import { RequestWithWalletAuth } from '../../common/interfaces';

@ApiTags('Request Payment')
@ApiBearerAuth()
@Controller('request-payment')
export class RequestPaymentController {
  constructor(private readonly service: RequestPaymentService) {}

  // *************************************************
  // **************** GET METHODS ******************
  // *************************************************

  @Get()
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Get all pending and accepted requests for user' })
  @ApiResponse({ status: 200, description: 'List of requests' })
  async getAllPendingRequest(@Req() req: RequestWithWalletAuth) {
    return this.service.getRequests(req.walletAuth.walletAddress);
  }

  // *************************************************
  // **************** POST METHODS ******************
  // *************************************************

  @Post()
  @ApiOperation({ summary: 'Create a new payment request' })
  @ApiResponse({ status: 201, description: 'Request created' })
  @ApiBody({ type: CreateRequestPaymentDto })
  async createPendingRequest(@Body() dto: CreateRequestPaymentDto) {
    return this.service.createRequest(dto);
  }

  // *************************************************
  // **************** PUT METHODS ******************
  // *************************************************

  @Put(':id/accept')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Accept a pending request' })
  @ApiResponse({ status: 200, description: 'Request accepted' })
  async accept(
    @Param('id') id: number,
    @Req() req: RequestWithWalletAuth,
    @Body() body: { txid: string },
  ) {
    return this.service.acceptRequest(
      id,
      req.walletAuth.walletAddress,
      body.txid,
    );
  }

  @Put(':id/deny')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Deny a pending request' })
  @ApiResponse({ status: 200, description: 'Request denied' })
  async deny(@Param('id') id: number, @Req() req: RequestWithWalletAuth) {
    return this.service.denyRequest(id, req.walletAuth.walletAddress);
  }
}
