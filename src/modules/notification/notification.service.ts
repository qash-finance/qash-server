import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';

import {
  CreateNotificationDto,
  NotificationQueryDto,
  NotificationResponseDto,
} from './notification.dto';
import { NotificationGateway } from './notification.gateway';
import { NotificationRepository } from './notification.repository';
import {
  Notifications,
  NotificationsStatusEnum,
  NotificationsTypeEnum,
} from '@prisma/client';

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
  ): Promise<Notifications> {
    this.logger.log(
      `Creating notification for wallet ${dto.walletAddress} of type ${dto.type}`,
    );

    const now = new Date();
    const notification = await this.notificationRepository.create({
      ...dto,
      createdAt: now,
      updatedAt: now,
    });

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

    const [notifications, total] = await Promise.all([
      this.notificationRepository.findByWalletWithPagination(walletAddress, {
        skip,
        take: limit,
        type,
        status,
      }),
      this.notificationRepository.countByWallet(walletAddress, {
        type,
        status,
      }),
    ]);

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
  ): Promise<Notifications> {
    const notification = await this.notificationRepository.findByIdAndWallet(
      id,
      walletAddress,
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  public async markAsRead(
    id: number,
    walletAddress: string,
  ): Promise<Notifications> {
    const updatedNotification = await this.notificationRepository.updateStatus(
      id,
      walletAddress,
      NotificationsStatusEnum.READ,
      { readAt: new Date() },
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
  ): Promise<Notifications> {
    return this.notificationRepository.updateStatus(
      id,
      walletAddress,
      NotificationsStatusEnum.UNREAD,
    );
  }

  public async markAllAsRead(walletAddress: string): Promise<void> {
    await this.notificationRepository.markAllAsReadForWallet(walletAddress);

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
    return this.notificationRepository.countUnreadByWallet(walletAddress);
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
  ): Promise<Notifications> {
    return this.createNotification({
      walletAddress,
      type: NotificationsTypeEnum.SEND,
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
  ): Promise<Notifications> {
    return this.createNotification({
      walletAddress,
      type: NotificationsTypeEnum.CLAIM,
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
  ): Promise<Notifications> {
    return this.createNotification({
      walletAddress,
      type: NotificationsTypeEnum.REFUND,
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
  ): Promise<Notifications> {
    return this.createNotification({
      walletAddress,
      type: NotificationsTypeEnum.BATCH_SEND,
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
  ): Promise<Notifications> {
    return this.createNotification({
      walletAddress,
      type: NotificationsTypeEnum.WALLET_CREATE,
      title: 'Wallet Created',
      message: `Your new wallet has been created successfully`,
      metadata: data,
      actionUrl: '/wallet',
    });
  }

  public async createRequestPaymentNotification(
    walletAddress: string,
    data: {
      message: string;
      amount: string;
      tokenName: string;
      tokenId: string;
      payee: string;
    },
  ): Promise<Notifications> {
    return this.createNotification({
      walletAddress,
      type: NotificationsTypeEnum.REQUEST_PAYMENT,
      title: 'Payment Request',
      message: data.message,
      metadata: {
        payee: data.payee,
        amount: data.amount,
        tokenId: data.tokenId,
        tokenName: data.tokenName,
      },
    });
  }

  private mapToResponseDto(
    notification: Notifications,
  ): NotificationResponseDto {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      status: notification.status,
      metadata: notification.metadata as Record<string, any>,
      actionUrl: notification.actionUrl,
      walletAddress: notification.walletAddress,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      readAt: notification.readAt,
    };
  }
}
