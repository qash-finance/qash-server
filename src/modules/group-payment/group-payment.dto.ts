import {
  IsString,
  IsArray,
  IsNotEmpty,
  IsNumber,
  Matches,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { FaucetMetadata } from '../transactions/transaction.dto';

export class TokenDto {
  @ApiProperty({
    description: 'Faucet ID (token address)',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
  })
  @IsString()
  @MinLength(3, { message: 'faucetId is too short' })
  faucetId: string;

  @ApiProperty({ description: 'Amount', example: '1000' })
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, {
    message: 'amount must be a valid positive number',
  })
  amount: string;

  @ApiProperty({
    example: { symbol: 'MTST', decimals: 18, maxSupply: 1000000000000000000 },
  })
  @IsObject()
  metadata: FaucetMetadata;
}

export class CreateGroupDto {
  @ApiProperty({ description: 'Group name', example: 'Group 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, {
    message: 'Group name cannot be longer than 100 characters',
  })
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message:
      'Group name can only contain letters, numbers, spaces, hyphens, and underscores',
  })
  name: string;

  @ApiProperty({
    description: 'Member addresses',
    type: [String],
    example: [
      'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
      'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least 1 member is required' })
  @ArrayMaxSize(50, { message: 'Maximum 50 members allowed' })
  @IsString({ each: true })
  @Matches(/^(mt|mm)[a-zA-Z0-9]+$/, {
    each: true,
    message: 'Each member must be a valid address starting with mt or mm',
  })
  @MinLength(3, { each: true, message: 'Each member address is too short' })
  members: string[];
}

export class CreateDefaultGroupDto {
  @ApiProperty({ description: 'Group name', example: 'Quick Share' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, {
    message: 'Group name cannot be longer than 100 characters',
  })
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message:
      'Group name can only contain letters, numbers, spaces, hyphens, and underscores',
  })
  name: string;

  @ApiProperty({
    description: 'Member addresses (optional for default groups)',
    type: [String],
    required: false,
    example: [],
  })
  @IsArray()
  @ArrayMaxSize(50, { message: 'Maximum 50 members allowed' })
  @IsString({ each: true })
  @Matches(/^(mt|mm)[a-zA-Z0-9]+$/, {
    each: true,
    message: 'Each member must be a valid address starting with mt or mm',
  })
  @MinLength(3, { each: true, message: 'Each member address is too short' })
  members: string[] = [];
}

export class CreateGroupPaymentDto {
  @ApiProperty({
    description: 'Tokens',
    example: [
      {
        faucetId: '0x2342342342342342342342342342342342342342',
        amount: '100',
        metadata: { name: 'test' },
      },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TokenDto)
  tokens: TokenDto[];

  @ApiProperty({ description: 'Total amount to split', example: '100' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d+)?$/, {
    message: 'amount must be a valid positive number',
  })
  amount: string;

  @ApiProperty({ description: 'Equally splitted amount', example: 100 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0, { message: 'perMember must be a positive number' })
  perMember: number;

  @ApiProperty({ description: 'Group ID (for group split)', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  @Min(1, { message: 'groupId must be a positive number' })
  groupId: number;
}

export class PayGroupPaymentDto {
  @ApiProperty({ description: 'Member address' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[0-9a-fA-F]+$/, {
    message: 'memberAddress must be a valid hex address starting with 0x',
  })
  @MinLength(3, { message: 'memberAddress is too short' })
  memberAddress: string;

  @ApiProperty({ description: 'Link code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'linkCode is too short' })
  @MaxLength(20, { message: 'linkCode is too long' })
  linkCode: string;
}
