import { BaseEntity } from '../../database/base.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { GroupPaymentEntity } from '../group-payment/group-payment.entity';

export enum RequestPaymentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DENIED = 'denied',
}

@Entity({ name: 'request_payment' })
export class RequestPaymentEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  payer: string;

  @Column({ type: 'varchar' })
  payee: string;

  @Column({ type: 'varchar' })
  amount: string;

  @Column({ type: 'varchar', nullable: true })
  token: string;

  @Column({ type: 'varchar' })
  message: string;

  @Column({
    type: 'enum',
    enum: RequestPaymentStatus,
    default: RequestPaymentStatus.PENDING,
  })
  status: RequestPaymentStatus;

  @Column({ type: 'boolean', default: false })
  isGroupPayment: boolean;

  @ManyToOne(() => GroupPaymentEntity, { nullable: true })
  @JoinColumn({ name: 'groupPaymentId' })
  groupPayment: GroupPaymentEntity;

  @Column({ type: 'int', nullable: true })
  groupPaymentId: number | null;
}
