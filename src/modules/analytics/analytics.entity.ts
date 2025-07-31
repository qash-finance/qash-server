import { BaseEntity } from '../../database/base.entity';
import { Entity, Column, Index } from 'typeorm';

export enum AnalyticsEventType {
  PAGE_VIEW = 'page_view',
  ENDPOINT_CALL = 'endpoint_call',
  USER_SESSION = 'user_session',
  TRANSACTION = 'transaction',
  GIFT = 'gift',
  GROUP_PAYMENT = 'group_payment',
  REQUEST_PAYMENT = 'request_payment',
}

@Entity({ name: 'analytics_events' })
@Index(['eventType', 'createdAt'])
@Index(['userAddress', 'createdAt'])
@Index(['createdAt'])
export class AnalyticsEventEntity extends BaseEntity {
  @Column({
    type: 'enum',
    enum: AnalyticsEventType,
  })
  eventType: AnalyticsEventType;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  userAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  sessionId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', nullable: true })
  referer: string | null;
}

@Entity({ name: 'analytics_user_sessions' })
@Index(['userAddress', 'createdAt'])
@Index(['sessionId'])
export class AnalyticsUserSessionEntity extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  sessionId: string;

  @Column({ type: 'varchar', nullable: true })
  userAddress: string | null;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date | null;

  @Column({ type: 'int', default: 0 })
  duration: number; // in seconds

  @Column({ type: 'int', default: 0 })
  pageViews: number;

  @Column({ type: 'int', default: 0 })
  apiCalls: number;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}

@Entity({ name: 'analytics_endpoint_stats' })
@Index(['endpoint', 'createdAt'])
@Index(['method', 'createdAt'])
export class AnalyticsEndpointStatsEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  endpoint: string;

  @Column({ type: 'varchar' })
  method: string;

  @Column({ type: 'int' })
  responseTime: number; // in milliseconds

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'varchar', nullable: true })
  userAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  sessionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'jsonb', nullable: true })
  errorDetails: Record<string, any> | null;
}

@Entity({ name: 'analytics_transaction_stats' })
@Index(['token', 'createdAt'])
@Index(['transactionType', 'createdAt'])
export class AnalyticsTransactionStatsEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  transactionType: string; // 'transaction', 'gift', 'group_payment', 'request_payment'

  @Column({ type: 'varchar' })
  token: string;

  @Column({ type: 'decimal', precision: 20, scale: 6 })
  amount: string;

  @Column({ type: 'varchar' })
  senderAddress: string;

  @Column({ type: 'varchar', nullable: true })
  receiverAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  status: string | null;

  @Column({ type: 'int', nullable: true })
  entityId: number | null; // Reference to original transaction/gift/etc

  @Column({ type: 'jsonb', nullable: true })
  additionalData: Record<string, any> | null;
}
