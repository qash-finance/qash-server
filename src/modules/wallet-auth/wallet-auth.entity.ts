import { BaseEntity } from '../../database/base.entity';
import { Entity, Column, Index } from 'typeorm';

export enum WalletAuthStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  UNKNOWN = 'unknown',
}

@Entity({ name: 'wallet_auth_keys' })
@Index(['walletAddress', 'status'])
@Index(['publicKey'])
@Index(['createdAt'])
export class WalletAuthKeyEntity extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  @Index()
  walletAddress: string;

  @Column({ type: 'varchar', unique: true })
  publicKey: string;

  @Column({ type: 'varchar' })
  hashedSecretKey: string; // Hashed version of the secret key

  @Column({ type: 'varchar', nullable: true })
  keyDerivationSalt: string; // Salt used for key derivation

  @Column({
    type: 'enum',
    enum: WalletAuthStatus,
    default: WalletAuthStatus.ACTIVE,
  })
  status: WalletAuthStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'varchar', nullable: true })
  deviceFingerprint: string | null;

  @Column({
    type: 'enum',
    enum: DeviceType,
    default: DeviceType.UNKNOWN,
  })
  deviceType: DeviceType;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}

@Entity({ name: 'wallet_auth_sessions' })
@Index(['walletAddress', 'isActive'])
@Index(['sessionToken'])
@Index(['authKeyId'])
export class WalletAuthSessionEntity extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  sessionToken: string;

  @Column({ type: 'varchar' })
  walletAddress: string;

  @Column({ type: 'int' })
  authKeyId: number;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  sessionData: Record<string, any> | null;
}

@Entity({ name: 'wallet_auth_challenges' })
@Index(['walletAddress', 'isUsed'])
@Index(['challengeCode'])
@Index(['createdAt'])
export class WalletAuthChallengeEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  walletAddress: string;

  @Column({ type: 'varchar', unique: true })
  challengeCode: string;

  @Column({ type: 'varchar' })
  expectedResponse: string; // What the client should send back

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  challengeData: Record<string, any> | null;
}
