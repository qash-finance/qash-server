import {
  BadRequestException,
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CreateRequestPaymentDto } from './request-payment.dto';
import { handleError } from '../../common/utils/errors';
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
import { NotificationService } from '../notification/notification.service';
import { AddressBookService } from '../address-book/address-book.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  GroupPaymentStatusEnum,
  GroupPaymentMemberStatusEnum,
  RequestPaymentStatusEnum,
} from '@prisma/client';

@Injectable()
export class RequestPaymentService {
  private readonly logger = new Logger(RequestPaymentService.name);
  constructor(
    private readonly notificationService: NotificationService,
    private readonly addressBookService: AddressBookService,
    private readonly prisma: PrismaService,
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

      const now = new Date();
      const requests = normalizedMembers.map((member) => ({
        payer: member,
        payee: normalizedOwnerAddress,
        amount,
        tokens: tokens.map((token) => ({ ...token })), // Convert to plain objects and cast to JSON
        message: sanitizedMessage,
        isGroupPayment: true,
        groupPaymentId,
        status: RequestPaymentStatusEnum.PENDING,
        createdAt: now,
        updatedAt: now,
      }));

      return await this.prisma.requestPayment.createMany({
        data: requests,
      });
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

      const result = await this.prisma.requestPayment.findMany({
        where: {
          payer: normalizedUserAddress,
          status: {
            in: [
              RequestPaymentStatusEnum.PENDING,
              RequestPaymentStatusEnum.ACCEPTED,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Separate into pending and accepted
      const pending = result.filter(
        (item) => item.status === RequestPaymentStatusEnum.PENDING,
      );
      const accepted = result.filter(
        (item) => item.status === RequestPaymentStatusEnum.ACCEPTED,
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
      const existingRequests = await this.prisma.requestPayment.findMany({
        where: {
          payer: normalizedPayer,
          payee: normalizedPayee,
          amount: dto.amount,
          status: RequestPaymentStatusEnum.PENDING,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Check if any existing request has matching tokens
      const duplicateRequest = existingRequests.find(
        (request) =>
          JSON.stringify(request.tokens) === JSON.stringify(dto.tokens),
      );

      if (duplicateRequest) {
        throw new BadRequestException(ErrorRequestPayment.DuplicateRequest);
      }

      // Find payee name from address book
      const payeeName = await this.findPayeeNameFromAddressBook(
        normalizedPayer,
        normalizedPayee,
      );

      // Create notification message with payee name if available
      const notificationMessage = payeeName
        ? `${payeeName} has requested you to transfer ${dto.amount} ${dto.tokens[0].metadata.symbol}`
        : `${dto.payee} has requested you to transfer ${dto.amount} ${dto.tokens[0].metadata.symbol}`;

      console.log(
        '🚀 ~ RequestPaymentService ~ createRequest ~ dto.tokens[0].metadata.symbol:',
        dto.tokens,
      );

      //create notification for payer
      await this.notificationService.createRequestPaymentNotification(
        normalizedPayer,
        {
          message: notificationMessage,
          amount: dto.amount,
          tokenName: dto.tokens[0].metadata.symbol,
          tokenId: dto.tokens[0].faucetId,
          payee: payeeName || normalizedPayee,
        },
      );

      const now = new Date();
      const tokens = dto.tokens.map((token) => ({
        ...token,
      }));
      return this.prisma.requestPayment.create({
        data: {
          payer: normalizedPayer,
          payee: normalizedPayee,
          amount: dto.amount,
          tokens: tokens,
          message: sanitizedMessage,
          createdAt: now,
          updatedAt: now,
        },
      });
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

      const req = await this.prisma.requestPayment.findFirst({
        where: {
          id,
          payer: normalizedUserAddress,
        },
      });

      if (!req) {
        throw new BadRequestException(ErrorRequestPayment.NotFound);
      }

      if (req.status !== RequestPaymentStatusEnum.PENDING) {
        throw new BadRequestException(ErrorRequestPayment.NotPending);
      }

      // Update the request payment status
      const updatedRequest = await this.prisma.requestPayment.update({
        where: { id },
        data: {
          status: RequestPaymentStatusEnum.ACCEPTED,
          updatedAt: new Date(),
        },
      });

      // // If this is a group payment request, update the group payment member status
      // if (req.isGroupPayment && req.groupPaymentId) {
      //   await this.updateGroupPaymentMemberStatus(
      //     req.groupPaymentId,
      //     normalizedUserAddress,
      //   );
      // }

      // Update the request payment txid
      await this.prisma.requestPayment.update({
        where: { id },
        data: {
          txid,
          updatedAt: new Date(),
        },
      });

      return updatedRequest;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async confirmGroupPaymentRequest(id: number, userAddress: string) {
    try {
      if (!id || id <= 0) {
        throw new BadRequestException('Invalid request ID');
      }

      validateAddress(userAddress, 'userAddress');
      const normalizedUserAddress = normalizeAddress(userAddress);

      const req = await this.prisma.requestPayment.findFirst({
        where: {
          id,
          payee: normalizedUserAddress,
        },
      });

      if (!req.isGroupPayment) {
        throw new BadRequestException(ErrorRequestPayment.NotGroupPayment);
      }

      if (!req) {
        throw new BadRequestException(ErrorRequestPayment.NotFound);
      }

      if (req.status !== RequestPaymentStatusEnum.ACCEPTED) {
        throw new BadRequestException(ErrorRequestPayment.NotAccepted);
      }

      // If this is a group payment request, update the group payment member status
      if (req.isGroupPayment && req.groupPaymentId) {
        await this.updateGroupPaymentMemberStatus(
          req.groupPaymentId,
          req.payer,
        );
      }

      return req;
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
        await this.prisma.groupPaymentMemberStatus.findMany({
          where: {
            groupPaymentId,
            memberAddress: normalizeAddress(memberAddress),
          },
        });

      if (!memberStatuses || memberStatuses.length === 0) {
        throw new BadRequestException(ErrorRequestPayment.NotFound);
      }

      const memberStatus = memberStatuses.find(
        (status) =>
          normalizeAddress(status.memberAddress) ===
          normalizeAddress(memberAddress),
      );

      if (memberStatus) {
        // Update the member status to PAID
        await this.prisma.groupPaymentMemberStatus.update({
          where: { id: memberStatus.id },
          data: {
            status: GroupPaymentMemberStatusEnum.PAID,
            paidAt: new Date(),
          },
        });

        // Check if all members have paid
        const allStatuses = await this.prisma.groupPaymentMemberStatus.findMany(
          {
            where: {
              groupPaymentId,
            },
          },
        );
        const allPaid = allStatuses.every(
          (status) => status.status === GroupPaymentMemberStatusEnum.PAID,
        );

        if (allPaid) {
          // Update the group payment status to COMPLETED
          const groupPayment = await this.prisma.groupPayment.findUnique({
            where: { id: groupPaymentId },
          });

          if (groupPayment) {
            await this.prisma.groupPayment.update({
              where: { id: groupPaymentId },
              data: {
                status: GroupPaymentStatusEnum.COMPLETED,
              },
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error updating group payment member status:', error);
      // Don't throw here to avoid breaking the main request acceptance flow
    }
  }

  /**
   * Mark a request payment as paid when the receiver claims the transaction.
   * Also updates group payment member status and payment completion if applicable.
   */
  public async settleOnClaim(
    requestPaymentId: number,
    claimerAddress: string,
    txid?: string,
  ) {
    try {
      if (!requestPaymentId || requestPaymentId <= 0) {
        throw new BadRequestException('Invalid requestPaymentId');
      }

      validateAddress(claimerAddress, 'claimerAddress');
      const normalizedClaimer = normalizeAddress(claimerAddress);

      const req = await this.prisma.requestPayment.findFirst({
        where: { id: requestPaymentId },
      });
      if (!req) {
        throw new BadRequestException(ErrorRequestPayment.NotFound);
      }

      // Only transition to ACCEPTED here (paid), if still pending
      if (req.status === RequestPaymentStatusEnum.PENDING) {
        await this.prisma.requestPayment.update({
          where: { id: requestPaymentId },
          data: {
            status: RequestPaymentStatusEnum.ACCEPTED,
            updatedAt: new Date(),
          },
        });
      }

      // Attach txid if provided and not set
      if (txid && !req.txid) {
        await this.prisma.requestPayment.update({
          where: { id: requestPaymentId },
          data: {
            txid,
            updatedAt: new Date(),
          },
        });
      }

      // If group payment, mark member as PAID now (on claim)
      if (req.isGroupPayment && req.groupPaymentId) {
        await this.updateGroupPaymentMemberStatus(
          req.groupPaymentId,
          normalizedClaimer,
        );
      }
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async denyRequest(id: number, userAddress: string) {
    try {
      if (!id || id <= 0) {
        throw new BadRequestException('Invalid request ID');
      }

      validateAddress(userAddress, 'userAddress');
      const normalizedUserAddress = normalizeAddress(userAddress);

      const req = await this.prisma.requestPayment.findFirst({
        where: {
          id,
          payer: normalizedUserAddress,
        },
      });

      if (!req) {
        throw new BadRequestException(ErrorRequestPayment.NotFound);
      }

      if (req.status !== RequestPaymentStatusEnum.PENDING) {
        throw new BadRequestException(ErrorRequestPayment.NotPending);
      }

      // Update the request payment status
      const updatedRequest = await this.prisma.requestPayment.update({
        where: { id },
        data: {
          status: RequestPaymentStatusEnum.DENIED,
          updatedAt: new Date(),
        },
      });

      // If this is a group payment request, mark the member status as DENIED via Prisma
      if (req.isGroupPayment && req.groupPaymentId) {
        const memberStatus =
          await this.prisma.groupPaymentMemberStatus.findFirst({
            where: {
              groupPaymentId: req.groupPaymentId,
              memberAddress: normalizedUserAddress,
            },
          });

        if (memberStatus) {
          await this.prisma.groupPaymentMemberStatus.update({
            where: { id: memberStatus.id },
            data: {
              status: GroupPaymentMemberStatusEnum.DENIED,
              updatedAt: new Date(),
            },
          });
        }
      }

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
      const addressBookEntries =
        await this.addressBookService.getAllAddressBookEntries(payerAddress);
      const payeeEntry = addressBookEntries.find(
        (entry) => entry.address.toLowerCase() === payeeAddress.toLowerCase(),
      );
      return payeeEntry ? payeeEntry.name : null;
    } catch (error) {
      this.logger.warn(
        `Error finding payee name from address book: ${error.message}`,
      );
      return null;
    }
  }
}
