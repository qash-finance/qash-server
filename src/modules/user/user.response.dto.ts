import { UserStatus } from '../../common/enums/user';
import { Role } from '../../common/enums/role';
import { ReferralCodes } from '@prisma/client';

export class UserMinimalDto {
  public id: number;
  public email: string;
  public name: string;
  public role: Role;
  public referralCode?: ReferralCodes | null;
}

// this doesnt return any password, secret etc
export class UserWithoutSecretDto {
  public id: number;
  public createdAt: Date;
  public updatedAt: Date;
  public email: string;
  public name: string;
  public role: Role;
  public status: UserStatus;
  public referralCode?: ReferralCodes | null | number;
  public referredBy?: UserMinimalDto | number;
  public isTwoFactorAuthEnabled: boolean;
}
