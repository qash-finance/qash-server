import { BadRequestException, Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { TransactionRepository } from './transaction.repository';
import { TransactionEntity } from './transaction.entity';
import {
  SendTransactionDto,
  RecallRequestDto,
  ConsumePublicTransactionDto,
} from './transaction.dto';
import { handleError } from '../../common/utils/errors';
import { In } from 'typeorm';
import { GiftService } from '../gift/gift.service';
import { NoteStatus } from '../../common/enums/note';
import {
  validateAddress,
  validateAmount,
  validateSerialNumber,
  validateFutureDate,
  normalizeAddress,
} from '../../common/utils/validation.util';
import { ErrorTransaction } from '../../common/constants/errors';
import { NotificationService } from '../notification/notification.service';
import { RequestPaymentService } from '../request-payment/request-payment.service';
import { RequestPaymentStatus } from '../request-payment/request-payment.entity';
import { NotificationType } from '../../common/enums/notification';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly notificationService: NotificationService,
    private readonly giftService: GiftService,
    @Inject(forwardRef(() => RequestPaymentService))
    private readonly requestPaymentService: RequestPaymentService,
  ) {}

  // *************************************************
  // **************** GET METHODS ********************
  // *************************************************

  async getConsumableTransactions(userId: string): Promise<{
    consumableTxs: TransactionEntity[];
    recallableTxs: TransactionEntity[];
  }> {
    try {
      validateAddress(userId, 'userId');
      const normalizedUserId = normalizeAddress(userId);

      // Fetch all private, recallable, and pending transactions sent to this user
      const txs = await this.transactionRepository.find({
        recipient: normalizedUserId,
        status: NoteStatus.PENDING,
      });

      const recallableTxs = await this.transactionRepository.find({
        sender: normalizedUserId,
        recallable: true,
        status: NoteStatus.PENDING,
      });
      return {
        consumableTxs: txs,
        recallableTxs,
      };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async getRecallDashboardData(userAddress: string) {
    try {
      validateAddress(userAddress, 'userAddress');
      const normalizedUserAddress = normalizeAddress(userAddress);

      // Fetch all recallable transactions sent by this user
      const allRecallable = await this.transactionRepository.find({
        sender: normalizedUserAddress,
        recallable: true,
        status: NoteStatus.PENDING,
      });

      // Split into recallable (pending recall) and waitingToRecall
      const now = new Date();
      const recallable = allRecallable.filter(
        (tx) =>
          (!tx.recallableTime || tx.recallableTime <= now) &&
          tx.status === NoteStatus.PENDING,
      );
      const waitingToRecall = allRecallable.filter(
        (tx) =>
          tx.recallableTime &&
          tx.recallableTime > now &&
          tx.status === NoteStatus.PENDING,
      );

      // Fetch recallable and waiting gifts (red packets)
      const allGifts = await this.giftService.findRecallableGifts(
        normalizedUserAddress,
      );

      const recallableGifts = allGifts.filter(
        (gift) => gift.recallableTime && gift.recallableTime <= now,
      );
      const waitingGifts = allGifts.filter(
        (gift) => gift.recallableTime && gift.recallableTime > now,
      );

      // Map gifts to unified format
      const recallableGiftItems = recallableGifts.map((gift) => ({
        ...gift,
        isGift: true,
      }));
      const waitingGiftItems = waitingGifts.map((gift) => ({
        ...gift,
        isGift: true,
      }));

      // Map transactions to unified format
      const recallableTxItems = recallable.map((tx) => ({
        ...tx,
        isGift: false,
      }));
      const waitingTxItems = waitingToRecall.map((tx) => ({
        ...tx,
        isGift: false,
      }));

      // Merge
      const recallableItems = [...recallableTxItems, ...recallableGiftItems];
      const waitingToRecallItems = [...waitingTxItems, ...waitingGiftItems];

      // Find the next recall time (minimum recallableTime in waitingToRecall and recallableAfter in waitingGifts)
      let nextRecallTime: Date | null = null;
      const allWaitingTimes = [
        ...waitingToRecall.map((tx) => tx.recallableTime),
        ...waitingGifts.map((gift) => gift.recallableTime),
      ].filter(Boolean);
      if (allWaitingTimes.length > 0) {
        nextRecallTime = allWaitingTimes.reduce(
          (min, t) => (!min || (t && t < min) ? t : min),
          null as Date | null,
        );
      }

      // Count all recalled transactions for this user
      const recalledTxs = await this.transactionRepository.find({
        sender: normalizedUserAddress,
        status: NoteStatus.RECALLED,
      });

      const recalledGifts = await this.giftService.findRecalledGifts(
        normalizedUserAddress,
      );

      const recalledCount = recalledTxs.length + recalledGifts.length;

      return {
        recallableItems,
        waitingToRecallItems,
        nextRecallTime,
        recalledCount,
      };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** POST METHODS *******************
  // *************************************************

  async sendSingle(
    dto: SendTransactionDto,
    sender: string,
  ): Promise<TransactionEntity | null> {
    try {
      console.log('DID I HIT THIS');
      const entityData = await this.validateTransaction(dto, sender);
      if (!entityData) return null;

      await this.notificationService.createNotification({
        walletAddress: sender,
        title: 'Transaction sent successfully',
        message: 'Transaction sent successfully',
        type: NotificationType.SEND,
        metadata: {
          recipient: dto.recipient,
          tokenId: dto.assets[0].faucetId,
          tokenName: dto.assets[0].metadata.symbol,
          amount: dto.assets[0].amount,
          transactionId: dto.transactionId,
        },
      });

      return await this.transactionRepository.create(entityData);
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async sendBatch(
    dtos: SendTransactionDto[],
    sender: string,
  ): Promise<TransactionEntity[]> {
    try {
      if (!dtos || !Array.isArray(dtos) || dtos.length === 0) {
        throw new BadRequestException(
          'Transaction array is required and cannot be empty',
        );
      }

      if (dtos.length > 100) {
        throw new BadRequestException(
          'Maximum 100 transactions allowed per batch',
        );
      }

      const entities: Partial<TransactionEntity>[] = [];

      // validate each dto
      for (const dto of dtos) {
        const entityData = await this.validateTransaction(dto, sender);
        if (entityData) {
          entities.push(entityData);
        }
      }

      if (entities.length === 0) {
        return [];
      }

      for (const dto of dtos) {
        await this.notificationService.createNotification({
          walletAddress: sender,
          title: 'Transaction sent successfully',
          message: 'Transaction sent successfully',
          type: NotificationType.SEND,
          metadata: {
            recipient: dto.recipient,
            tokenId: dto.assets[0].faucetId,
            tokenName: dto.assets[0].metadata.symbol,
            amount: dto.assets[0].amount,
            transactionId: dto.transactionId,
          },
        });
      }

      return this.transactionRepository.createMany(entities);
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** PUT METHODS *******************
  // *************************************************

  async recallTransactions(
    noteIds: string[],
    sender: string,
    txId: string,
  ): Promise<{ affected: number }> {
    try {
      const ids = this.parseAndValidateTransactionIds(noteIds);

      // First check if transactions are available and in pending status
      const transactions = await this.transactionRepository.find({
        id: In(ids),
        status: NoteStatus.PENDING,
      });

      // check if sender is the owner of the transactions
      const isOwner = transactions.every((tx) => tx.sender === sender);
      if (!isOwner) {
        throw new BadRequestException(ErrorTransaction.NotOwner);
      }

      if (transactions.length !== ids.length) {
        throw new BadRequestException(ErrorTransaction.TransactionNotFound);
      }

      // Check if transactions are recallable
      const now = new Date();
      const nonRecallable = transactions.filter(
        (tx) =>
          !tx.recallable || (tx.recallableTime && tx.recallableTime > now),
      );

      if (nonRecallable.length > 0) {
        throw new BadRequestException(
          'Some transactions are not recallable yet',
        );
      }

      // loop through transactions and create notification for each transaction
      for (const tx of transactions) {
        await this.notificationService.createNotification({
          walletAddress: sender,
          title: 'We’ve refunded',
          message: 'We’ve refunded',
          type: NotificationType.REFUND,
          metadata: {
            recipient: tx.recipient,
            tokenId: tx.assets[0].faucetId,
            tokenName: tx.assets[0].metadata.symbol,
            amount: tx.assets[0].amount,
            transactionId: txId,
          },
        });
      }

      const affected = await this.transactionRepository.updateMany(
        { id: In(ids), status: NoteStatus.PENDING },
        { status: NoteStatus.RECALLED },
      );
      return { affected: affected || 0 };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async consumeTransactions(
    notes: { noteId: string; txId: string }[],
    sender: string,
  ): Promise<{ affected: number }> {
    try {
      const ids = this.parseAndValidateTransactionIds(
        notes.map((note) => note.noteId),
      );

      // First check if transactions are available and in pending status
      const transactions = await this.transactionRepository.find({
        noteId: In(ids),
        status: NoteStatus.PENDING,
      });

      // check if sender is the recipient of the transactions
      const isRecipient = transactions.every((tx) => tx.recipient === sender);
      if (!isRecipient) {
        throw new BadRequestException(ErrorTransaction.NotRecipient);
      }

      const affected = await this.transactionRepository.updateMany(
        { noteId: In(ids), status: NoteStatus.PENDING },
        { status: NoteStatus.CONSUMED },
      );

      // loop through transactions and create notification for each transaction
      for (const tx of transactions) {
        await this.notificationService.createNotification({
          walletAddress: sender,
          title: 'You’ve successfully claimed',
          message: 'You’ve successfully claimed',
          type: NotificationType.CONSUME,
          metadata: {
            recipient: tx.recipient,
            tokenId: tx.assets[0].faucetId,
            tokenName: tx.assets[0].metadata.symbol,
            amount: tx.assets[0].amount,
            transactionId: notes.find((note) => note.noteId == tx.noteId)?.txId,
          },
        });

        // If this transaction is tied to a request payment, settle it on claim
        if (tx.requestPaymentId) {
          try {
            const consumedTxId = notes.find((n) => n.noteId === tx.noteId)?.txId;
            await this.requestPaymentService.settleOnClaim(
              tx.requestPaymentId,
              sender,
              consumedTxId,
            );
          } catch (e) {
            this.logger.warn(
              `Failed to settle linked request payment ${tx.requestPaymentId}: ${e?.message}`,
            );
          }
        }
      }

      return { affected: affected || 0 };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async consumePublicTransactions(
    notes: ConsumePublicTransactionDto[],
    caller: string,
  ): Promise<{ affected: number }> {
    try {
      const transactions = await this.transactionRepository.find({
        noteId: In(notes.map((note) => note.noteId)),
        status: NoteStatus.PENDING,
      });

       // check if sender is the recipient of the transactions
       const isRecipient = transactions.every((tx) => tx.recipient === caller);
       if (!isRecipient) {
         throw new BadRequestException(ErrorTransaction.NotRecipient);
       }
 
       const affected = await this.transactionRepository.updateMany(
         { noteId: In(notes.map((note) => note.noteId)), status: NoteStatus.PENDING },
         { status: NoteStatus.CONSUMED },
       );

      for (const note of notes) {
        await this.notificationService.createNotification({
          walletAddress: caller,
          title: 'You’ve successfully claimed',
          message: 'You’ve successfully claimed',
          type: NotificationType.CONSUME,
          metadata: {
            sender: note.sender,
            recipient: note.recipient,
            tokenId: note.tokenId,
            tokenName: note.tokenName,
            amount: note.amount,
            transactionId: note.txId,
          },
        });


        // If this transaction is tied to a request payment, settle it on claim
        if (note.requestPaymentId) {
          try {
            const consumedTxId = notes.find((n) => n.requestPaymentId === note.requestPaymentId)?.txId;
            await this.requestPaymentService.settleOnClaim(
              note.requestPaymentId,
              caller,
              consumedTxId,
            );
          } catch (e) {
            this.logger.warn(
              `Failed to settle linked request payment ${note.requestPaymentId}: ${e?.message}`,
            );
          }
        }
      }

      return { affected: affected || 0 };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async recallBatch(dto: RecallRequestDto, sender: string) {
    try {
      if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
        throw new BadRequestException(
          'Items array is required and cannot be empty',
        );
      }

      const results = [];
      for (const item of dto.items) {
        if (item.type === 'transaction') {
          try {
            const affected = await this.recallTransactions(
              [item.id.toString()],
              sender,
              dto.txId,
            );
            results.push({
              type: 'transaction',
              id: item.id,
              success: !!affected.affected,
            });
          } catch (e) {
            results.push({
              type: 'transaction',
              id: item.id,
              success: false,
              error: e.message,
            });
          }
        } else if (item.type === 'gift') {
          try {
            await this.giftService.recallGift(item.id, dto.txId);
            results.push({ type: 'gift', id: item.id, success: true });
          } catch (e) {
            results.push({
              type: 'gift',
              id: item.id,
              success: false,
              error: e.message,
            });
          }
        }
      }
      return { results };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** UTILS METHODS ******************
  // *************************************************

  private async validateTransaction(
    dto: SendTransactionDto,
    sender: string,
  ): Promise<Partial<TransactionEntity> | null> {
    try {
      // Validate addresses
      validateAddress(sender, 'sender');
      validateAddress(dto.recipient, 'recipient');

      // Normalize addresses
      const normalizedSender = normalizeAddress(sender);
      const normalizedRecipient = normalizeAddress(dto.recipient);

      // Check if sender and recipient are different
      // validateDifferentAddresses(
      //   normalizedSender,
      //   normalizedRecipient,
      //   'sender',
      //   'recipient',
      // );

      // We don't store public transactions that are not recallable
      if (!dto.private && !dto.recallable) {
        return null;
      }

      // Validate recallable time if recallable flag is true
      if (dto.recallable && dto.recallableTime) {
        validateFutureDate(dto.recallableTime, 'recallableTime');
      }

      // Validate assets
      if (!dto.assets || dto.assets.length < 1) {
        throw new BadRequestException(ErrorTransaction.InvalidAssetsLength);
      }

      // Validate each asset
      for (const asset of dto.assets) {
        if (!asset.faucetId || !asset.amount) {
          throw new BadRequestException(ErrorTransaction.InvalidAssets);
        }

        validateAddress(asset.faucetId, 'asset.faucetId');
        validateAmount(asset.amount, 'asset.amount');
      }

      // Validate serial number
      validateSerialNumber(dto.serialNumber, 'serialNumber');

      // Normalize asset faucetIds
      const normalizedAssets = dto.assets.map((asset) => ({
        faucetId: normalizeAddress(asset.faucetId),
        amount: asset.amount,
        metadata: asset.metadata,
      }));

      return {
        sender: normalizedSender,
        recipient: normalizedRecipient,
        assets: normalizedAssets,
        private: dto.private,
        recallable: dto.recallable,
        recallableTime: dto.recallableTime
          ? new Date(dto.recallableTime)
          : null,
        recallableHeight: dto.recallableHeight,
        serialNumber: dto.serialNumber,
        noteType: dto.noteType,
        noteId: dto.noteId,
        requestPaymentId: dto.requestPaymentId ?? null,
        status: NoteStatus.PENDING,
      };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  private parseAndValidateTransactionIds(noteIds: string[]): string[] {
    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      throw new BadRequestException(
        'Transaction IDs array is required and cannot be empty',
      );
    }

    return noteIds;
  }
}
