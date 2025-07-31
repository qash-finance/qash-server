import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Request,
  UseGuards,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

import { NotificationService } from './notification.service';
import { RequestWithWalletAuth } from '../../common/interfaces';
import {
  CreateNotificationDto,
  NotificationQueryDto,
  NotificationResponseDto,
} from './notification.dto';
import { NotificationType } from '../../common/enums/notification';
import { WalletAuthGuard } from '../wallet-auth/wallet-auth.guard';
import { Public } from '../../common/decorators/public';

@ApiBearerAuth()
@UseGuards(WalletAuthGuard)
@ApiTags('Notifications')
@Controller('/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /***************************************/
  /***************** GET *****************/
  /***************************************/

  @Get()
  @ApiOperation({
    summary: 'Get user notifications',
    description:
      'Retrieve notifications for the authenticated user with pagination and filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['SEND', 'CLAIM', 'REFUND', 'BATCH_SEND', 'WALLET_CREATE'],
  })
  @ApiQuery({ name: 'status', required: false, enum: ['UNREAD', 'READ'] })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    type: [NotificationResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  public async getUserNotifications(
    @Request() req: RequestWithWalletAuth,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.getWalletNotifications(
      req.walletAuth.walletAddress,
      query,
    );
  }

  @Get('/unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description:
      'Get the count of unread notifications for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  public async getUnreadCount(@Request() req: RequestWithWalletAuth) {
    const count = await this.notificationService.getUnreadCount(
      req.walletAuth.walletAddress,
    );
    return { count };
  }

  @Get('/:id')
  @ApiOperation({
    summary: 'Get notification by ID',
    description: 'Retrieve a specific notification by its ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification retrieved successfully',
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  public async getNotificationById(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithWalletAuth,
  ) {
    const notification = await this.notificationService.getNotificationById(
      id,
      req.walletAuth.walletAddress,
    );
    return this.notificationService['mapToResponseDto'](notification);
  }

  /***************************************/
  /***************** PATCH ***************/
  /***************************************/

  @Patch('/:id/mark-read')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a specific notification as read',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  public async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithWalletAuth,
  ) {
    const notification = await this.notificationService.markAsRead(
      id,
      req.walletAuth.walletAddress,
    );
    return this.notificationService['mapToResponseDto'](notification);
  }

  @Patch('/:id/mark-unread')
  @ApiOperation({
    summary: 'Mark notification as unread',
    description: 'Mark a specific notification as unread',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as unread',
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  public async markAsUnread(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithWalletAuth,
  ) {
    const notification = await this.notificationService.markAsUnread(
      id,
      req.walletAuth.walletAddress,
    );
    return this.notificationService['mapToResponseDto'](notification);
  }

  @Patch('/mark-all-read')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all notifications for the authenticated user as read',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  public async markAllAsRead(@Request() req: RequestWithWalletAuth) {
    await this.notificationService.markAllAsRead(req.walletAuth.walletAddress);
    return { message: 'All notifications marked as read' };
  }

  /***************************************/
  /*************** TEST ****************/
  /************Should be removed**************/

  @Public()
  @Post('/test-emit')
  @ApiOperation({
    summary: 'Test endpoint to emit notification',
    description:
      'Test endpoint to emit any notification back to user (for testing purposes only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        walletAddress: { type: 'string', example: '0x1234567890abcdef' },
        title: { type: 'string', example: 'Test Notification' },
        message: { type: 'string', example: 'This is a test notification' },
        type: {
          type: 'string',
          enum: ['SEND', 'CLAIM', 'REFUND', 'BATCH_SEND', 'WALLET_CREATE'],
          example: 'SEND',
        },
        metadata: {
          type: 'object',
          example: { testKey: 'testValue' },
          nullable: true,
        },
        actionUrl: {
          type: 'string',
          example: 'https://example.com/action',
          nullable: true,
        },
      },
      required: ['walletAddress', 'title', 'message', 'type'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Test notification created and emitted successfully',
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data',
  })
  public async testEmitNotification(
    @Body()
    testData: {
      walletAddress: string;
      title: string;
      message: string;
      type: NotificationType;
      metadata?: Record<string, any>;
      actionUrl?: string;
    },
  ) {
    // // Get user by wallet address
    // const user = await this.notificationService['userService'].getByWalletAddress(testData.walletAddress);
    // if (!user) {
    //   throw new BadRequestException('User not found with the provided wallet address');
    // }

    // Create notification for the wallet
    const createNotificationDto: CreateNotificationDto = {
      walletAddress: testData.walletAddress,
      title: testData.title,
      message: testData.message,
      type: testData.type,
      metadata: testData.metadata || null,
      actionUrl: testData.actionUrl || null,
    };

    const notification = await this.notificationService.createNotification(
      createNotificationDto,
    );

    return this.notificationService['mapToResponseDto'](notification);
  }
}
