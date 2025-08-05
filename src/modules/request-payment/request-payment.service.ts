import {
  BadRequestException,
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { In } from 'typeorm';
import { RequestPaymentRepository } from './request-payment.repository';
import { CreateRequestPaymentDto } from './request-payment.dto';
import { RequestPaymentStatus } from './request-payment.entity';
import { handleError } from '../../common/utils/errors';
import { GroupPaymentRepository } from '../group-payment/group-payment.repository';
import {
  GroupPaymentMemberStatus,
  GroupPaymentStatus,
} from '../group-payment/group-payment.entity';
import {
  validateAddress,
  validateAmount,
  validateMessage,
  validateDifferentAddresses,
  normalizeAddress,
  sanitizeString,
} from '../../common/utils/validation.util';
import { ErrorRequestPayment } from '../../common/constants/errors';
import { FaucetMetadata } from '../transactions/transaction.dto';
import { NotificationType } from 'src/common/enums/notification';
import { NotificationService } from '../notification/notification.service';
import { AddressBookService } from '../address-book/address-book.service';

@Injectable()
export class RequestPaymentService {
  private readonly logger = new Logger(RequestPaymentService.name);
  constructor(
    private readonly requestPaymentRepository: RequestPaymentRepository,
    @Inject(forwardRef(() => GroupPaymentRepository))
    private readonly groupPaymentRepository: GroupPaymentRepository,
    private readonly notificationService: NotificationService,
    private readonly addressBookService: AddressBookService,
  ) {}

  // *************************************************
  // **************** CREATE METHODS ****************
  // *************************************************


  async createGroupPaymentRequests(
    groupPaymentId: number,
    ownerAddress: string,
    members: string[],
    amount: string,
    tokens: {
      faucetId: string;
      amount: string;
      metadata: FaucetMetadata;
    }[],
    message: string,
  ) {
    try {
      // Validate inputs
      if (!groupPaymentId || groupPaymentId <= 0) {
        throw new BadRequestException('Invalid groupPaymentId');
      }

      validateAddress(ownerAddress, 'ownerAddress');
      validateAmount(amount, 'amount');
      validateMessage(message, 'message');

      if (!members || !Array.isArray(members) || members.length === 0) {
        throw new BadRequestException(
          'Members array is required and cannot be empty',
        );
      }

      // Validate each member address
      members.forEach((member, index) => {
        validateAddress(member, `members[${index}]`);
      });

      // Normalize addresses
      const normalizedOwnerAddress = normalizeAddress(ownerAddress);
      const normalizedMembers = members.map((member) =>
        normalizeAddress(member),
      );
      const sanitizedMessage = sanitizeString(message);

      // Check for duplicate members
      const uniqueMembers = [...new Set(normalizedMembers)];
      if (uniqueMembers.length !== normalizedMembers.length) {
        throw new BadRequestException('Duplicate members are not allowed');
      }

      // Check if owner is in members list (shouldn't happen in group payments)
      if (normalizedMembers.includes(normalizedOwnerAddress)) {
        throw new BadRequestException(
          'Owner cannot be a member in their own group payment',
        );
      }

      const requests = normalizedMembers.map((member) => ({
        payer: member,
        payee: normalizedOwnerAddress,
        amount,
        tokens: tokens.map(token => ({ ...token })), // Convert to plain objects
        message: sanitizedMessage,
        isGroupPayment: true,
        groupPaymentId,
        status: RequestPaymentStatus.PENDING,
      }));

      return await this.requestPaymentRepository.createMany(requests);
    } catch (error) {
      this.logger.error('Error creating group payment requests:', error);
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** GET METHODS ******************
  // *************************************************

  async getRequests(userAddress: string) {
    try {
      validateAddress(userAddress, 'userAddress');
      const normalizedUserAddress = normalizeAddress(userAddress);

      const result = await this.requestPaymentRepository.find({
        payer: normalizedUserAddress,
        status: In([
          RequestPaymentStatus.PENDING,
          RequestPaymentStatus.ACCEPTED,
        ]),
      });

      // Separate into pending and accepted
      const pending = result.filter(
        (item) => item.status === RequestPaymentStatus.PENDING,
      );
      const accepted = result.filter(
        (item) => item.status === RequestPaymentStatus.ACCEPTED,
      );
      return { pending, accepted };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** POST METHODS ******************
  // *************************************************

  async createRequest(dto: CreateRequestPaymentDto) {
    try {
      // Validate all inputs
      validateAddress(dto.payer, 'payer');
      validateAddress(dto.payee, 'payee');
      validateAmount(dto.amount, 'amount');
      validateMessage(dto.message, 'message');

      // Normalize addresses
      const normalizedPayer = normalizeAddress(dto.payer);
      const normalizedPayee = normalizeAddress(dto.payee);

      // Check if payer and payee are different
      validateDifferentAddresses(
        normalizedPayer,
        normalizedPayee,
        'payer',
        'payee',
      );

      // Sanitize message
      const sanitizedMessage = sanitizeString(dto.message);


      // Check for duplicate request (same payer, payee, amount, and status pending)
      // Note: We can't easily compare JSONB tokens arrays in the query, so we'll check after creation
      const existingRequests = await this.requestPaymentRepository.find({
        payer: normalizedPayer,
        payee: normalizedPayee,
        amount: dto.amount,
        status: RequestPaymentStatus.PENDING,
      });

      // Check if any existing request has matching tokens
      const duplicateRequest = existingRequests.find(request => 
        JSON.stringify(request.tokens) === JSON.stringify(dto.tokens)
      );

      if (duplicateRequest) {
        throw new BadRequestException(ErrorRequestPayment.DuplicateRequest);
      }

      // Create request with normalized data
      const createDto = {
        payer: normalizedPayer,
        payee: normalizedPayee,
        amount: dto.amount,
        tokens: dto.tokens,
        message: sanitizedMessage,
      };

      // Find payee name from address book
      const payeeName = await this.findPayeeNameFromAddressBook(normalizedPayer, normalizedPayee);
      
      // Create notification message with payee name if available
      const notificationMessage = payeeName 
        ? `${payeeName} has requested you to transfer ${dto.amount} ${dto.tokens[0].metadata.symbol}`
        : `${dto.payee} has requested you to transfer ${dto.amount} ${dto.tokens[0].metadata.symbol}`;

      console.log("🚀 ~ RequestPaymentService ~ createRequest ~ dto.tokens[0].metadata.symbol:", dto.tokens)

      //create notification for payer
      await this.notificationService.createRequestPaymentNotification(normalizedPayer, {
        message: notificationMessage,
        amount: dto.amount,
        tokenName: dto.tokens[0].metadata.symbol,
        tokenId: dto.tokens[0].faucetId,
        payee: payeeName || normalizedPayee,
      });

      return this.requestPaymentRepository.create(createDto);
    } catch (error) {
      handleError(error, this.logger);
    }
  } 

  // *************************************************
  // **************** PUT METHODS ******************
  // *************************************************

  async acceptRequest(id: number, userAddress: string, txid: string) {
    try {
      if (!id || id <= 0) {
        throw new BadRequestException('Invalid request ID');
      }

      validateAddress(userAddress, 'userAddress');
      const normalizedUserAddress = normalizeAddress(userAddress);

      const req = await this.requestPaymentRepository.findOne({
        id,
        payer: normalizedUserAddress,
      });

      if (!req) {
        throw new BadRequestException(ErrorRequestPayment.NotFound);
      }

      if (req.status !== RequestPaymentStatus.PENDING) {
        throw new BadRequestException(ErrorRequestPayment.NotPending);
      }

      // Update the request payment status
      const updatedRequest = await this.requestPaymentRepository.updateStatus(
        id,
        RequestPaymentStatus.ACCEPTED,
      );

      // If this is a group payment request, update the group payment member status
      if (req.isGroupPayment && req.groupPaymentId) {
        await this.updateGroupPaymentMemberStatus(
          req.groupPaymentId,
          normalizedUserAddress,
        );
      }

      // Update the request payment txid
      updatedRequest.txid = txid;
      await updatedRequest.save();

      return updatedRequest;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  private async updateGroupPaymentMemberStatus(
    groupPaymentId: number,
    memberAddress: string,
  ) {
    try {
      // Find the member status record for this group payment and member
      const memberStatuses =
        await this.groupPaymentRepository.findMemberStatusesByPayment(
          groupPaymentId,
        );
      const memberStatus = memberStatuses.find(
        (status) =>
          normalizeAddress(status.memberAddress) ===
          normalizeAddress(memberAddress),
      );

      if (memberStatus) {
        // Update the member status to PAID
        memberStatus.status = GroupPaymentMemberStatus.PAID;
        memberStatus.paidAt = new Date();
        await memberStatus.save();

        // Check if all members have paid
        const allStatuses =
          await this.groupPaymentRepository.findMemberStatusesByPayment(
            groupPaymentId,
          );
        const allPaid = allStatuses.every(
          (status) => status.status === GroupPaymentMemberStatus.PAID,
        );

        if (allPaid) {
          // Update the group payment status to COMPLETED
          const groupPayment =
            await this.groupPaymentRepository.findPaymentById(groupPaymentId);
          if (groupPayment) {
            groupPayment.status = GroupPaymentStatus.COMPLETED;
            await groupPayment.save();
          }
        }
      }
    } catch (error) {
      this.logger.error('Error updating group payment member status:', error);
      // Don't throw here to avoid breaking the main request acceptance flow
    }
  }

  async denyRequest(id: number, userAddress: string) {
    try {
      if (!id || id <= 0) {
        throw new BadRequestException('Invalid request ID');
      }

      validateAddress(userAddress, 'userAddress');
      const normalizedUserAddress = normalizeAddress(userAddress);

      const req = await this.requestPaymentRepository.findOne({
        id,
        payer: normalizedUserAddress,
      });

      if (!req) {
        throw new BadRequestException(ErrorRequestPayment.NotFound);
      }

      if (req.status !== RequestPaymentStatus.PENDING) {
        throw new BadRequestException(ErrorRequestPayment.NotPending);
      }

      // Update the request payment status
      const updatedRequest = await this.requestPaymentRepository.updateStatus(
        id,
        RequestPaymentStatus.DENIED,
      );

      // If this is a group payment request, we might want to handle denial differently
      // For now, we'll just deny the individual request without affecting the group payment
      // The group payment will remain pending for other members

      return updatedRequest;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** HELPER METHODS ****************
  // *************************************************


  /**
   * Find the name of a payee from the payer's address book
   * @param payerAddress - The address of the payer
   * @param payeeAddress - The address of the payee
   * @returns The name of the payee from address book, or null if not found
   */
  private async findPayeeNameFromAddressBook(
    payerAddress: string,
    payeeAddress: string,
  ): Promise<string | null> {
    try {
      const addressBookEntries = await this.addressBookService.getAllAddressBookEntries(payerAddress);
      
      if (!addressBookEntries || addressBookEntries.length === 0) {
        return null;
      }
      
      // Flatten all address book entries from all categories
      const allEntries = addressBookEntries.flatMap(category => 
        category.addressBooks || []
      );
      
      // Find the entry that matches the payee address (case-insensitive)
      const payeeEntry = allEntries.find(entry => 
        entry.address.toLowerCase() === payeeAddress.toLowerCase()
      );
      
      return payeeEntry ? payeeEntry.name : null;
    } catch (error) {
      this.logger.warn(`Error finding payee name from address book: ${error.message}`);
      return null;
    }
  }
}
