import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SchedulePaymentService } from './schedule-payment.service';
import {
  CreateSchedulePaymentDto,
  UpdateSchedulePaymentDto,
  SchedulePaymentQueryDto,
} from './schedule-payment.dto';
import { WalletAuthGuard } from '../wallet-auth/wallet-auth.guard';
import { RequestWithWalletAuth } from '../../common/interfaces';

@ApiTags('Schedule Payment')
@ApiBearerAuth()
@Controller('schedule-payment')
export class SchedulePaymentController {
  constructor(private readonly service: SchedulePaymentService) {}

  // *************************************************
  // **************** GET METHODS ******************
  // *************************************************

  @Get()
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Get schedule payments for user' })
  @ApiResponse({ status: 200, description: 'List of schedule payments' })
  @ApiQuery({ type: SchedulePaymentQueryDto, required: false })
  async getSchedulePayments(
    @Req() req: RequestWithWalletAuth,
    @Query() query?: SchedulePaymentQueryDto,
  ) {
    return this.service.getSchedulePayments(req.walletAuth.walletAddress, query);
  }

  @Get(':id')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Get schedule payment by ID' })
  @ApiResponse({ status: 200, description: 'Schedule payment details' })
  @ApiResponse({ status: 404, description: 'Schedule payment not found' })
  async getSchedulePaymentById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.service.getSchedulePaymentById(id, req.walletAuth.walletAddress);
  }

  // *************************************************
  // **************** POST METHODS ******************
  // *************************************************

  @Post()
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Create a new schedule payment' })
  @ApiResponse({ status: 201, description: 'Schedule payment created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({ type: CreateSchedulePaymentDto })
  async createSchedulePayment(@Body() dto: CreateSchedulePaymentDto) {
    return this.service.createSchedulePayment(dto);
  }

  // *************************************************
  // **************** PUT METHODS ******************
  // *************************************************

  @Put(':id')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Update schedule payment' })
  @ApiResponse({ status: 200, description: 'Schedule payment updated' })
  @ApiResponse({ status: 404, description: 'Schedule payment not found' })
  @ApiBody({ type: UpdateSchedulePaymentDto })
  async updateSchedulePayment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithWalletAuth,
    @Body() dto: UpdateSchedulePaymentDto,
  ) {
    return this.service.updateSchedulePayment(
      id,
      req.walletAuth.walletAddress,
      dto,
    );
  }

  @Put(':id/pause')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Pause schedule payment' })
  @ApiResponse({ status: 200, description: 'Schedule payment paused' })
  @ApiResponse({ status: 404, description: 'Schedule payment not found' })
  async pauseSchedulePayment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.service.pauseSchedulePayment(id, req.walletAuth.walletAddress);
  }

  @Put(':id/resume')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Resume schedule payment' })
  @ApiResponse({ status: 200, description: 'Schedule payment resumed' })
  @ApiResponse({ status: 404, description: 'Schedule payment not found' })
  async resumeSchedulePayment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.service.resumeSchedulePayment(id, req.walletAuth.walletAddress);
  }

  @Put(':id/cancel')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Cancel schedule payment' })
  @ApiResponse({ status: 200, description: 'Schedule payment cancelled' })
  @ApiResponse({ status: 404, description: 'Schedule payment not found' })
  async cancelSchedulePayment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.service.cancelSchedulePayment(id, req.walletAuth.walletAddress);
  }

  // *************************************************
  // **************** DELETE METHODS ****************
  // *************************************************

  @Delete(':id')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Delete schedule payment' })
  @ApiResponse({ status: 200, description: 'Schedule payment deleted' })
  @ApiResponse({ status: 404, description: 'Schedule payment not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete active schedule payment with executions' })
  async deleteSchedulePayment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithWalletAuth,
  ) {
    return this.service.deleteSchedulePayment(id, req.walletAuth.walletAddress);
  }
}
