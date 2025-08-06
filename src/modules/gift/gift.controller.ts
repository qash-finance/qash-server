import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GiftService } from './gift.service';
import { CreateGiftDto } from './gift.dto';
import { WalletAuthGuard } from '../wallet-auth/wallet-auth.guard';
import { RequestWithWalletAuth } from '../../common/interfaces';

@ApiTags('Gift')
@ApiBearerAuth()
@Controller('gift')
export class GiftController {
  constructor(private readonly service: GiftService) {}

  // *************************************************
  // **************** GET METHODS *******************
  // *************************************************
  // get gift dashboard
  @Get('/dashboard')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Get gift dashboard' })
  @ApiResponse({ status: 200, description: 'Gift dashboard' })
  async getGiftDashboard(@Req() req: RequestWithWalletAuth) {
    return this.service.getGiftDashboard(req.walletAuth.walletAddress);
  }

  @Get('/detail')
  @ApiOperation({ summary: 'Get gift details by secret' })
  @ApiResponse({ status: 200, description: 'Gift details' })
  async getGift(@Query('secret') secret: string) {
    // decode code
    const secretWithPlus = secret.replace(/ /g, '+');
    return this.service.getGiftBySecret(secretWithPlus);
  }

  // *************************************************
  // **************** POST METHODS *******************
  // *************************************************
  @Post('/send')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({
    summary: 'Send a gift (creates a gift and returns a link with secret)',
  })
  @ApiResponse({ status: 201, description: 'Gift created' })
  @ApiBody({ type: CreateGiftDto })
  async sendGift(
    @Body() dto: CreateGiftDto,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.service.sendGift(dto, req.walletAuth.walletAddress);
  }

  // *************************************************
  // **************** PUT METHODS *******************
  // *************************************************
  @Put('/open')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Open a gift' })
  @ApiParam({ name: 'secret', description: 'Secret of the gift' })
  @ApiResponse({ status: 200, description: 'Gift opened' })
  async openGift(
    @Body() body: { txId: string; secret: string },
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.service.openGift(
      body.secret,
      body.txId,
      req.walletAuth.walletAddress,
    );
  }
}
