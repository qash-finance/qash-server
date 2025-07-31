import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';

import { NotificationEntity } from './notification.entity';
import { NotificationRepository } from './notification.repository';
import {
  CreateNotificationDto,
  NotificationQueryDto,
  NotificationResponseDto,
} from './notification.dto';
import {
  NotificationType,
  NotificationStatus,
} from '../../common/enums/notification';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly notificationGateway?: NotificationGateway,
  ) {}

  public async createNotification(
    dto: CreateNotificationDto,
  ): Promise<NotificationEntity> {
    this.logger.log(
      `Creating notification for wallet ${dto.walletAddress} of type ${dto.type}`,
    );
    const notification = await this.notificationRepository.create(dto);

    // Emit real-time notification to wallet if gateway is available and wallet is connected
    if (
      this.notificationGateway &&
      this.notificationGateway.isWalletConnected(dto.walletAddress)
    ) {
      const notificationDto = this.mapToResponseDto(notification);
      this.notificationGateway.emitNotificationToWallet(
        dto.walletAddress,
        notificationDto,
      );

      // Also emit updated unread count
      const unreadCount = await this.getUnreadCount(dto.walletAddress);
      this.notificationGateway.emitUnreadCountToWallet(
        dto.walletAddress,
        unreadCount,
      );
    }

    return notification;
  }

  public async getWalletNotifications(
    walletAddress: string,
    query: NotificationQueryDto,
  ): Promise<{
    notifications: NotificationResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, type, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { walletAddress };
    if (type) where.type = type;
    if (status) where.status = status;

    const [notifications, total] =
      await this.notificationRepository.findAndCount(where, {
        skip,
        take: limit,
      });

    const totalPages = Math.ceil(total / limit);

    return {
      notifications: notifications.map(this.mapToResponseDto),
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async getNotificationById(
    id: number,
    walletAddress: string,
  ): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.findOne({
      id,
      walletAddress,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  public async markAsRead(
    id: number,
    walletAddress: string,
  ): Promise<NotificationEntity> {
    const updatedNotification = await this.notificationRepository.updateOne(
      { id, walletAddress },
      { status: NotificationStatus.READ },
    );

    // Emit real-time update if gateway is available and wallet is connected
    if (
      this.notificationGateway &&
      this.notificationGateway.isWalletConnected(walletAddress)
    ) {
      this.notificationGateway.emitNotificationReadToWallet(walletAddress, id);

      // Also emit updated unread count
      const unreadCount = await this.getUnreadCount(walletAddress);
      this.notificationGateway.emitUnreadCountToWallet(
        walletAddress,
        unreadCount,
      );
    }

    return updatedNotification;
  }

  public async markAsUnread(
    id: number,
    walletAddress: string,
  ): Promise<NotificationEntity> {
    return this.notificationRepository.updateOne(
      { id, walletAddress },
      { status: NotificationStatus.UNREAD },
    );
  }

  public async markAllAsRead(walletAddress: string): Promise<void> {
    await this.notificationRepository.markAllAsRead(walletAddress);
    this.logger.log(
      `Marked all notifications as read for wallet ${walletAddress}`,
    );

    // Emit real-time update if gateway is available and wallet is connected
    if (
      this.notificationGateway &&
      this.notificationGateway.isWalletConnected(walletAddress)
    ) {
      this.notificationGateway.emitAllNotificationsReadToWallet(walletAddress);
      this.notificationGateway.emitUnreadCountToWallet(walletAddress, 0);
    }
  }

  public async getUnreadCount(walletAddress: string): Promise<number> {
    return this.notificationRepository.getUnreadCount(walletAddress);
  }

  // These methods are now the primary methods (no longer wallet-specific aliases)

  // Convenience methods for creating specific notification types
  public async createSendNotification(
    walletAddress: string,
    data: {
      recipientAddress: string;
      amount: string;
      assetType: string;
      transactionId?: string;
    },
  ): Promise<NotificationEntity> {
    return this.createNotification({
      walletAddress,
      type: NotificationType.SEND,
      title: 'Payment Sent',
      message: `You sent ${data.amount} ${data.assetType} to ${data.recipientAddress}`,
      metadata: data,
      actionUrl: data.transactionId
        ? `/transactions/${data.transactionId}`
        : null,
    });
  }

  public async createClaimNotification(
    walletAddress: string,
    data: {
      amount: string;
      assetType: string;
      senderAddress: string;
      transactionId?: string;
    },
  ): Promise<NotificationEntity> {
    return this.createNotification({
      walletAddress,
      type: NotificationType.CONSUME,
      title: 'Payment Received',
      message: `You received ${data.amount} ${data.assetType} from ${data.senderAddress}`,
      metadata: data,
      actionUrl: data.transactionId
        ? `/transactions/${data.transactionId}`
        : null,
    });
  }

  public async createRefundNotification(
    walletAddress: string,
    data: {
      amount: string;
      assetType: string;
      originalRecipient: string;
      transactionId?: string;
    },
  ): Promise<NotificationEntity> {
    return this.createNotification({
      walletAddress,
      type: NotificationType.REFUND,
      title: 'Payment Refunded',
      message: `Your payment of ${data.amount} ${data.assetType} to ${data.originalRecipient} has been refunded`,
      metadata: data,
      actionUrl: data.transactionId
        ? `/transactions/${data.transactionId}`
        : null,
    });
  }

  public async createBatchSendNotification(
    walletAddress: string,
    data: {
      recipientCount: number;
      totalAmount: string;
      assetType: string;
      batchId?: string;
    },
  ): Promise<NotificationEntity> {
    return this.createNotification({
      walletAddress,
      type: NotificationType.BATCH_SEND,
      title: 'Batch Payment Sent',
      message: `You sent ${data.totalAmount} ${data.assetType} to ${data.recipientCount} recipients`,
      metadata: data,
      actionUrl: data.batchId ? `/batch-payments/${data.batchId}` : null,
    });
  }

  public async createWalletCreateNotification(
    walletAddress: string,
    data: {
      walletAddress: string;
      walletType?: string;
    },
  ): Promise<NotificationEntity> {
    return this.createNotification({
      walletAddress,
      type: NotificationType.WALLET_CREATE,
      title: 'Wallet Created',
      message: `Your new wallet has been created successfully`,
      metadata: data,
      actionUrl: '/wallet',
    });
  }

  private mapToResponseDto(
    notification: NotificationEntity,
  ): NotificationResponseDto {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      status: notification.status,
      metadata: notification.metadata,
      actionUrl: notification.actionUrl,
      walletAddress: notification.walletAddress,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      readAt: notification.readAt,
    };
  }
}
