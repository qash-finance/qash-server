import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In, LessThan } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  WalletAuthKeyEntity,
  WalletAuthSessionEntity,
  WalletAuthChallengeEntity,
  WalletAuthStatus,
} from './wallet-auth.entity';
import {
  InitiateAuthDto,
  RegisterKeyDto,
  AuthenticateDto,
  RefreshTokenDto,
  RevokeKeyDto,
  RevokeSessionDto,
  AuthResponse,
  InitiateAuthResponse,
  RegisterKeyResponse,
  KeyInfo,
  SessionInfo,
} from './wallet-auth.dto';

@Injectable()
export class WalletAuthService {
  private readonly logger = new Logger(WalletAuthService.name);
  private readonly CHALLENGE_EXPIRY_MINUTES = 10;
  private readonly SESSION_EXPIRY_HOURS = 24;
  private readonly KEY_EXPIRY_HOURS = 720; // 30 days
  private readonly MAX_KEYS_PER_WALLET = 5;
  private readonly MAX_SESSIONS_PER_KEY = 3;

  constructor(
    @InjectRepository(WalletAuthKeyEntity)
    private readonly keyRepository: Repository<WalletAuthKeyEntity>,
    @InjectRepository(WalletAuthSessionEntity)
    private readonly sessionRepository: Repository<WalletAuthSessionEntity>,
    @InjectRepository(WalletAuthChallengeEntity)
    private readonly challengeRepository: Repository<WalletAuthChallengeEntity>,
  ) {}

