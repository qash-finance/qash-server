import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import {
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
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class WalletAuthService {
  private readonly logger = new Logger(WalletAuthService.name);
  private readonly CHALLENGE_EXPIRY_MINUTES = 10;
  private readonly SESSION_EXPIRY_HOURS = 24;
  private readonly KEY_EXPIRY_HOURS = 720; // 30 days
  private readonly MAX_KEYS_PER_WALLET = 5;
  private readonly MAX_SESSIONS_PER_KEY = 3;

  constructor(
    private readonly prisma: PrismaService,
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
      const now = new Date();
      await this.prisma.walletAuthChallenges.create({
        data: {
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
          } as any,
          createdAt: now,
          updatedAt: now,
        },
      });

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
      const challenge = await this.prisma.walletAuthChallenges.findFirst({
        where: {
          challengeCode: dto.challengeCode,
          walletAddress: dto.walletAddress,
          isUsed: false,
          expiresAt: { gt: new Date() },
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
      const existingKeysCount = await this.prisma.walletAuthKeys.count({
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
      const existingKey = await this.prisma.walletAuthKeys.findFirst({
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

      // Check if key already exists for this wallet address
      const existingWalletKey = await this.prisma.walletAuthKeys.findFirst({
        where: { walletAddress: dto.walletAddress },
      });

      if (existingWalletKey) {
        const updated = await this.prisma.walletAuthKeys.update({
          where: { id: existingWalletKey.id },
          data: {
            publicKey: dto.publicKey,
            hashedSecretKey: hashedSecretKey,
            keyDerivationSalt: salt,
            expiresAt: expiresAt,
            deviceFingerprint: dto.deviceFingerprint,
            deviceType: dto.deviceType,
            ipAddress: ipAddress,
            userAgent: userAgent,
            metadata: challenge.challengeData as any,
            status: WalletAuthStatus.ACTIVE,
            updatedAt: new Date(),
          },
        });
      } else {
        const createTime = new Date();
        const keyRecord = await this.prisma.walletAuthKeys.create({
          data: {
            walletAddress: dto.walletAddress,
            publicKey: dto.publicKey,
            hashedSecretKey,
            keyDerivationSalt: salt,
            expiresAt,
            deviceFingerprint: dto.deviceFingerprint,
            deviceType: dto.deviceType,
            ipAddress,
            userAgent,
            metadata: challenge.challengeData as any,
            createdAt: createTime,
            updatedAt: createTime,
          },
        });
      }

      await this.prisma.walletAuthChallenges.update({
        where: { id: challenge.id },
        data: { 
          isUsed: true,
          updatedAt: new Date(),
        },
      });

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
      const keyRecord = await this.prisma.walletAuthKeys.findFirst({
        where: {
          walletAddress: dto.walletAddress,
          publicKey: dto.publicKey,
          status: WalletAuthStatus.ACTIVE,
          expiresAt: { gt: new Date() },
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

      const sessionTime = new Date();
      const session = await this.prisma.walletAuthSessions.create({
        data: {
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
          } as any,
          createdAt: sessionTime,
          updatedAt: sessionTime,
        },
      });

      // Update key last used time
      await this.prisma.walletAuthKeys.update({
        where: { id: keyRecord.id },
        data: { 
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        },
      });

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
  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const session = await this.prisma.walletAuthSessions.findFirst({
        where: {
          sessionToken: dto.sessionToken,
          walletAddress: dto.walletAddress,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      const keyRecord = await this.prisma.walletAuthKeys.findFirst({
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

      await this.prisma.walletAuthSessions.update({
        where: { id: session.id },
        data: {
          expiresAt: newExpiresAt,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        },
      });

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
      const session = await this.prisma.walletAuthSessions.findFirst({
        where: {
          sessionToken,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        return null;
      }

      const keyRecord = await this.prisma.walletAuthKeys.findFirst({
        where: { id: session.authKeyId },
      });

      if (!keyRecord || keyRecord.status !== WalletAuthStatus.ACTIVE) {
        return null;
      }

      // Update last activity
      await this.prisma.walletAuthSessions.update({
        where: { id: session.id },
        data: {
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        },
      });

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

      const result = await this.prisma.walletAuthKeys.updateMany({
        where: whereClause,
        data: {
          status: WalletAuthStatus.REVOKED,
          updatedAt: new Date(),
        },
      });

      // Also revoke all sessions for these keys
      const keys = await this.prisma.walletAuthKeys.findMany({ 
        where: whereClause 
      });
      const keyIds = keys.map((k) => k.id);

      if (keyIds.length > 0) {
        await this.prisma.walletAuthSessions.updateMany({
          where: { authKeyId: { in: keyIds } },
          data: { 
            isActive: false,
            updatedAt: new Date(),
          },
        });
      }

      return { revokedCount: result.count };
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
      const result = await this.prisma.walletAuthSessions.updateMany({
        where: { sessionToken: dto.sessionToken },
        data: { 
          isActive: false,
          updatedAt: new Date(),
        },
      });

      return { success: result.count > 0 };
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
      const keys = await this.prisma.walletAuthKeys.findMany({
        where: { walletAddress },
        orderBy: { createdAt: 'desc' },
      });

      return keys.map((key) => ({
        publicKey: key.publicKey,
        status: key.status,
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt.toISOString(),
        lastUsedAt: key.lastUsedAt?.toISOString() || null,
        deviceType: key.deviceType as any,
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
        whereClause.expiresAt = { gt: new Date() };
      }

      const sessions = await this.prisma.walletAuthSessions.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
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
    await this.prisma.walletAuthChallenges.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  private async cleanupOldSessions(keyId: number): Promise<void> {
    const sessions = await this.prisma.walletAuthSessions.findMany({
      where: { authKeyId: keyId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (sessions.length >= this.MAX_SESSIONS_PER_KEY) {
      const sessionsToDeactivate = sessions.slice(
        this.MAX_SESSIONS_PER_KEY - 1,
      );
      const sessionIds = sessionsToDeactivate.map((s) => s.id);

      await this.prisma.walletAuthSessions.updateMany({
        where: { id: { in: sessionIds } },
        data: { 
          isActive: false,
          updatedAt: new Date(),
        },
      });
    }
  }
}
