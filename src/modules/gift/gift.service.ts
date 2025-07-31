import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { GiftRepository } from './gift.repository';
import { CreateGiftDto } from './gift.dto';
import { AppConfigService } from 'src/common/config/services/config.service';
import { NoteStatus, NoteType } from 'src/common/enums/note';
import { handleError } from 'src/common/utils/errors';
import {
  validateAddress,
  validateAmount,
  validateSerialNumber,
  normalizeAddress,
} from 'src/common/utils/validation.util';
import { ErrorGift } from 'src/common/constants/errors';

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

@Injectable()
export class GiftService {
  private readonly logger = new Logger(GiftService.name);

  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly appConfigService: AppConfigService,
  ) {}

  // *************************************************
  // **************** GET METHODS ********************
  // *************************************************
  public async getGiftBySecret(secret: string) {
    try {
      if (!secret || typeof secret !== 'string') {
        throw new BadRequestException(
          'Secret is required and must be a string',
        );
      }

      if (secret.length < 10) {
        throw new BadRequestException('Invalid secret format');
      }

      const secretHash = hashSecret(secret);
      const gift = await this.giftRepository.findOne({
        secretHash,
      });

      if (!gift) {
        throw new BadRequestException(ErrorGift.GiftNotFound);
      }

      return gift;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** POST METHODS *******************
  // *************************************************

  public async sendGift(dto: CreateGiftDto, senderAddress: string) {
    try {
      // Validate all inputs
      validateAddress(senderAddress, 'senderAddress');
      validateAddress(dto.token, 'token');
      validateAmount(dto.amount, 'amount');
      validateSerialNumber(dto.serialNumber, 'serialNumber');

      // Normalize addresses
      const normalizedSenderAddress = normalizeAddress(senderAddress);
      const normalizedToken = normalizeAddress(dto.token);

      // Generate secure secret
      const secret = randomBytes(24).toString('hex');
      const secretHash = hashSecret(secret);

      // Check if secret hash already exists (extremely unlikely but good practice)
      const existingGift = await this.giftRepository.findOne({ secretHash });
      if (existingGift) {
        // Generate a new secret if collision occurs
        const newSecret = randomBytes(32).toString('hex');
        const newSecretHash = hashSecret(newSecret);

        const gift = await this.createGiftEntity(
          dto,
          newSecretHash,
          normalizedSenderAddress,
          normalizedToken,
        );
        return { ...gift, link: `/gift/${newSecret}` };
      }

      const gift = await this.createGiftEntity(
        dto,
        secretHash,
        normalizedSenderAddress,
        normalizedToken,
      );

      // todo: create recallable transaction for creator, because all gift are default recallable

      return { ...gift, link: `/gift/${secret}` };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** PUT METHODS *******************
  // *************************************************

  public async openGift(secret: string) {
    try {
      if (!secret || typeof secret !== 'string') {
        throw new BadRequestException(
          'Secret is required and must be a string',
        );
      }

      if (secret.length < 10) {
        throw new BadRequestException('Invalid secret format');
      }

      const secretHash = hashSecret(secret);

      // Find the gift by secret hash
      const gift = await this.giftRepository.findOne({ secretHash });
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

      // Check if gift is expired (if recallable time has passed and it's still pending)
      if (
        gift.recallableTime &&
        gift.recallableTime <= new Date() &&
        gift.status === NoteStatus.PENDING
      ) {
        // Auto-expire the gift
        await this.giftRepository.updateOne(
          { secretHash },
          { status: NoteStatus.RECALLED, recalledAt: new Date() },
        );
        throw new BadRequestException(ErrorGift.GiftExpired);
      }

      return this.giftRepository.updateOne(
        { secretHash },
        { status: NoteStatus.CONSUMED, openedAt: new Date() },
      );
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
      const gifts = await this.giftRepository.find({
        sender: normalizedSenderAddress,
        status: NoteStatus.PENDING,
        recallable: true,
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

      return this.giftRepository.find({
        sender: normalizedSenderAddress,
        status: NoteStatus.RECALLED,
      });
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  public async recallGift(id: number) {
    try {
      if (!id || typeof id !== 'number' || id <= 0) {
        throw new BadRequestException('Invalid gift ID');
      }

      // Check if gift exists and is recallable
      const gift = await this.giftRepository.findOne({ id });
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

      return this.giftRepository.updateOne(
        { id },
        { status: NoteStatus.RECALLED, recalledAt: new Date() },
      );
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  private async createGiftEntity(
    dto: CreateGiftDto,
    secretHash: string,
    normalizedSenderAddress: string,
    normalizedToken: string,
  ) {
    return this.giftRepository.create({
      sender: normalizedSenderAddress,
      assets: {
        faucetId: normalizedToken,
        amount: dto.amount,
      },
      secretHash,
      status: NoteStatus.PENDING,
      recallableTime: new Date(
        Date.now() +
          this.appConfigService.otherConfig.giftRecallableAfter * 1000,
      ),
      serialNumber: dto.serialNumber,
      noteType: NoteType.GIFT,
    });
  }
}
