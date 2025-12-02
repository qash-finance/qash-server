import {
  IsString,
  IsEnum,
  IsNotEmpty,
  Matches,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  ValidateNested,
  IsObject,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentLinkStatusEnum } from 'src/database/generated/enums';

export class TokenMetadataDto {
  @ApiProperty({
    description: 'Token symbol',
    example: 'MTST',
  })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({
    description: 'Token decimals',
    example: 18,
  })
  @IsNotEmpty()
  decimals: number;

  @ApiProperty({
    description: 'Token faucet ID',
    example: '0x123...',
  })
  @IsString()
  @IsNotEmpty()
  faucetId: string;
}

export class ChainMetadataDto {
  @ApiProperty({
    description: 'Chain ID',
    example: '1',
  })
  @IsString()
  @IsNotEmpty()
  chainId: string;

  @ApiProperty({
    description: 'Chain name',
    example: 'Ethereum',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreatePaymentLinkDto {
  @ApiProperty({
    description: 'The title of the payment link',
    example: 'Payment for services',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100, { message: 'Title cannot be longer than 100 characters' })
  title: string;

  @ApiProperty({
    description: 'The description of the payment link',
    example: 'Please pay for web development services',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500, {
    message: 'Description cannot be longer than 500 characters',
  })
  description: string;

  @ApiProperty({
    description: 'The amount requested',
    example: '1000',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, {
    message: 'amount must be a valid positive number',
  })
  amount: string;

  @ApiProperty({
    description: 'The address of the payee (who will receive payment)',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(mt|mm)[a-zA-Z0-9]+$/, {
    message: 'payee must be a valid address starting with mt or mm',
  })
  @MinLength(3, { message: 'payee address is too short' })
  payee: string;

  @ApiProperty({
    description: 'Accepted tokens for this payment link',
    type: [TokenMetadataDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenMetadataDto)
  acceptedTokens?: TokenMetadataDto[];

  @ApiProperty({
    description: 'Accepted chains for this payment link',
    type: [ChainMetadataDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChainMetadataDto)
  acceptedChains?: ChainMetadataDto[];
}

export class UpdatePaymentLinkDto {
  @ApiProperty({
    description: 'The title of the payment link',
    example: 'Payment for services',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Title cannot be longer than 100 characters' })
  title?: string;

  @ApiProperty({
    description: 'The description of the payment link',
    example: 'Please pay for web development services',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Description cannot be longer than 500 characters',
  })
  description?: string;

  @ApiProperty({
    description: 'The amount requested',
    example: '1000',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, {
    message: 'amount must be a valid positive number',
  })
  amount?: string;

  @ApiProperty({
    description: 'Status of the payment link',
    enum: PaymentLinkStatusEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentLinkStatusEnum)
  status?: PaymentLinkStatusEnum;

  @ApiProperty({
    description: 'Accepted tokens for this payment link',
    type: [TokenMetadataDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenMetadataDto)
  acceptedTokens?: TokenMetadataDto[];

  @ApiProperty({
    description: 'Accepted chains for this payment link',
    type: [ChainMetadataDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChainMetadataDto)
  acceptedChains?: ChainMetadataDto[];
}

export class PaymentLinkRecordDto {
  @ApiProperty({
    description: 'The address of the payer',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(mt|mm)[a-zA-Z0-9]+$/, {
    message: 'payer must be a valid address starting with mt or mm',
  })
  @MinLength(3, { message: 'payer address is too short' })
  payer: string;

  @ApiProperty({
    description: 'Transaction ID',
    example: '0x123...',
    required: false,
  })
  @IsOptional()
  @IsString()
  txid?: string;

  @ApiProperty({
    description: 'Token used for payment',
    type: TokenMetadataDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TokenMetadataDto)
  token?: TokenMetadataDto;

  @ApiProperty({
    description: 'Chain used for payment',
    type: ChainMetadataDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ChainMetadataDto)
  chain?: ChainMetadataDto;
}

export class PaymentLinkOrderDto {
  @ApiProperty({
    description: 'Array of payment link IDs in the desired order',
    example: [1, 3, 2, 4],
    type: [Number],
  })
  @IsArray()
  @IsNotEmpty()
  @IsNumber({}, { each: true })
  linkIds: number[];
}

export class DeletePaymentLinksDto {
  @ApiProperty({
    description:
      'Array of payment link codes to delete (use single item array for single deletion)',
    example: ['ABC123', 'DEF456', 'GHI789'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  @Matches(/^[A-Z0-9]+$/, {
    each: true,
    message: 'Each code must be alphanumeric uppercase',
  })
  codes: string[];
}
