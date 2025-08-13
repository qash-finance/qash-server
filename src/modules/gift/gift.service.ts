import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateGiftDto } from './gift.dto';
import { AppConfigService } from '../../common/config/services/config.service';
import { NoteStatus, NoteType } from '../../common/enums/note';
import { handleError } from '../../common/utils/errors';
import {
  validateAddress,
  validateSerialNumber,
  normalizeAddress,
} from '../../common/utils/validation.util';
import { ErrorGift } from '../../common/constants/errors';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/common/enums/notification';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class GiftService {
  private readonly logger = new Logger(GiftService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly appConfigService: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // *************************************************
  // **************** GET METHODS ********************
  // *************************************************
  public async getGiftBySecret(secretNumber: string) {
    try {
      console.log('FINDING GIFT BY SECRET', secretNumber);
      const gift = await this.prisma.gift.findFirst({
        where: { secretHash: secretNumber },
      });

      if (!gift) {
        throw new BadRequestException(ErrorGift.GiftNotFound);
      }

      return gift;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  public async getGiftDashboard(senderAddress: string) {
    try {
      validateAddress(senderAddress, 'senderAddress');
      const normalizedSenderAddress = normalizeAddress(senderAddress);

      // we will get all gifts for the sender
      const gifts = await this.prisma.gift.findMany({
        where: { sender: normalizedSenderAddress },
        orderBy: { createdAt: 'desc' },
      });

      // calculate total amount of gifts
      const totalAmount = gifts.reduce((acc, gift) => {
        return acc + Number(gift.assets[0].amount);
      }, 0);

      // total opened gifts
      const totalOpenedGifts = gifts.filter(
        (gift) => gift.status === NoteStatus.CONSUMED,
      ).length;

      return {
        totalAmount,
        totalOpenedGifts,
        gifts,
      };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** POST METHODS *******************
  // *************************************************

  public async sendGift(dto: CreateGiftDto, senderAddress: string) {
    try {
      validateAddress(senderAddress, 'senderAddress');
      validateSerialNumber(dto.serialNumber, 'serialNumber');

      const normalizedSenderAddress = normalizeAddress(senderAddress);

      const gift = await this.createGiftEntity(dto, normalizedSenderAddress);

      // create notification
      await this.notificationService.createNotification({
        walletAddress: senderAddress,
        title: 'Gift created successfully',
        message: 'Gift created successfully',
        type: NotificationType.GIFT_SEND,
        metadata: {
          tokenId: dto.assets[0].faucetId,
          tokenName: dto.assets[0].metadata.symbol,
          amount: dto.assets[0].amount,
          transactionId: dto.txId,
        },
      });
      return { ...gift };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** PUT METHODS *******************
  // *************************************************

  public async openGift(secret: string, txId: string, caller: string) {
    try {
      if (!secret || typeof secret !== 'string') {
        throw new BadRequestException(
          'Secret is required and must be a string',
        );
      }

      // decode secret
      const decodedSecret = decodeURIComponent(secret);

      // if there's a space in the secret, replace it with a plus
      const secretWithPlus = decodedSecret.replace(/ /g, '+');

      // Find the gift by secret hash
      const gift = await this.prisma.gift.findFirst({
        where: { secretHash: secretWithPlus },
      });
      if (!gift) {
        throw new BadRequestException(ErrorGift.GiftNotFound);
      }

      // Check if gift is already opened
      if (gift.status === NoteStatus.CONSUMED) {
        throw new BadRequestException(ErrorGift.GiftAlreadyOpened);
      }

      // Check if gift is recalled
      if (gift.status === NoteStatus.RECALLED) {
        throw new BadRequestException('Gift has been recalled by sender');
      }

      await this.notificationService.createNotification({
        walletAddress: gift.sender,
        title: 'Gift opened by',
        message: 'Gift opened by',
        type: NotificationType.GIFT_OPEN,
        metadata: {
          tokenId: gift.assets[0].faucetId,
          tokenName: gift.assets[0].metadata.symbol,
          amount: gift.assets[0].amount,
          transactionId: txId,
          caller: caller,
        },
      });

      await this.notificationService.createNotification({
        walletAddress: caller,
        title: 'You claimed a gift!',
        message: 'Gift claimed successfully',
        type: NotificationType.GIFT_CLAIM,
        metadata: {
          tokenId: gift.assets[0].faucetId,
          tokenName: gift.assets[0].metadata.symbol,
          amount: gift.assets[0].amount,
          transactionId: txId,
          caller: caller,
        },
      });

      return this.prisma.gift.update({
        where: { id: gift.id },
        data: { status: NoteStatus.CONSUMED, openedAt: new Date(), updatedAt: new Date() },
      });
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** UTILS METHODS ********************
  // *************************************************

  public async findRecallableGifts(senderAddress: string) {
    try {
      validateAddress(senderAddress, 'senderAddress');
      const normalizedSenderAddress = normalizeAddress(senderAddress);

      const now = new Date();
      const gifts = await this.prisma.gift.findMany({
        where: {
          sender: normalizedSenderAddress,
          status: NoteStatus.PENDING,
          recallable: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Filter gifts that are actually recallable (recallableTime has passed)
      return gifts.filter(
        (gift) => !gift.recallableTime || gift.recallableTime <= now,
      );
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  public async findRecalledGifts(senderAddress: string) {
    try {
      validateAddress(senderAddress, 'senderAddress');
      const normalizedSenderAddress = normalizeAddress(senderAddress);

      return this.prisma.gift.findMany({
        where: {
          sender: normalizedSenderAddress,
          status: NoteStatus.RECALLED,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  public async recallGift(id: number, txId: string) {
    try {
      if (!id || typeof id !== 'number' || id <= 0) {
        throw new BadRequestException('Invalid gift ID');
      }

      // Check if gift exists and is recallable
      const gift = await this.prisma.gift.findFirst({ where: { id } });
      if (!gift) {
        throw new BadRequestException(ErrorGift.GiftNotFound);
      }

      if (gift.status !== NoteStatus.PENDING) {
        throw new BadRequestException(
          'Gift cannot be recalled - it has already been processed',
        );
      }

      if (!gift.recallable) {
        throw new BadRequestException('Gift is not recallable');
      }

      if (gift.recallableTime && gift.recallableTime > new Date()) {
        throw new BadRequestException(
          'Gift cannot be recalled yet - recall time has not passed',
        );
      }

      // create notification
      await this.notificationService.createNotification({
        walletAddress: gift.sender,
        title: 'Gift recalled successfully',
        message: 'Gift recalled successfully',
        type: NotificationType.REFUND,
        metadata: {
          tokenId: gift.assets[0].faucetId,
          tokenName: gift.assets[0].metadata.symbol,
          amount: gift.assets[0].amount,
          transactionId: txId,
        },
      });

      return this.prisma.gift.update({
        where: { id },
        data: { status: NoteStatus.RECALLED, recalledAt: new Date(), updatedAt: new Date() },
      });
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // gift can be recall immediately
  private async createGiftEntity(
    dto: CreateGiftDto,
    normalizedSenderAddress: string,
  ) {
    const now = new Date();
    return this.prisma.gift.create({
      data: {
        sender: normalizedSenderAddress,
        status: NoteStatus.PENDING,
        recallableTime: new Date(Date.now()),
        recallable: true,
        secretHash: dto.secretNumber,
        serialNumber: dto.serialNumber,
        noteType: NoteType.GIFT,
        noteId: dto.txId,
        assets: {
          create: dto.assets.map((asset) => ({
            ...asset,
          })),
        },
        createdAt: now,
        updatedAt: now,
      },
    });
  }
}
