import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserStatus } from '../../common/enums/user';
import { ValidatePasswordDto } from '../auth/auth.dto';
import { Role } from '../../common/enums/role';
import { ReferralCodes, Users } from '@prisma/client';

export class UserBaseDto extends ValidatePasswordDto {
  @ApiProperty()
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  public email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public name: string;
}

export class UserSignUpDto extends UserBaseDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  public referral?: string | null;
}

export class UserSignUpSandboxDto extends UserBaseDto {}

export class UserDto extends UserSignUpDto {
  public role: Role;
  public status: UserStatus;
  public referralCode?: ReferralCodes | null;
  public referredBy?: Users | null;
}
