import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  GroupPayment,
  GroupPaymentGroup,
  GroupPaymentMemberStatus,
  Prisma,
  GroupPaymentStatusEnum,
  GroupPaymentMemberStatusEnum,
} from '@prisma/client';
import { BaseRepository } from '../../database/base.repository';

@Injectable()
export class GroupPaymentRepository extends BaseRepository<
  GroupPayment,
  Prisma.GroupPaymentWhereInput,
  Prisma.GroupPaymentCreateInput,
  Prisma.GroupPaymentUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel() {
    return this.prisma.groupPayment;
  }

  /**
   * Create group payment with member statuses
   */
  async createWithMembers(
    data: Omit<Prisma.GroupPaymentCreateInput, 'groupPaymentMemberStatus'>,
    memberAddresses: string[],
  ): Promise<GroupPayment> {
    const now = new Date();
    return this.getModel().create({
      data: {
        ...data,
        createdAt: now,
        updatedAt: now,
        groupPaymentMemberStatus: {
          create: memberAddresses.map((address) => ({
            memberAddress: address,
            status: GroupPaymentMemberStatusEnum.PENDING,
            createdAt: now,
            updatedAt: now,
          })),
        },
      },
      include: {
        groupPaymentMemberStatus: true,
        groupPaymentGroup: true,
      },
    });
  }

  /**
   * Find group payments by owner
   */
  async findByOwner(ownerAddress: string): Promise<GroupPayment[]> {
    return this.findMany(
      { ownerAddress },
      {
        orderBy: { createdAt: 'desc' },
        include: {
          groupPaymentMemberStatus: true,
          groupPaymentGroup: true,
        },
      },
    );
  }

  /**
   * Find group payment by link code
   */
  async findByLinkCode(linkCode: string): Promise<GroupPayment | null> {
    return this.getModel().findUnique({
      where: { linkCode },
      include: {
        groupPaymentMemberStatus: true,
        groupPaymentGroup: true,
      },
    });
  }

  /**
   * Find group payments by member address
   */
  async findByMember(memberAddress: string): Promise<GroupPayment[]> {
    return this.getModel().findMany({
      where: {
        groupPaymentMemberStatus: {
          some: {
            memberAddress,
          },
        },
      },
      include: {
        groupPaymentMemberStatus: true,
        groupPaymentGroup: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update group payment status
   */
  async updateStatus(
    id: number,
    status: GroupPaymentStatusEnum,
  ): Promise<GroupPayment> {
    return this.update({ id }, { status });
  }

  /**
   * Update member status in group payment
   */
  async updateMemberStatus(
    groupPaymentId: number,
    memberAddress: string,
    status: GroupPaymentMemberStatusEnum,
  ): Promise<GroupPaymentMemberStatus> {
    const now = new Date();
    const memberStatus = await this.prisma.groupPaymentMemberStatus.findFirst({
      where: {
        groupPaymentId,
        memberAddress,
      },
    });

    if (!memberStatus) {
      throw new Error('Member status not found');
    }

    return this.prisma.groupPaymentMemberStatus.update({
      where: {
        id: memberStatus.id,
      },
      data: {
        status,
        paidAt: status === GroupPaymentMemberStatusEnum.PAID ? now : null,
        updatedAt: now,
      },
    });
  }

  /**
   * Get group payment member status
   */
  async getMemberStatus(
    groupPaymentId: number,
    memberAddress: string,
  ): Promise<GroupPaymentMemberStatus | null> {
    return this.prisma.groupPaymentMemberStatus.findFirst({
      where: {
        groupPaymentId,
        memberAddress,
      },
    });
  }

  /**
   * Check if all members have paid
   */
  async checkAllMembersPaid(groupPaymentId: number): Promise<boolean> {
    const unpaidMembers = await this.prisma.groupPaymentMemberStatus.findMany({
      where: {
        groupPaymentId,
        status: GroupPaymentMemberStatusEnum.PENDING,
      },
    });
    return unpaidMembers.length === 0;
  }

  /**
   * Get group payment statistics for owner
   */
  async getOwnerStats(ownerAddress: string): Promise<{
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
  }> {
    const stats = await this.prisma.groupPayment.groupBy({
      by: ['status'],
      where: { ownerAddress },
      _count: { status: true },
    });

    const result = {
      total: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };

    stats.forEach((stat) => {
      result.total += stat._count.status;
      switch (stat.status) {
        case GroupPaymentStatusEnum.PENDING:
          result.pending = stat._count.status;
          break;
        case GroupPaymentStatusEnum.COMPLETED:
          result.completed = stat._count.status;
          break;
        case GroupPaymentStatusEnum.EXPIRED:
          result.cancelled = stat._count.status;
          break;
      }
    });

    return result;
  }
}

@Injectable()
export class GroupPaymentGroupRepository extends BaseRepository<
  GroupPaymentGroup,
  Prisma.GroupPaymentGroupWhereInput,
  Prisma.GroupPaymentGroupCreateInput,
  Prisma.GroupPaymentGroupUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel() {
    return this.prisma.groupPaymentGroup;
  }

  /**
   * Find groups by owner
   */
  async findByOwner(ownerAddress: string): Promise<GroupPaymentGroup[]> {
    return this.findMany(
      { ownerAddress },
      {
        orderBy: { createdAt: 'desc' },
        include: {
          groupPayment: {
            include: {
              groupPaymentMemberStatus: true,
            },
          },
        },
      },
    );
  }

  /**
   * Find group by name and owner
   */
  async findByNameAndOwner(
    name: string,
    ownerAddress: string,
  ): Promise<GroupPaymentGroup[]> {
    return this.findMany(
      {
        name,
        ownerAddress,
      },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  /**
   * Find group by ID and owner
   */
  async findByIdAndOwner(
    id: number,
    ownerAddress: string,
  ): Promise<GroupPaymentGroup | null> {
    return this.findOne({ id, ownerAddress });
  }

  /**
   * Delete group and related payments
   */
  async deleteGroupWithPayments(id: number): Promise<void> {
    // First delete related group payments and their member statuses
    await this.prisma.groupPaymentMemberStatus.deleteMany({
      where: {
        groupPayment: {
          groupId: id,
        },
      },
    });

    await this.prisma.groupPayment.deleteMany({
      where: { groupId: id },
    });

    // Then delete the group itself
    await this.delete({ id });
  }

  /**
   * Count groups by owner
   */
  async countByOwner(ownerAddress: string): Promise<number> {
    return this.count({ ownerAddress });
  }
}
