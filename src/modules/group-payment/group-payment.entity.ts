import { BaseEntity } from '../../database/base.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { FaucetMetadata } from '../transactions/transaction.dto';

export enum GroupPaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

export enum GroupPaymentMemberStatus {
  PENDING = 'pending',
  PAID = 'paid',
  DENIED = 'denied',
}

@Entity({ name: 'group_payment_group' })
export class GroupPaymentGroupEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  ownerAddress: string;

  @Column({ type: 'jsonb' })
  members: string[];
}

@Entity({ name: 'group_payment' })
export class GroupPaymentEntity extends BaseEntity {
  @ManyToOne(() => GroupPaymentGroupEntity, { nullable: true })
  @JoinColumn({ name: 'groupId' })
  group: GroupPaymentGroupEntity;

  @Column({ type: 'varchar' })
  ownerAddress: string;

  @Column({ type: 'jsonb' })
  tokens: {
    faucetId: string;
    amount: string;
    metadata: FaucetMetadata;
  }[];

  @Column({ type: 'varchar' })
  amount: string;

  @Column({ type: 'float' })
  perMember: number;

  @Column({ type: 'varchar', unique: true })
  linkCode: string;

  @Column({
    type: 'enum',
    enum: GroupPaymentStatus,
    default: GroupPaymentStatus.PENDING,
  })
  status: GroupPaymentStatus;
}

@Entity({ name: 'group_payment_member_status' })
export class GroupPaymentMemberStatusEntity extends BaseEntity {
  @ManyToOne(() => GroupPaymentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupPaymentId' })
  groupPayment: GroupPaymentEntity;

  @Column({ type: 'varchar' })
  memberAddress: string;

  @Column({
    type: 'enum',
    enum: GroupPaymentMemberStatus,
    default: GroupPaymentMemberStatus.PENDING,
  })
  status: GroupPaymentMemberStatus;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;
}
