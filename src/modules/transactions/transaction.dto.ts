import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  Matches,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { NoteType } from '../../common/enums/note';

export type FaucetMetadata = {
  symbol: string;
  decimals: number;
  maxSupply: number;
};

export class AssetDto {
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

export class SendTransactionDto {
  @ApiProperty({ example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a' })
  @IsString()
  @MinLength(3, { message: 'recipient address is too short' })
  recipient: string;

  @ApiProperty({
    example: [
      {
        faucetId: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
        amount: '1000',
        metadata: {
          symbol: 'MTST',
          decimals: 18,
          maxSupply: 1000000000000000000,
        },
      },
    ],
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one asset is required' })
  @ArrayMaxSize(10, { message: 'Maximum 10 assets allowed' })
  @ValidateNested({ each: true })
  @Type(() => AssetDto)
  assets: AssetDto[];

  @ApiProperty({ example: true })
  @IsBoolean()
  private: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  recallable: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  recallableTime: Date;

  @IsOptional()
  @IsNumber()
  recallableHeight: number;

  @ApiProperty({ example: ['1', '2', '3', '4'] })
  @IsArray()
  @ArrayMinSize(4, { message: 'serialNumber must contain exactly 4 elements' })
  @ArrayMaxSize(4, { message: 'serialNumber must contain exactly 4 elements' })
  serialNumber: string[];

  @ApiProperty({ example: NoteType.P2ID })
  @IsEnum(NoteType)
  noteType: NoteType;

  @IsString()
  noteId: string;

  @IsString()
  transactionId: string;
}

export class RecallItem {
  @IsIn(['transaction', 'gift'])
  type: 'transaction' | 'gift';

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'id must be a positive number' })
  id: number;
}

export class RecallRequestDto {
  @ApiProperty({
    example: [
      { type: 'transaction', id: 1 },
      { type: 'gift', id: 1 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item is required' })
  @ArrayMaxSize(50, { message: 'Maximum 50 items allowed' })
  @ValidateNested({ each: true })
  @Type(() => RecallItem)
  items: RecallItem[];

  @IsString()
  txId: string;
}

export class ConsumePublicTransactionDto {
  @IsString()
  sender: string;

  @IsString()
  recipient: string;

  @IsNumber()
  amount: number;

  @IsString()
  tokenId: string;

  @IsString()
  tokenName: string;

  @IsNumber()
  txId: string;
}
