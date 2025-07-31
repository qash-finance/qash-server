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
    members: string[],
  ): Promise<GroupPaymentMemberStatusEntity[]> {
    try {
      const memberStatusEntities = members.map((member) =>
        this.memberStatusRepository.create({
          groupPayment: { id: groupPaymentId },
          memberAddress: member,
          status: GroupPaymentMemberStatus.PENDING,
        }),
      );

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
}
