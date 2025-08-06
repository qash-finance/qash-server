import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { GroupPaymentRepository } from './group-payment.repository';
import { CreateGroupDto, CreateGroupPaymentDto, CreateDefaultGroupDto } from './group-payment.dto';
import { GroupPaymentStatus } from './group-payment.entity';
import { RequestPaymentService } from '../request-payment/request-payment.service';
import { GroupPaymentMemberStatus } from './group-payment.entity';
import { handleError } from '../../common/utils/errors';
import {
  validateAddress,
  validateAmount,
  validateName,
  validateUniqueArray,
  validateNonEmptyArray,
  normalizeAddress,
  sanitizeString,
} from '../../common/utils/validation.util';
import { ErrorGroupPayment } from '../../common/constants/errors';

@Injectable()
export class GroupPaymentService {
  private readonly logger = new Logger(GroupPaymentService.name);

  constructor(
    private readonly groupPaymentRepository: GroupPaymentRepository,
    @Inject(forwardRef(() => RequestPaymentService))
    private readonly requestPaymentService: RequestPaymentService,
  ) {}

  async createGroup(dto: CreateGroupDto, ownerAddress: string) {
    try {
      // Validate all inputs
      validateAddress(ownerAddress, 'ownerAddress');
      validateName(dto.name, 'name');
      validateNonEmptyArray(dto.members, 'members');

      // Validate each member address
      dto.members.forEach((member, index) => {
        validateAddress(member, `members[${index}]`);
      });

      // Check for duplicate members
      validateUniqueArray(dto.members, 'members');

      // Normalize addresses
      const normalizedOwnerAddress = normalizeAddress(ownerAddress);
      const normalizedMembers = dto.members.map((member) =>
        normalizeAddress(member),
      );

      // Check if owner is in members list
      if (normalizedMembers.includes(normalizedOwnerAddress)) {
        throw new BadRequestException(ErrorGroupPayment.OwnerInMembersList);
      }

      // Check minimum and maximum members
      if (normalizedMembers.length < 1) {
        throw new BadRequestException(ErrorGroupPayment.EmptyMembersList);
      }

      if (normalizedMembers.length > 50) {
        throw new BadRequestException(ErrorGroupPayment.TooManyMembers);
      }

      // Sanitize name
      const sanitizedName = sanitizeString(dto.name);

      // Check if group name already exists for this owner
      const existingGroup = await this.groupPaymentRepository.findGroup({
        name: sanitizedName,
        ownerAddress: normalizedOwnerAddress,
      });

      if (existingGroup.length > 0) {
        throw new BadRequestException(ErrorGroupPayment.GroupNameAlreadyExists);
      }

      // Create group with normalized data
      const createDto = {
        name: sanitizedName,
        ownerAddress: normalizedOwnerAddress,
        members: normalizedMembers,
      };

      return this.groupPaymentRepository.createGroup(createDto);
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async createDefaultGroup(dto: CreateDefaultGroupDto, ownerAddress: string) {
    try {
      // Validate all inputs
      validateAddress(ownerAddress, 'ownerAddress');
      validateName(dto.name, 'name');

      // Normalize addresses
      const normalizedOwnerAddress = normalizeAddress(ownerAddress);
      const normalizedMembers = (dto.members || []).map((member) =>
        normalizeAddress(member),
      );

      // Validate each member address if provided
      normalizedMembers.forEach((member, index) => {
        validateAddress(member, `members[${index}]`);
      });

      // Check for duplicate members (only if members exist)
      if (normalizedMembers.length > 0) {
        validateUniqueArray(normalizedMembers, 'members');
      }

      // Check if owner is in members list (only if members exist)
      if (normalizedMembers.length > 0 && normalizedMembers.includes(normalizedOwnerAddress)) {
        throw new BadRequestException(ErrorGroupPayment.OwnerInMembersList);
      }

      // Check maximum members
      if (normalizedMembers.length > 50) {
        throw new BadRequestException(ErrorGroupPayment.TooManyMembers);
      }

      // Sanitize name
      const sanitizedName = sanitizeString(dto.name);

      // Check if group name already exists for this owner
      const existingGroup = await this.groupPaymentRepository.findGroup({
        name: sanitizedName,
        ownerAddress: normalizedOwnerAddress,
      });

      if (existingGroup.length > 0) {
        throw new BadRequestException(ErrorGroupPayment.GroupNameAlreadyExists);
      }

      // Create group with normalized data
      const createDto = {
        name: sanitizedName,
        ownerAddress: normalizedOwnerAddress,
        members: normalizedMembers,
      };

      return this.groupPaymentRepository.createGroup(createDto);
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async createGroupPayment(dto: CreateGroupPaymentDto, ownerAddress: string) {
    console.log("🚀 ~ GroupPaymentService ~ createGroupPayment ~ ownerAddress:", ownerAddress)
    console.log("🚀 ~ GroupPaymentService ~ createGroupPayment ~ dto:", dto)
    try {
      // Validate all inputs
      validateAddress(ownerAddress, 'ownerAddress');
      validateAmount(dto.amount, 'amount');

      if (dto.groupId <= 0) {
        throw new BadRequestException('groupId must be a positive number');
      }

      if (dto.perMember < 0) {
        throw new BadRequestException('perMember must be a positive number');
      }

      // Normalize addresses
      const normalizedOwnerAddress = normalizeAddress(ownerAddress);

      // Find the group
      const group = await this.groupPaymentRepository.findOneGroup({
        id: dto.groupId,
      });

      if (!group) {
        throw new BadRequestException(ErrorGroupPayment.GroupNotFound);
      }

      // Verify that the owner is actually the owner of the group
      if (normalizeAddress(group.ownerAddress) !== normalizedOwnerAddress) {
        throw new BadRequestException(
          'Only the group owner can create payments for this group',
        );
      }

      const members = group.members;

      // Validate that group has members
      if (!members || members.length === 0) {
        throw new BadRequestException(ErrorGroupPayment.EmptyMembersList);
      }

      // Validate minimum members for group payment
      if (members.length < 1) {
        throw new BadRequestException(ErrorGroupPayment.InsufficientMembers);
      }

      // Calculate split amount
      const total = parseFloat(dto.amount);
      if (total <= 0) {
        throw new BadRequestException('Total amount must be greater than 0');
      }

      const perMember = parseFloat((total / members.length).toFixed(6));

      // Validate that the calculated perMember matches the provided one (with some tolerance)
      if (Math.abs(perMember - dto.perMember) > 0.01) {
        throw new BadRequestException(
          'Calculated perMember amount does not match provided perMember',
        );
      }

      // Generate unique link code
      const { nanoid } = await import('nanoid');
      let linkCode = nanoid(16);

      // Ensure link code is unique
      let existingPayment =
        await this.groupPaymentRepository.findPaymentByLinkCode(linkCode);
      while (existingPayment) {
        linkCode = nanoid(16);
        existingPayment =
          await this.groupPaymentRepository.findPaymentByLinkCode(linkCode);
      }

      // Create payment
      const payment = await this.groupPaymentRepository.createPayment({
        group,
        ownerAddress: normalizedOwnerAddress,
        tokens: dto.tokens,
        amount: dto.amount,
        perMember: perMember,
        linkCode,
        status: GroupPaymentStatus.PENDING,
      });

      // Create member statuses
      await this.groupPaymentRepository.createMemberStatus(payment.id, members);

      // Create pending request payments for each member
      await this.requestPaymentService.createGroupPaymentRequests(
        payment.id,
        normalizedOwnerAddress,
        members,
        perMember.toString(),
        dto.tokens,
        `Group payment request - ${perMember.toString()} ${dto.tokens[0].metadata.symbol} split among ${members.length} members`,
      );

      return { ...payment, link: `/group-payment/${linkCode}`, perMember };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async getAllGroups(ownerAddress: string) {
    try {
      validateAddress(ownerAddress, 'ownerAddress');
      const normalizedOwnerAddress = normalizeAddress(ownerAddress);

      return this.groupPaymentRepository.findGroupsByOwner(
        normalizedOwnerAddress,
      );
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async getGroupPayments(groupId: number, ownerAddress: string) {
    try {
      if (!groupId || groupId <= 0) {
        throw new BadRequestException('groupId must be a positive number');
      }

      validateAddress(ownerAddress, 'ownerAddress');
      const normalizedOwnerAddress = normalizeAddress(ownerAddress);

      const payments =
        await this.groupPaymentRepository.findPaymentsByGroup(groupId);

      // Check if the owner is the owner of the group
      if (
        payments.some(
          (payment) => payment.ownerAddress !== normalizedOwnerAddress,
        )
      ) {
        throw new BadRequestException(
          'Only the group owner can view payments for this group',
        );
      }

      // Get member statuses for each payment and categorize by createdAt
      const paymentsWithStatuses = await Promise.all(
        payments.map(async (payment) => {
          const memberStatuses =
            await this.groupPaymentRepository.findMemberStatusesByPayment(
              payment.id,
            );
          return {
            ...payment,
            memberStatuses,
            createdAt: payment.createdAt,
          };
        }),
      );

      // Group payments by date (YYYY-MM-DD format)
      const groupedByDate = paymentsWithStatuses.reduce(
        (acc, payment) => {
          const dateKey = payment.createdAt.toISOString().split('T')[0];
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(payment);
          return acc;
        },
        {} as Record<string, typeof paymentsWithStatuses>,
      );

      return groupedByDate;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async getPaymentByLink(linkCode: string) {
    try {
      if (!linkCode || typeof linkCode !== 'string') {
        throw new BadRequestException(
          'linkCode is required and must be a string',
        );
      }

      if (linkCode.length < 10 || linkCode.length > 20) {
        throw new BadRequestException(ErrorGroupPayment.InvalidLinkCode);
      }

      const payment =
        await this.groupPaymentRepository.findPaymentByLinkCode(linkCode);

      if (!payment) {
        throw new BadRequestException(ErrorGroupPayment.PaymentNotFound);
      }

      // Check if payment is expired (you can add expiration logic here if needed)
      // For now, we'll just check if it's completed
      if (payment.status === GroupPaymentStatus.COMPLETED) {
        throw new BadRequestException(
          ErrorGroupPayment.PaymentAlreadyCompleted,
        );
      }

      // Get member statuses for this payment
      const memberStatuses =
        await this.groupPaymentRepository.findMemberStatusesByPayment(
          payment.id,
        );

      // Calculate per-member amount
      const total = parseFloat(payment.amount);
      const memberCount = payment.group ? payment.group.members.length : 1;
      const perMember = (total / memberCount).toFixed(6);

      return {
        ...payment,
        memberStatuses,
        perMember,
        totalMembers: memberCount,
        paidMembers: memberStatuses.filter(
          (status) => status.status === GroupPaymentMemberStatus.PAID,
        ).length,
      };
    } catch (error) {
      handleError(error, this.logger);
    }
  }
}
