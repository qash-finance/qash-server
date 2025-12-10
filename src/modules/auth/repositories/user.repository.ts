import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UserModel } from '../../../database/generated/models/User';
import {
  BaseRepository,
  PrismaTransactionClient,
} from 'src/database/base.repository';
import { Prisma } from 'src/database/generated/client';

export interface CreateUserData {
  email: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  isActive?: boolean;
  lastLogin?: Date;
}

export interface UserWithRelations extends UserModel {
  otpCodes?: any[];
  sessions?: any[];
}

@Injectable()
export class UserRepository extends BaseRepository<
  UserModel,
  Prisma.UserWhereInput,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel(tx?: PrismaTransactionClient): any {
    return tx ? tx.user : this.prisma.user;
  }

  protected getModelName(): string {
    return 'User';
  }

  /**
   * Find user by email
   */
  async findByEmail(
    email: string,
    tx?: PrismaTransactionClient,
  ): Promise<UserModel | null> {
    return this.findOne({ email }, tx);
  }

  /**
   * Find user by ID
   */
  async findById(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<UserModel | null> {
    return this.findOne({ id }, tx);
  }

  /**
   * Find user by email with OTP codes
   */
  async findByEmailWithOtpCodes(
    email: string,
    otpType?: string,
  ): Promise<UserWithRelations | null> {
    const whereClause: any = {
      type: otpType,
      isUsed: false,
      expiresAt: {
        gt: new Date(),
      },
    };

    if (!otpType) {
      delete whereClause.type;
    }

    return this.prisma.user.findUnique({
      where: { email },
      include: {
        otpCodes: {
          where: whereClause,
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  /**
   * Create new user
   */
  async create(data: CreateUserData): Promise<UserModel> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Update user by ID
   */
  async updateById(id: number, data: UpdateUserData): Promise<UserModel> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Get user profile (safe fields only)
   */
  async getProfile(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
    });
  }

  /**
   * Check if user exists and is active
   */
  async isActiveUser(id: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { isActive: true },
    });
    return user?.isActive ?? false;
  }

  /**
   * Deactivate user
   */
  async deactivate(id: number): Promise<UserModel> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Activate user
   */
  async activate(id: number): Promise<UserModel> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: number): Promise<UserModel> {
    return this.prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }
}
