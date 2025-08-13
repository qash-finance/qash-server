import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UserStatus } from '../../common/enums/user';
import { UserSignUpDto } from './user.dto';
import { ErrorAuth, ErrorUser } from '../../common/constants/errors';
import { Role } from '../../common/enums/role';
import { ReferralCodes } from '@prisma/client';
import { ReferralCodeService } from '../referral/referral.service';
import { AppConfigService } from '../../common/config/services/config.service';
import { UserWithoutSecretDto } from './user.response.dto';
import { Prisma, Users } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private HASH_ROUNDS = 12;
  constructor(
    private readonly referralCodeService: ReferralCodeService,
    private readonly appConfigService: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  public async create(
    dto: UserSignUpDto,
    isSandbox: boolean = false,
  ): Promise<Users> {
    let referralCodeEntity: ReferralCodes | null = null;
    let referralCodeOwner: Users | null = null;
    const { email, password, referral: referralCode, ...rest } = dto;
    if (referralCode) {
      referralCodeEntity = await this.prisma.referralCodes.findFirst({
        where: { code: referralCode },
      });
      if (!referralCodeEntity) {
        throw new BadRequestException(ErrorUser.InvalidReferralCode);
      }
      if (
        referralCodeEntity.timesUsed >=
        this.appConfigService.otherConfig.referralCodeMaximumUsage
      ) {
        throw new BadRequestException(ErrorUser.ReferralCodeMaxedOut);
      }
      referralCodeOwner = await this.prisma.users.findFirst({
        where: { referralCodeId: referralCodeEntity.id },
        include: { referralCodes: true },
      });
    }

    const hashedPassword = bcrypt.hashSync(password, this.HASH_ROUNDS);
    const role =
      this.appConfigService.otherConfig.defaultRole == 'user'
        ? Role.USER
        : null;

    const data: Omit<Prisma.UsersCreateInput, 'createdAt' | 'updatedAt'> = {
      email,
      name: (rest as any).name,
      password: hashedPassword,
      role: (role as unknown) as any,
      status: ((isSandbox ? UserStatus.ACTIVE : UserStatus.PENDING) as unknown) as any,
      ...(referralCodeOwner
        ? { referrer: { connect: { id: referralCodeOwner.id } } }
        : {}),
    };

    if (isSandbox && referralCode) {
      await this.referralCodeService.useReferralCode(referralCodeOwner as any);
      const newReferralCode = await this.referralCodeService.create({
        code: this.referralCodeService.generateCode(),
        timesUsed: 0,
      });
      data.referralCodes = { connect: { id: newReferralCode.id } };
    }

    const now = new Date();
    const created = await this.prisma.users.create({
      data: {
        ...data,
        createdAt: now,
        updatedAt: now,
      },
    });
    return created;
  }

  public async update(dto: UserSignUpDto): Promise<Users> {
    // search for referral code
    const { email, password, referral: referralCode, ...rest } = dto;
    let referralCodeEntity: ReferralCodes | null = null;
    let referralCodeOwner: Users | null = null;
    // first check if referral code is null
    if (referralCode) {
      referralCodeEntity = await this.prisma.referralCodes.findFirst({
        where: { code: referralCode },
      });
      if (!referralCodeEntity) {
        throw new BadRequestException(ErrorUser.InvalidReferralCode);
      }
      // check if the referral code is maxed out
      if (
        referralCodeEntity.timesUsed >=
        this.appConfigService.otherConfig.referralCodeMaximumUsage
      ) {
        throw new BadRequestException(ErrorUser.ReferralCodeMaxedOut);
      }
      // get the owner of the referral code
      referralCodeOwner = await this.prisma.users.findFirst({
        where: { referralCodeId: referralCodeEntity.id },
        include: { referralCodes: true },
      });
    }
    
    const existing = await this.prisma.users.findFirst({ where: { email: dto.email } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    
    const updated = await this.prisma.users.update({
      where: { id: existing.id },
      data: {
        name: (rest as any).name,
        password: bcrypt.hashSync(password, this.HASH_ROUNDS),
        ...(referralCodeOwner
          ? { referrer: { connect: { id: referralCodeOwner.id } } }
          : {}),
        updatedAt: new Date(),
      } as unknown as Prisma.UsersUpdateInput,
      include: { referralCodes: true, otherUsers: { include: { referralCodes: true } } },
    });
    return updated;
  }

  public async activate(userEntity: Users): Promise<Users> {
    let data: Prisma.UsersUpdateInput = { status: (UserStatus.ACTIVE as unknown) as any };
    if (this.appConfigService.otherConfig.requireSignupWithReferral) {
      const newRef = await this.referralCodeService.create({
        code: this.referralCodeService.generateCode(),
        timesUsed: 0,
      });
      data = {
        ...data,
        referralCode: { connect: { id: newRef.id } },
      } as any;
      if ((userEntity as any)?.referredBy?.id) {
        const referredBy = await this.prisma.users.findFirst({
          where: { id: (userEntity as any).referredBy.id },
          include: { referralCodes: true },
        });
        if (referredBy) {
          await this.referralCodeService.useReferralCode(referredBy as any);
        }
      }
    }
    const updated = await this.prisma.users.update({
      where: { id: userEntity.id },
      data: { ...data, updatedAt: new Date() },
      include: {
        referralCodes: true,
        otherUsers: { include: { referralCodes: true } },
      },
    });
    return updated;
  }

  public getByEmail(email: string): Promise<Users> {
    return this.prisma.users.findFirst({
      where: { email },
      include: { referralCodes: true, otherUsers: { include: { referralCodes: true } } },
    }) as Promise<Users>;
  }

  public async getById(
    id: number,
    isExtend: boolean,
  ): Promise<UserWithoutSecretDto> {
    isExtend = String(isExtend) == 'true';
    const user = await this.prisma.users.findFirst({
      where: { id },
      include: { referralCodes: true, otherUsers: { include: { referralCodes: true } } },
    });

    if (!user) {
      throw new NotFoundException(ErrorUser.NotFound);
    }

    const referralCode = user.referralCodeId ? await this.prisma.referralCodes.findFirst({
      where: { id: user.referralCodeId },
    }) : null;

    return {
      id: user.id,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      status: user.status as UserStatus,
      isTwoFactorAuthEnabled: user.isTwoFactorAuthEnabled,
      referralCode: isExtend
        ? referralCode
        : referralCode
          ? referralCode.id
          : null,
      referredBy: isExtend
        ? user.referredById
          ? {
              id: user.referredById,
              email: user.email,
              name: user.name,
              role: user.role as Role,
              referralCode: referralCode,
            }
          : null
        : user.referredById
          ? user.referredById
          : null,
    };
  }

  public async updatePassword(
    userEntity: Users,
    password: string,
  ): Promise<Users> {
    const updated = await this.prisma.users.update({
      where: { id: userEntity.id },
      data: { 
        password: bcrypt.hashSync(password, this.HASH_ROUNDS),
        updatedAt: new Date(),
      } as any,
    });
    return updated;
  }

  public async getByCredentials(
    email: string,
    password: string,
  ): Promise<Users> {
    const userEntity = await this.getByEmail(email);
    if (!userEntity) {
      throw new NotFoundException(ErrorUser.NotFound);
    }
    if (!bcrypt.compareSync(password, userEntity.password)) {
      throw new NotFoundException(ErrorAuth.InvalidCredentials);
    }
    return userEntity;
  }

  public async updateRole(
    callerUser: Users,
    id: number,
    role: Role,
    isRemove: boolean,
  ): Promise<void> {
    if (callerUser.id === id) {
      throw new BadRequestException(ErrorUser.RoleSelfAssign);
    }

    const userEntity = await this.prisma.users.findFirst({ where: { id } });
    if (!userEntity) {
      throw new NotFoundException(ErrorUser.NotFound);
    }

    if (userEntity?.role === 'admin') {
      throw new BadRequestException(ErrorUser.AdminRoleCannotBeChanged);
    }

    if (
      userEntity?.role === 'admin_only_view' &&
      callerUser.role !== 'admin'
    ) {
      throw new BadRequestException(ErrorUser.RoleCannotBeChanged);
    }

    await this.prisma.users.update({
      where: { id },
      data: {
        role: (isRemove ? null : (role as unknown)) as any,
        updatedAt: new Date(),
      },
    });
  }

  public async updateTwoFactorAuthSecret(
    userEntity: Users,
    secret: string,
  ): Promise<Users> {
    const updated = await this.prisma.users.update({
      where: { id: userEntity.id },
      data: {
        twoFactorAuthSecret: secret,
        updatedAt: new Date(),
      } as any,
    });
    return updated;
  }

  public async changeTwoFactorAuth(
    userEntity: Users,
    enable: boolean,
  ): Promise<Users> {
    const updated = await this.prisma.users.update({
      where: { id: userEntity.id },
      data: {
        isTwoFactorAuthEnabled: enable,
        updatedAt: new Date(),
      } as any,
    });
    return updated;
  }

  public async list(
    page: number,
    limit: number,
    isExtend?: boolean,
    idsStr?: string,
    onlyActiveUsers?: boolean,
  ): Promise<UserWithoutSecretDto[]> {
    isExtend = String(isExtend) == 'true';
    // map ids str to array of ids
    let userEntities: any[];
    const ids = idsStr
      ? idsStr.split(',').map((id) => parseInt(id))
      : undefined;
    if (ids) {
      userEntities = await this.prisma.users.findMany({
        where: { id: { in: ids } },
        skip: page * limit,
        take: limit,
        include: { referralCodes: true, otherUsers: { include: { referralCodes: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else if (onlyActiveUsers) {
      userEntities = await this.prisma.users.findMany({
        where: { status: (UserStatus.ACTIVE as unknown) as any },
        skip: page * limit,
        take: limit,
        include: { referralCodes: true, otherUsers: { include: { referralCodes: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      userEntities = await this.prisma.users.findMany({
        skip: page * limit,
        take: limit,
        include: { referralCodes: true, otherUsers: { include: { referralCodes: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    // return with the same format as getById
    return userEntities.map((userEntity) => ({
      id: userEntity.id,
      createdAt: userEntity.createdAt,
      updatedAt: userEntity.updatedAt,
      email: userEntity.email,
      name: userEntity.name,
      role: userEntity.role,
      status: userEntity.status,
      isTwoFactorAuthEnabled: userEntity.isTwoFactorAuthEnabled,
      referralCode: isExtend
        ? userEntity.referralCode
        : userEntity.referralCode
          ? userEntity.referralCode.id
          : null,
      referredBy: isExtend
        ? userEntity.referrer
          ? {
              id: userEntity.referrer.id,
              email: userEntity.referrer.email,
              name: userEntity.referrer.name,
              role: userEntity.referrer.role,
              referralCode: userEntity.referrer.referralCode,
            }
          : null
        : userEntity.referrer
          ? userEntity.referrer.id
          : null,
    }));
  }
}
