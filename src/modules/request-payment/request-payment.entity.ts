import { BaseEntity } from '../../database/base.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { GroupPaymentEntity } from '../group-payment/group-payment.entity';
import { FaucetMetadata } from '../transactions/transaction.dto';

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

  @Column({ type: 'jsonb' })
  public tokens: {
    faucetId: string;
    amount: string;
    metadata: FaucetMetadata;
  }[];

  @Column({ type: 'varchar' })
  message: string;

  @Column({
    type: 'enum',
    enum: RequestPaymentStatus,
    default: RequestPaymentStatus.PENDING,
  })
  status: RequestPaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  txid: string | null;

  @Column({ type: 'boolean', default: false })
  isGroupPayment: boolean;

  @ManyToOne(() => GroupPaymentEntity, { nullable: true })
  @JoinColumn({ name: 'groupPaymentId' })
  groupPayment: GroupPaymentEntity;

  @Column({ type: 'int', nullable: true })
  groupPaymentId: number | null;
}
