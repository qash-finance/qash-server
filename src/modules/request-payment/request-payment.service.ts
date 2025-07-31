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

@Injectable()
export class RequestPaymentService {
  private readonly logger = new Logger(RequestPaymentService.name);
  constructor(
    private readonly requestPaymentRepository: RequestPaymentRepository,
    @Inject(forwardRef(() => GroupPaymentRepository))
    private readonly groupPaymentRepository: GroupPaymentRepository,
  ) {}

  // *************************************************
  // **************** CREATE METHODS ****************
  // *************************************************

  async createGroupPaymentRequests(
    groupPaymentId: number,
    ownerAddress: string,
    members: string[],
    amount: string,
    token: string,
    message: string,
  ) {
    try {
      // Validate inputs
      if (!groupPaymentId || groupPaymentId <= 0) {
        throw new BadRequestException('Invalid groupPaymentId');
      }

      validateAddress(ownerAddress, 'ownerAddress');
      validateAmount(amount, 'amount');
      validateAddress(token, 'token');
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
      const normalizedToken = normalizeAddress(token);
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
        token: normalizedToken,
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
      validateAddress(dto.token, 'token');
      validateAmount(dto.amount, 'amount');
      validateMessage(dto.message, 'message');

      // Normalize addresses
      const normalizedPayer = normalizeAddress(dto.payer);
      const normalizedPayee = normalizeAddress(dto.payee);
      const normalizedToken = normalizeAddress(dto.token);

      // Check if payer and payee are different
      validateDifferentAddresses(
        normalizedPayer,
        normalizedPayee,
        'payer',
        'payee',
      );

      // Sanitize message
      const sanitizedMessage = sanitizeString(dto.message);

      // Check for duplicate request (same payer, payee, amount, token, and status pending)
      const existingRequest = await this.requestPaymentRepository.findOne({
        payer: normalizedPayer,
        payee: normalizedPayee,
        amount: dto.amount,
        token: normalizedToken,
        status: RequestPaymentStatus.PENDING,
      });

      if (existingRequest) {
        throw new BadRequestException(ErrorRequestPayment.DuplicateRequest);
      }

      // Create request with normalized data
      const createDto = {
        payer: normalizedPayer,
        payee: normalizedPayee,
        amount: dto.amount,
        token: normalizedToken,
        message: sanitizedMessage,
      };

      return this.requestPaymentRepository.create(createDto);
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** PUT METHODS ******************
  // *************************************************

  async acceptRequest(id: number, userAddress: string) {
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
}
