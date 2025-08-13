import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Length } from 'class-validator';

// create referral code dto
export class ReferralCodeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(8, 8)
  public code: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  public timesUsed?: number;
}
