import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
  Repository,
} from 'typeorm';

import { NotificationEntity } from './notification.entity';
import {
  CreateNotificationDto,
  UpdateNotificationStatusDto,
} from './notification.dto';
import { NotificationStatus } from 'src/common/enums/notification';

@Injectable()
export class NotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationEntityRepository: Repository<NotificationEntity>,
  ) {}

  public async create(dto: CreateNotificationDto): Promise<NotificationEntity> {
    const notification = this.notificationEntityRepository.create(dto);
    return notification.save();
  }

  public async findOne(
    where: FindOptionsWhere<NotificationEntity>,
    options?: FindOneOptions<NotificationEntity>,
  ): Promise<NotificationEntity | null> {
    return this.notificationEntityRepository.findOne({
      where,
      ...options,
    });
  }

  public async find(
    where: FindOptionsWhere<NotificationEntity>,
    options?: FindManyOptions<NotificationEntity>,
  ): Promise<NotificationEntity[]> {
    return this.notificationEntityRepository.find({
      where,
      order: {
        createdAt: 'DESC',
      },
      ...options,
    });
  }

  public async findAndCount(
    where: FindOptionsWhere<NotificationEntity>,
    options?: FindManyOptions<NotificationEntity>,
  ): Promise<[NotificationEntity[], number]> {
    return this.notificationEntityRepository.findAndCount({
      where,
      order: {
        createdAt: 'DESC',
      },
      ...options,
    });
  }

  public async updateOne(
    where: FindOptionsWhere<NotificationEntity>,
    dto: Partial<UpdateNotificationStatusDto>,
  ): Promise<NotificationEntity> {
    const notification =
      await this.notificationEntityRepository.findOneBy(where);

    if (!notification) {
      this.logger.error('Notification not found for update');
      throw new Error('Notification not found');
    }

    Object.assign(notification, dto);

    // Set readAt timestamp when marking as read
    if (dto.status === 'READ') {
      notification.readAt = new Date();
    }

    return notification.save();
  }

  public async getUnreadCount(walletAddress: string): Promise<number> {
    return this.notificationEntityRepository.count({
      where: {
        walletAddress,
        status: NotificationStatus.UNREAD,
      },
    });
  }

  public async markAllAsRead(walletAddress: string): Promise<void> {
    await this.notificationEntityRepository.update(
      { walletAddress, status: NotificationStatus.UNREAD },
      { status: NotificationStatus.READ, readAt: new Date() },
    );
  }
}
