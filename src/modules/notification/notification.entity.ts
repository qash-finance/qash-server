import { Column, Entity, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { WalletAuthKeyEntity } from '../wallet-auth/wallet-auth.entity';
import { NotificationType, NotificationStatus } from '../../common/enums/notification';

@Entity({ name: 'notifications' })
@Index(['walletAddress', 'status'])
@Index(['walletAddress', 'createdAt'])
export class NotificationEntity extends BaseEntity {
  @Column({ type: 'text' })
  public title: string;

  @Column({ type: 'text', nullable: true })
  public message: string;

  @Column({ type: 'enum', enum: NotificationType })
  public type: NotificationType;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.UNREAD })
  public status: NotificationStatus;

  @Column({ type: 'jsonb', nullable: true })
  public metadata: Record<string, any> | null;

  @Column({ type: 'varchar', nullable: true })
  public actionUrl: string | null;

  @Column({ type: 'varchar' })
  @Index()
  public walletAddress: string;

  @ManyToOne(() => WalletAuthKeyEntity, { eager: false })
  @JoinColumn({ name: 'wallet_address', referencedColumnName: 'walletAddress' })
  public walletAuth: WalletAuthKeyEntity;

  @Column({ type: 'timestamp', nullable: true })
  public readAt: Date | null;
}
