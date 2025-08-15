import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  GroupPaymentEntity,
  GroupPaymentGroupEntity,
  GroupPaymentMemberStatus,
  GroupPaymentMemberStatusEntity,
} from './group-payment.entity';

@Injectable()
export class GroupPaymentRepository {
  private readonly logger = new Logger(GroupPaymentRepository.name);

  constructor(
    @InjectRepository(GroupPaymentGroupEntity)
    private readonly groupRepository: Repository<GroupPaymentGroupEntity>,
    @InjectRepository(GroupPaymentEntity)
    private readonly paymentRepository: Repository<GroupPaymentEntity>,
    @InjectRepository(GroupPaymentMemberStatusEntity)
    private readonly memberStatusRepository: Repository<GroupPaymentMemberStatusEntity>,
  ) {}

  public async createGroup(
    dto: Partial<GroupPaymentGroupEntity>,
  ): Promise<GroupPaymentGroupEntity> {
    try {
      const entity = this.groupRepository.create(dto);
      return await entity.save();
    } catch (error) {
      this.logger.error('Error creating group:', error);
      throw error;
    }
  }

  public async updateGroup(
    groupId: number,
    update: Partial<GroupPaymentGroupEntity>,
  ): Promise<GroupPaymentGroupEntity> {
    try {
      await this.groupRepository.update(groupId, update);
      const updated = await this.groupRepository.findOne({
        where: { id: groupId },
      });
      return updated as GroupPaymentGroupEntity;
    } catch (error) {
      this.logger.error('Error updating group:', error);
      throw error;
    }
  }

  public async deleteGroup(groupId: number): Promise<void> {
    try {
      await this.groupRepository.delete(groupId);
    } catch (error) {
      this.logger.error('Error deleting group:', error);
      throw error;
    }
  }

  public async createPayment(
    dto: Partial<GroupPaymentEntity>,
  ): Promise<GroupPaymentEntity> {
    try {
      const entity = this.paymentRepository.create(dto);
      return await entity.save();
    } catch (error) {
      this.logger.error('Error creating payment:', error);
      throw error;
    }
  }

  public async createMemberStatus(
    groupPaymentId: number,
    members: { address: string; name: string }[] | string[],
  ): Promise<GroupPaymentMemberStatusEntity[]> {
    try {
      const memberStatusEntities = members.map((member) => {
        const address = typeof member === 'string' ? member : member.address;
        return this.memberStatusRepository.create({
          groupPayment: { id: groupPaymentId },
          memberAddress: address,
          status: GroupPaymentMemberStatus.PENDING,
        });
      });

      return await this.memberStatusRepository.save(memberStatusEntities);
    } catch (error) {
      this.logger.error('Error creating member statuses:', error);
      throw error;
    }
  }

  async findGroup(
    where: FindOptionsWhere<GroupPaymentGroupEntity>,
  ): Promise<GroupPaymentGroupEntity[]> {
    try {
      return await this.groupRepository.find({
        where,
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error finding groups:', error);
      throw error;
    }
  }

  async findOneGroup(
    where: FindOptionsWhere<GroupPaymentGroupEntity>,
  ): Promise<GroupPaymentGroupEntity | null> {
    try {
      return await this.groupRepository.findOne({ where });
    } catch (error) {
      this.logger.error('Error finding group:', error);
      throw error;
    }
  }

  async findGroupsByOwner(
    ownerAddress: string,
  ): Promise<GroupPaymentGroupEntity[]> {
    try {
      return await this.groupRepository.find({
        where: { ownerAddress },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error finding groups by owner:', error);
      throw error;
    }
  }

  async findPaymentsByGroup(groupId: number): Promise<GroupPaymentEntity[]> {
    try {
      return await this.paymentRepository.find({
        where: { group: { id: groupId } },
        relations: ['group'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error finding payments by group:', error);
      throw error;
    }
  }

  async findMemberStatusesByPayment(
    groupPaymentId: number,
  ): Promise<GroupPaymentMemberStatusEntity[]> {
    try {
      return await this.memberStatusRepository.find({
        where: { groupPayment: { id: groupPaymentId } },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error finding member statuses by payment:', error);
      throw error;
    }
  }

  async findPaymentById(id: number): Promise<GroupPaymentEntity | null> {
    try {
      return await this.paymentRepository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error('Error finding payment by ID:', error);
      throw error;
    }
  }

  async findPaymentByLinkCode(
    linkCode: string,
  ): Promise<GroupPaymentEntity | null> {
    try {
      return await this.paymentRepository.findOne({
        where: { linkCode },
        relations: ['group'],
      });
    } catch (error) {
      this.logger.error('Error finding payment by link code:', error);
      throw error;
    }
  }

  // Quick Share specific repository methods
  async updateGroupMembers(
    groupId: number,
    members: { address: string; name: string }[],
  ): Promise<void> {
    try {
      await this.groupRepository.update(groupId, { members });
    } catch (error) {
      this.logger.error('Error updating group members:', error);
      throw error;
    }
  }

  async updatePaymentPerMember(
    paymentId: number,
    perMember: number,
  ): Promise<void> {
    try {
      await this.paymentRepository.update(paymentId, { perMember });
    } catch (error) {
      this.logger.error('Error updating payment per member:', error);
      throw error;
    }
  }

  async updateMemberStatusToPaid(
    groupPaymentId: number,
    memberAddress: string,
  ): Promise<void> {
    try {
      await this.memberStatusRepository.update(
        {
          groupPayment: { id: groupPaymentId },
          memberAddress: memberAddress,
        },
        {
          status: GroupPaymentMemberStatus.PAID,
          paidAt: new Date(),
        },
      );
    } catch (error) {
      this.logger.error('Error updating member status to paid:', error);
      throw error;
    }
  }

  async updateMemberStatusByIndex(
    groupPaymentId: number,
    memberIndex: number,
    newMemberAddress: string,
  ): Promise<void> {
    try {
      // Get all member statuses for this payment, ordered by creation time
      const memberStatuses = await this.memberStatusRepository.find({
        where: { groupPayment: { id: groupPaymentId } },
        order: { createdAt: 'ASC' },
      });

      // Find the status at the specific index
      if (memberIndex < 0 || memberIndex >= memberStatuses.length) {
        throw new Error('Invalid member index');
      }

      const targetStatus = memberStatuses[memberIndex];

      // Update the member status with new address and mark as PAID
      await this.memberStatusRepository.update(
        { id: targetStatus.id },
        {
          memberAddress: newMemberAddress,
          status: GroupPaymentMemberStatus.PAID,
          paidAt: new Date(),
        },
      );
    } catch (error) {
      this.logger.error('Error updating member status by index:', error);
      throw error;
    }
  }

  async updateMemberStatusToDenied(
    groupPaymentId: number,
    memberAddress: string,
  ): Promise<void> {
    try {
      await this.memberStatusRepository.update(
        {
          groupPayment: { id: groupPaymentId },
          memberAddress: memberAddress,
        },
        {
          status: GroupPaymentMemberStatus.DENIED,
          paidAt: null,
        },
      );
    } catch (error) {
      this.logger.error('Error updating member status to denied:', error);
      throw error;
    }
  }
}
