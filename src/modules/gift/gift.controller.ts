import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
  @Get('/:secret')
  @ApiOperation({ summary: 'Get gift details by secret' })
  @ApiResponse({ status: 200, description: 'Gift details' })
  async getGift(@Param('secret') secret: string) {
    return this.service.getGiftBySecret(secret);
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
  @Put('/:secret/open')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Open a gift' })
  @ApiParam({ name: 'secret', description: 'Secret of the gift' })
  @ApiResponse({ status: 200, description: 'Gift opened' })
  async openGift(@Param('secret') secret: string) {
    return this.service.openGift(secret);
  }
}
