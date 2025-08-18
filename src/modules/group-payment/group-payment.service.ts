import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { CreateGroupDto, CreateGroupPaymentDto, CreateDefaultGroupDto, CreateQuickSharePaymentDto } from './group-payment.dto';
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
import { PrismaService } from '../../common/prisma/prisma.service';
import { group_payment_member_status_status_enum } from '@prisma/client';

@Injectable()
export class GroupPaymentService {
  private readonly logger = new Logger(GroupPaymentService.name);

  constructor(
    @Inject(forwardRef(() => RequestPaymentService))
    private readonly requestPaymentService: RequestPaymentService,
    private readonly prisma: PrismaService,
  ) {}

  async createGroup(dto: CreateGroupDto, ownerAddress: string) {
    try {
      // Validate all inputs
      validateAddress(ownerAddress, 'ownerAddress');
      validateName(dto.name, 'name');
      validateNonEmptyArray(dto.members, 'members');

      // Validate each member address
      dto.members.forEach((member, index) => {
        validateAddress(member.address, `members[${index}].address`);
      });

      // Check for duplicate members by address
      validateUniqueArray(dto.members.map((m) => m.address), 'members');

      // Normalize addresses
      const normalizedOwnerAddress = normalizeAddress(ownerAddress);
      const normalizedMembers = dto.members.map((member) => ({
        address: normalizeAddress(member.address),
        name: sanitizeString(member.name),
      }));

      // Check if owner is in members list
      if (normalizedMembers.some((m) => m.address === normalizedOwnerAddress)) {
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
      const existingGroup = await this.prisma.groupPaymentGroup.findMany({
        where: {
          name: sanitizedName,
          ownerAddress: normalizedOwnerAddress,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingGroup.length > 0) {
        throw new BadRequestException(ErrorGroupPayment.GroupNameAlreadyExists);
      }

      // Create group with normalized data
      const now = new Date();
      return this.prisma.groupPaymentGroup.create({
        data: {
          name: sanitizedName,
          ownerAddress: normalizedOwnerAddress,
          members: normalizedMembers as any,
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async updateGroup(groupId: number, dto: CreateGroupDto, ownerAddress: string) {
    try {
      if (!groupId || groupId <= 0) {
        throw new BadRequestException('groupId must be a positive number');
      }

      validateAddress(ownerAddress, 'ownerAddress');
      validateName(dto.name, 'name');
      validateNonEmptyArray(dto.members, 'members');

      // validate members, duplicates
      dto.members.forEach((member, index) => validateAddress(member.address, `members[${index}].address`));
      validateUniqueArray(dto.members.map((m) => m.address), 'members');

      const normalizedOwnerAddress = normalizeAddress(ownerAddress);
      const normalizedMembers = dto.members.map((m) => ({
        address: normalizeAddress(m.address),
        name: sanitizeString(m.name),
      }));
      const sanitizedName = sanitizeString(dto.name);

      if (normalizedMembers.some((m) => m.address === normalizedOwnerAddress)) {
        throw new BadRequestException(ErrorGroupPayment.OwnerInMembersList);
      }

      if (normalizedMembers.length < 1) {
        throw new BadRequestException(ErrorGroupPayment.EmptyMembersList);
      }

      if (normalizedMembers.length > 50) {
        throw new BadRequestException(ErrorGroupPayment.TooManyMembers);
      }

      // ensure group exists and owned by caller
      const existing = await this.prisma.groupPaymentGroup.findFirst({ 
        where: { id: groupId } 
      });
      if (!existing) {
        throw new BadRequestException(ErrorGroupPayment.GroupNotFound);
      }
      if (normalizeAddress(existing.ownerAddress) !== normalizedOwnerAddress) {
        throw new BadRequestException(ErrorGroupPayment.NotOwner);
      }

      // check name uniqueness among owner's groups (excluding this group)
      const sameName = await this.prisma.groupPaymentGroup.findMany({
        where: {
          ownerAddress: normalizedOwnerAddress,
          name: sanitizedName,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (sameName.some((g) => g.id !== groupId)) {
        throw new BadRequestException(ErrorGroupPayment.GroupNameAlreadyExists);
      }

      const updated = await this.prisma.groupPaymentGroup.update({
        where: { id: groupId },
        data: {
          name: sanitizedName,
          members: normalizedMembers as any,
          updatedAt: new Date(),
        },
      });

      return updated;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async deleteGroup(groupId: number, ownerAddress: string) {
    try {
      if (!groupId || groupId <= 0) {
        throw new BadRequestException('groupId must be a positive number');
      }
      validateAddress(ownerAddress, 'ownerAddress');
      const normalizedOwnerAddress = normalizeAddress(ownerAddress);

      const existing = await this.prisma.groupPaymentGroup.findFirst({ 
        where: { id: groupId } 
      });
      if (!existing) {
        throw new BadRequestException(ErrorGroupPayment.GroupNotFound);
      }
      if (normalizeAddress(existing.ownerAddress) !== normalizedOwnerAddress) {
        throw new BadRequestException(ErrorGroupPayment.NotOwner);
      }

      await this.prisma.groupPaymentGroup.delete({
        where: { id: groupId },
      });
      return { success: true };
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
      const normalizedMembers = (dto.members || []).map((member) => ({
        address: normalizeAddress(member.address),
        name: sanitizeString(member.name),
      }));

      // Validate each member address if provided
      normalizedMembers.forEach((member, index) => {
        validateAddress(member.address, `members[${index}].address`);
      });

      // Check for duplicate members (only if members exist)
      if (normalizedMembers.length > 0) {
        validateUniqueArray(normalizedMembers.map((m) => m.address), 'members');
      }

      // Check if owner is in members list (only if members exist)
      if (normalizedMembers.length > 0 && normalizedMembers.some((m) => m.address === normalizedOwnerAddress)) {
        throw new BadRequestException(ErrorGroupPayment.OwnerInMembersList);
      }

      // Check maximum members
      if (normalizedMembers.length > 50) {
        throw new BadRequestException(ErrorGroupPayment.TooManyMembers);
      }

      // Sanitize name
      const sanitizedName = sanitizeString(dto.name);

      // Check if group name already exists for this owner
      const existingGroup = await this.prisma.groupPaymentGroup.findMany({
        where: {
          name: sanitizedName,
          ownerAddress: normalizedOwnerAddress,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingGroup.length > 0) {
        throw new BadRequestException(ErrorGroupPayment.GroupNameAlreadyExists);
      }

      // Create group with normalized data
      const now = new Date();
      return this.prisma.groupPaymentGroup.create({
        data: {
          name: sanitizedName,
          ownerAddress: normalizedOwnerAddress,
          members: normalizedMembers as any,
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async createGroupPayment(dto: CreateGroupPaymentDto, ownerAddress: string) {
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
      const group = await this.prisma.groupPaymentGroup.findFirst({
        where: { id: dto.groupId },
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

      const members = group.members as unknown as { address: string; name: string }[];

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
      let existingPayment = await this.prisma.groupPayment.findFirst({
        where: { linkCode },
      });
      while (existingPayment) {
        linkCode = nanoid(16);
        existingPayment = await this.prisma.groupPayment.findFirst({
          where: { linkCode },
        });
      }

      // Create payment
      const now = new Date();
      const tokens = dto.tokens.map((token) => ({
        ...token,
      }));
      const payment = await this.prisma.groupPayment.create({
        data: {
          groupId: group.id,
          ownerAddress: normalizedOwnerAddress,
          tokens: tokens,
          amount: dto.amount,
          perMember: perMember,
          linkCode,
          status: GroupPaymentStatus.PENDING,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Create member statuses
      await this.createMemberStatuses(
        payment.id,
        members.map((m) => ({ address: m.address, name: m.name }))
      );

      // Create pending request payments for each member
      await this.requestPaymentService.createGroupPaymentRequests(
        payment.id,
        normalizedOwnerAddress,
        members.map((m) => m.address),
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

      return this.prisma.groupPaymentGroup.findMany({
        where: { ownerAddress: normalizedOwnerAddress },
        orderBy: { createdAt: 'desc' },
      });
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

      const payments = await this.prisma.groupPayment.findMany({
        where: { groupId },
        include: { groupPaymentGroup: true },
        orderBy: { createdAt: 'desc' },
      });

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
          const memberStatuses = await this.findMemberStatusesByPayment(payment.id);
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

      const payment = await this.prisma.groupPayment.findFirst({
        where: { linkCode },
        include: { groupPaymentGroup: true },
      });

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
      const memberStatuses = await this.findMemberStatusesByPayment(payment.id);

      // Calculate per-member amount
      const total = parseFloat(payment.amount);
      const memberCount = payment.groupPaymentGroup ? Object.keys(payment.groupPaymentGroup.members).length : 1;
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

  // Quick Share specific methods - separate logic from regular group payments
  async createQuickSharePayment(dto: CreateQuickSharePaymentDto, ownerAddress: string) {
    try {
      // Validate all inputs
      validateAddress(ownerAddress, 'ownerAddress');
      validateAmount(dto.amount, 'amount');

      // Normalize addresses
      const normalizedOwnerAddress = normalizeAddress(ownerAddress);

      // Find or create the user's Quick Share group
      let group = await this.prisma.groupPaymentGroup.findFirst({
        where: {
          ownerAddress: normalizedOwnerAddress,
          name: 'Quick Share',
        },
      });

      // If user doesn't have a Quick Share group, create one
      if (!group) {
        const now = new Date();
        group = await this.prisma.groupPaymentGroup.create({
          data: {
            name: 'Quick Share',
            ownerAddress: normalizedOwnerAddress,
            members: [], // Start with empty members
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      // Validate memberCount
      if (dto.memberCount <= 0 || dto.memberCount > 50) {
        throw new BadRequestException('memberCount must be between 1 and 50');
      }

      // For Quick Share, we create placeholder members based on expected count
      const total = parseFloat(dto.amount);
      if (total <= 0) {
        throw new BadRequestException('Total amount must be greater than 0');
      }

      // Calculate perMember based on expected member count
      const perMember = parseFloat((total / dto.memberCount).toFixed(6));

      // Create placeholder members (represented as "-" for each expected slot)
      const placeholderMembers = Array(dto.memberCount).fill({ address: '-', name: '-' });

      // Update the group with placeholder members
      await this.updateGroupMembers(group.id, placeholderMembers);

      // Generate unique link code
      const { nanoid } = await import('nanoid');
      let linkCode = nanoid(16);

      // Ensure link code is unique
      let existingPayment = await this.prisma.groupPayment.findFirst({
        where: { linkCode },
      });
      while (existingPayment) {
        linkCode = nanoid(16);
        existingPayment = await this.prisma.groupPayment.findFirst({
          where: { linkCode },
        });
      }

      // Create payment with placeholder members for Quick Share
      const now = new Date();
      const tokens = dto.tokens.map((token) => ({
        ...token,
      }));
      const payment = await this.prisma.groupPayment.create({
        data: {
          groupId: group.id,
          ownerAddress: normalizedOwnerAddress,
          tokens: tokens,
          amount: dto.amount,
          perMember: perMember,
          linkCode,
          status: GroupPaymentStatus.PENDING,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Create member statuses for all placeholder slots (all PENDING initially)
      await this.createMemberStatuses(payment.id, placeholderMembers);

      // Return the code and member info for Quick Share
      return { 
        code: linkCode,
        memberCount: dto.memberCount,
        perMember: perMember,
        members: placeholderMembers 
      };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async addMemberToQuickShare(code: string, userAddress: string, requestorAddress: string) {
    try {
      // Validate inputs
      if (!code || typeof code !== 'string') {
        throw new BadRequestException('code is required and must be a string');
      }

      validateAddress(userAddress, 'userAddress');
      validateAddress(requestorAddress, 'requestorAddress');

      const normalizedUserAddress = normalizeAddress(userAddress);
      const normalizedRequestorAddress = normalizeAddress(requestorAddress);

      // Find the payment by code
      const payment = await this.prisma.groupPayment.findFirst({
        where: { linkCode: code },
        include: { groupPaymentGroup: true },
      });

      if (!payment) {
        throw new BadRequestException('Quick Share payment not found');
      }

      // Verify this is a Quick Share group
      if (!this.isQuickShareGroup(payment.groupPaymentGroup.name)) {
        throw new BadRequestException(
          'This endpoint is only for Quick Share payments',
        );
      }

      // Check if payment is still pending
      if (payment.status !== GroupPaymentStatus.PENDING) {
        throw new BadRequestException(
          'Cannot add members to a completed or expired payment',
        );
      }

      // Check if user is already a member (not a placeholder)
      const currentMembers = (payment.groupPaymentGroup.members || []) as unknown as { address: string; name: string }[];
      if (currentMembers.some((m) => m.address === normalizedUserAddress)) {
        throw new BadRequestException('User is already a member of this Quick Share');
      }

      // Check if user is the owner
      if (normalizedUserAddress === normalizeAddress(payment.ownerAddress)) {
        throw new BadRequestException('Owner cannot be added as a member');
      }

      // Find the first available placeholder slot ("-")
      const placeholderIndex = currentMembers.findIndex(member => member.address === '-');
      if (placeholderIndex === -1) {
        throw new BadRequestException('No available slots in this Quick Share payment');
      }

      // Replace the placeholder with the actual user address
      const updatedMembers = [...currentMembers];
      updatedMembers[placeholderIndex] = { address: normalizedUserAddress, name: '-' };
      
      // Update the group with new members
      await this.updateGroupMembers(payment.groupId, updatedMembers);

      // perMember amount stays the same since we're just filling a pre-allocated slot
      const perMember = payment.perMember;

      // Update the specific member status to PAID for this user (replacing the placeholder status)
      await this.updateMemberStatusByIndex(payment.id, placeholderIndex, normalizedUserAddress);

      // No payment request needed - user already paid!

      const filledSlots = updatedMembers.filter(member => member.address !== '-').length;
      const totalSlots = updatedMembers.length;

      return {
        success: true,
        message: 'Member added to Quick Share successfully',
        memberCount: totalSlots,
        filledSlots: filledSlots,
        perMember: perMember,
        members: updatedMembers,
      };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  //*******************************************************/
  //****************** UTILITY METHODS ********************/
  //*******************************************************/

  private isQuickShareGroup(groupName: string): boolean {
    // Check if the group name indicates it's a Quick Share group
    const quickShareNames = ['quick share', 'quickshare', 'quick-share'];
    return quickShareNames.includes(groupName.toLowerCase());
  }

  // Helper methods that were in the repository
  private async createMemberStatuses(
    groupPaymentId: number,
    members: { address: string; name: string }[] | string[],
  ) {
    const now = new Date();
    const memberStatusEntities = members.map((member) => {
      const address = typeof member === 'string' ? member : member.address;
      return {
        groupPaymentId,
        memberAddress: address,
        status: group_payment_member_status_status_enum.pending,
        createdAt: now,
        updatedAt: now,
      };
    });

    return await this.prisma.groupPaymentMemberStatus.createMany({
      data: memberStatusEntities,
    });
  }

  private async findMemberStatusesByPayment(
    groupPaymentId: number,
  ) {
    // First get the group payment to access the group
    const groupPayment = await this.prisma.groupPayment.findUnique({
      where: { id: groupPaymentId },
      include: { groupPaymentGroup: true }
    });

    if (!groupPayment?.groupPaymentGroup) {
      return [];
    }

    // Get member statuses
    const memberStatuses = await this.prisma.groupPaymentMemberStatus.findMany({
      where: { groupPaymentId },
      orderBy: { createdAt: 'desc' },
    });

    // Extract member names from the JSON members field
    const members = groupPayment.groupPaymentGroup.members as Array<{ name: string; address: string }>;
    
    // Map statuses with names
    return memberStatuses.map(status => {
      const member = members.find(m => m.address === status.memberAddress);
      return {
        ...status,
        memberName: member?.name || '-'
      };
    });
  }

  private async updateGroupMembers(
    groupId: number,
    members: { address: string; name: string }[],
  ) {
    await this.prisma.groupPaymentGroup.update({
      where: { id: groupId },
      data: { 
        members: members as any,
        updatedAt: new Date(),
      },
    });
  }

  private async updateMemberStatusByIndex(
    groupPaymentId: number,
    memberIndex: number,
    newMemberAddress: string,
  ) {
    // Get all member statuses for this payment, ordered by creation time
    const memberStatuses = await this.prisma.groupPaymentMemberStatus.findMany({
      where: { groupPaymentId },
      orderBy: { createdAt: 'asc' },
    });

    // Find the status at the specific index
    if (memberIndex < 0 || memberIndex >= memberStatuses.length) {
      throw new Error('Invalid member index');
    }

    const targetStatus = memberStatuses[memberIndex];

    // Update the member status with new address and mark as PAID
    await this.prisma.groupPaymentMemberStatus.update({
      where: { id: targetStatus.id },
      data: {
        memberAddress: newMemberAddress,
        status: GroupPaymentMemberStatus.PAID,
        paidAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