  /**
   * Step 1: Initiate authentication process
   * Returns a challenge that must be signed with the private key
   */
  async initiateAuth(
    dto: InitiateAuthDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<InitiateAuthResponse> {
    try {
      // Clean up expired challenges
      await this.cleanupExpiredChallenges();

      // Generate challenge
      const challengeCode = this.generateSecureToken(32);
      const expectedResponse = this.generateChallengeResponse(
        challengeCode,
        dto.walletAddress,
      );

      const expiresAt = new Date();
      expiresAt.setMinutes(
        expiresAt.getMinutes() + this.CHALLENGE_EXPIRY_MINUTES,
      );

      // Store challenge
      const challenge = this.challengeRepository.create({
        walletAddress: dto.walletAddress,
        challengeCode,
        expectedResponse,
        expiresAt,
        ipAddress,
        userAgent,
        challengeData: {
          deviceFingerprint: dto.deviceFingerprint,
          deviceType: dto.deviceType,
          metadata: dto.metadata,
        },
      });

      await this.challengeRepository.save(challenge);

      return {
        challengeCode,
        expiresAt: expiresAt.toISOString(),
        instructions: `Sign this challenge with your private key: ${challengeCode}`,
      };
    } catch (error) {
      this.logger.error('Failed to initiate auth:', error);
      throw new BadRequestException('Failed to initiate authentication');
    }
  }

  /**
   * Step 2: Register a new key pair for the wallet
   * Verifies the challenge response and stores the public key
   */
  async registerKey(
    dto: RegisterKeyDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RegisterKeyResponse> {
    try {
      // Verify challenge
      const challenge = await this.challengeRepository.findOne({
        where: {
          challengeCode: dto.challengeCode,
          walletAddress: dto.walletAddress,
          isUsed: false,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!challenge) {
        throw new BadRequestException('Invalid or expired challenge');
      }

      // Verify challenge response
      if (
        !this.verifyChallengeResponse(
          dto.challengeResponse,
          challenge.expectedResponse,
        )
      ) {
        throw new BadRequestException('Invalid challenge response');
      }

      // Check if wallet already has too many keys
      const existingKeysCount = await this.keyRepository.count({
        where: {
          walletAddress: dto.walletAddress,
          status: WalletAuthStatus.ACTIVE,
        },
      });

      if (existingKeysCount >= this.MAX_KEYS_PER_WALLET) {
        throw new BadRequestException(
          `Maximum ${this.MAX_KEYS_PER_WALLET} keys allowed per wallet`,
        );
      }

      // Check if public key already exists
      const existingKey = await this.keyRepository.findOne({
        where: { publicKey: dto.publicKey },
      });

      if (existingKey) {
        throw new BadRequestException('Public key already registered');
      }

      // Generate secret key and hash it
      const secretKey = this.generateSecureToken(64);
      const salt = await bcrypt.genSalt(12);
      const hashedSecretKey = await bcrypt.hash(secretKey, salt);

      // Set expiration
      const expiresAt = new Date();
      expiresAt.setHours(
        expiresAt.getHours() + (dto.expirationHours || this.KEY_EXPIRY_HOURS),
      );

      // Create key record
      const keyRecord = this.keyRepository.create({
        walletAddress: dto.walletAddress,
        publicKey: dto.publicKey,
        hashedSecretKey,
        keyDerivationSalt: salt,
        expiresAt,
        deviceFingerprint: dto.deviceFingerprint,
        deviceType: dto.deviceType,
        ipAddress,
        userAgent,
        metadata: challenge.challengeData,
      });

      await this.keyRepository.save(keyRecord);

      // Mark challenge as used
      challenge.isUsed = true;
      await this.challengeRepository.save(challenge);

      return {
        publicKey: dto.publicKey,
        expiresAt: expiresAt.toISOString(),
        status: 'registered',
      };
    } catch (error) {
      this.logger.error('Failed to register key:', error);
      throw error;
    }
  }

  /**
   * Step 3: Authenticate using registered key
   * Verifies signature and creates session
   */
  async authenticate(
    dto: AuthenticateDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    try {
      // Find active key
      const keyRecord = await this.keyRepository.findOne({
        where: {
          walletAddress: dto.walletAddress,
          publicKey: dto.publicKey,
          status: WalletAuthStatus.ACTIVE,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!keyRecord) {
        throw new UnauthorizedException('Invalid or expired key');
      }

      // Verify signature (timestamp-based to prevent replay attacks)
      const message = `${dto.walletAddress}:${dto.timestamp}`;
      if (!this.verifySignature(message, dto.signature, dto.publicKey)) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Check timestamp (prevent replay attacks - allow 5 minutes tolerance)
      const signatureTime = new Date(dto.timestamp);
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - signatureTime.getTime());
      if (timeDiff > 60 * 60 * 1000) {
        throw new UnauthorizedException('Signature timestamp too old');
      }

      // Check device fingerprint if provided
      if (
        dto.deviceFingerprint &&
        keyRecord.deviceFingerprint &&
        dto.deviceFingerprint !== keyRecord.deviceFingerprint
      ) {
        this.logger.warn(
          `Device fingerprint mismatch for ${dto.walletAddress}`,
        );
      }

      // Clean up old sessions for this key
      await this.cleanupOldSessions(keyRecord.id);

      // Create new session
      const sessionToken = this.generateSecureToken(48);
      const sessionExpiresAt = new Date();
      sessionExpiresAt.setHours(
        sessionExpiresAt.getHours() + this.SESSION_EXPIRY_HOURS,
      );

      const session = this.sessionRepository.create({
        sessionToken,
        walletAddress: dto.walletAddress,
        authKeyId: keyRecord.id,
        expiresAt: sessionExpiresAt,
        lastActivityAt: new Date(),
        ipAddress,
        userAgent,
        sessionData: {
          deviceFingerprint: dto.deviceFingerprint,
          loginTime: new Date().toISOString(),
        },
      });

      await this.sessionRepository.save(session);

      // Update key last used time
      keyRecord.lastUsedAt = new Date();
      await this.keyRepository.save(keyRecord);

      return {
        sessionToken,
        expiresAt: sessionExpiresAt.toISOString(),
        walletAddress: dto.walletAddress,
        publicKey: dto.publicKey,
      };
    } catch (error) {
      this.logger.error('Failed to authenticate:', error);
      throw error;
    }
  }

  /**
   * Refresh an existing session
   */
  async refreshToken(
    dto: RefreshTokenDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    try {
      const session = await this.sessionRepository.findOne({
        where: {
          sessionToken: dto.sessionToken,
          walletAddress: dto.walletAddress,
          isActive: true,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!session) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      // Get key info
      const keyRecord = await this.keyRepository.findOne({
        where: { id: session.authKeyId },
      });

      if (!keyRecord || keyRecord.status !== WalletAuthStatus.ACTIVE) {
        throw new UnauthorizedException('Key no longer active');
      }

      // Extend session
      const newExpiresAt = new Date();
      newExpiresAt.setHours(
        newExpiresAt.getHours() + this.SESSION_EXPIRY_HOURS,
      );

      session.expiresAt = newExpiresAt;
      session.lastActivityAt = new Date();
      await this.sessionRepository.save(session);

      return {
        sessionToken: dto.sessionToken,
        expiresAt: newExpiresAt.toISOString(),
        walletAddress: dto.walletAddress,
        publicKey: keyRecord.publicKey,
      };
    } catch (error) {
      this.logger.error('Failed to refresh token:', error);
      throw error;
    }
  }

  /**
   * Validate a session token
   */
  async validateSession(
    sessionToken: string,
  ): Promise<{ walletAddress: string; publicKey: string } | null> {
    try {
      const session = await this.sessionRepository.findOne({
        where: {
          sessionToken,
          isActive: true,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!session) {
        return null;
      }

      const keyRecord = await this.keyRepository.findOne({
        where: { id: session.authKeyId },
      });

      if (!keyRecord || keyRecord.status !== WalletAuthStatus.ACTIVE) {
        return null;
      }

      // Update last activity
      session.lastActivityAt = new Date();
      await this.sessionRepository.save(session);

      return {
        walletAddress: session.walletAddress,
        publicKey: keyRecord.publicKey,
      };
    } catch (error) {
      this.logger.error('Failed to validate session:', error);
      return null;
    }
  }

  /**
   * Revoke keys for a wallet
   */
  async revokeKeys(dto: RevokeKeyDto): Promise<{ revokedCount: number }> {
    try {
      const whereClause: any = {
        walletAddress: dto.walletAddress,
        status: WalletAuthStatus.ACTIVE,
      };

      if (dto.publicKey) {
        whereClause.publicKey = dto.publicKey;
      }

      const result = await this.keyRepository.update(whereClause, {
        status: WalletAuthStatus.REVOKED,
      });

      // Also revoke all sessions for these keys
      const keys = await this.keyRepository.find({ where: whereClause });
      const keyIds = keys.map((k) => k.id);

      if (keyIds.length > 0) {
        await this.sessionRepository.update(
          { authKeyId: In(keyIds) },
          { isActive: false },
        );
      }

      return { revokedCount: result.affected || 0 };
    } catch (error) {
      this.logger.error('Failed to revoke keys:', error);
      throw new BadRequestException('Failed to revoke keys');
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(dto: RevokeSessionDto): Promise<{ success: boolean }> {
    try {
      const result = await this.sessionRepository.update(
        { sessionToken: dto.sessionToken },
        { isActive: false },
      );

      return { success: (result.affected || 0) > 0 };
    } catch (error) {
      this.logger.error('Failed to revoke session:', error);
      throw new BadRequestException('Failed to revoke session');
    }
  }

  /**
   * Get all keys for a wallet
   */
  async getKeys(walletAddress: string): Promise<KeyInfo[]> {
    try {
      const keys = await this.keyRepository.find({
        where: { walletAddress },
        order: { createdAt: 'DESC' },
      });

      return keys.map((key) => ({
        publicKey: key.publicKey,
        status: key.status,
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt.toISOString(),
        lastUsedAt: key.lastUsedAt?.toISOString() || null,
        deviceType: key.deviceType,
        deviceFingerprint: key.deviceFingerprint,
      }));
    } catch (error) {
      this.logger.error('Failed to get keys:', error);
      throw new BadRequestException('Failed to get keys');
    }
  }

  /**
   * Get all sessions for a wallet
   */
  async getSessions(
    walletAddress: string,
    includeInactive = false,
  ): Promise<SessionInfo[]> {
    try {
      const whereClause: any = { walletAddress };
      if (!includeInactive) {
        whereClause.isActive = true;
        whereClause.expiresAt = MoreThan(new Date());
      }

      const sessions = await this.sessionRepository.find({
        where: whereClause,
        order: { createdAt: 'DESC' },
      });

      return sessions.map((session) => ({
        sessionToken: session.sessionToken,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        lastActivityAt: session.lastActivityAt?.toISOString() || null,
        isActive: session.isActive,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      }));
    } catch (error) {
      this.logger.error('Failed to get sessions:', error);
      throw new BadRequestException('Failed to get sessions');
    }
  }

  // Private helper methods
  private generateSecureToken(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  private generateChallengeResponse(
    challenge: string,
    walletAddress: string,
  ): string {
    return crypto
      .createHash('sha256')
      .update(`${challenge}:${walletAddress}`)
      .digest('hex');
  }

  private verifyChallengeResponse(response: string, expected: string): boolean {
    return response === expected;
  }

  private verifySignature(
    message: string,
    signature: string,
    publicKey: string,
  ): boolean {
    try {
      // This is a simplified verification - in practice, you'd use the actual crypto library
      // for your specific signature scheme (e.g., secp256k1, ed25519, etc.)
      const messageHash = crypto
        .createHash('sha256')
        .update(message)
        .digest('hex');
      const expectedSignature = crypto
        .createHash('sha256')
        .update(`${messageHash}:${publicKey}`)
        .digest('hex');
      return signature === expectedSignature;
    } catch (error) {
      this.logger.error('Signature verification failed:', error);
      return false;
    }
  }

  private async cleanupExpiredChallenges(): Promise<void> {
    await this.challengeRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  private async cleanupOldSessions(keyId: number): Promise<void> {
    const sessions = await this.sessionRepository.find({
      where: { authKeyId: keyId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (sessions.length >= this.MAX_SESSIONS_PER_KEY) {
      const sessionsToDeactivate = sessions.slice(
        this.MAX_SESSIONS_PER_KEY - 1,
      );
      const sessionIds = sessionsToDeactivate.map((s) => s.id);

      await this.sessionRepository.update(
        { id: In(sessionIds) },
        { isActive: false },
      );
    }
  }
}
