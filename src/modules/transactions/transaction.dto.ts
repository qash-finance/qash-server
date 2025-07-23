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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { NoteType } from 'src/common/enums/note';

export class AssetDto {
  @ApiProperty({
    description: 'Faucet ID (token address)',
    example: '0x09bcfc41564f0420000864bbc261d4',
  })
  @IsString()
  @Matches(/^0x[0-9a-fA-F]+$/, {
    message: 'faucetId must be a valid hex address starting with 0x',
  })
  @MinLength(3, { message: 'faucetId is too short' })
  faucetId: string;

  @ApiProperty({ description: 'Amount', example: '1000' })
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, {
    message: 'amount must be a valid positive number',
  })
  amount: string;
}

export class SendTransactionDto {
  @ApiProperty({ example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a' })
  @IsString()
  @Matches(/^0x[0-9a-fA-F]+$/, {
    message: 'recipient must be a valid hex address starting with 0x',
  })
  @MinLength(3, { message: 'recipient address is too short' })
  recipient: string;

  @ApiProperty({
    example: [{ faucetId: '0x09bcfc41564f0420000864bbc261d4', amount: '1000' }],
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
  recallableTime?: Date;

  @ApiProperty({ example: [1, 2, 3, 4] })
  @IsArray()
  @ArrayMinSize(4, { message: 'serialNumber must contain exactly 4 elements' })
  @ArrayMaxSize(4, { message: 'serialNumber must contain exactly 4 elements' })
  @IsNumber(
    {},
    { each: true, message: 'Each element in serialNumber must be a number' },
  )
  serialNumber: number[];

  @ApiProperty({ example: NoteType.P2ID })
  @IsEnum(NoteType)
  noteType: NoteType;
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
}
