import {
  IsString,
  IsNotEmpty,
  IsArray,
  Matches,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AssetDto } from '../transactions/transaction.dto';
import { Type } from 'class-transformer';

export class CreateGiftDto {
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

  @ApiProperty({ description: 'Serial number', example: [1, 2, 3, 4] })
  @IsArray()
  @ArrayMinSize(4, { message: 'serialNumber must contain exactly 4 elements' })
  @ArrayMaxSize(4, { message: 'serialNumber must contain exactly 4 elements' })
  serialNumber: string[];

  @ApiProperty({ description: 'Secret number', example: '1234' })
  @IsString()
  @IsNotEmpty()
  secretNumber: string;

  @ApiProperty({ description: 'Transaction ID', example: '1234' })
  @IsString()
  txId: string;
}

export class ClaimGiftDto {
  @ApiProperty({ description: 'Recipient address' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[0-9a-fA-F]+$/, {
    message: 'recipientAddress must be a valid hex address starting with 0x',
  })
  @MinLength(3, { message: 'recipientAddress is too short' })
  recipientAddress: string;
}

export class RecallGiftDto {
  @ApiProperty({ description: 'Sender address' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[0-9a-fA-F]+$/, {
    message: 'senderAddress must be a valid hex address starting with 0x',
  })
  @MinLength(3, { message: 'senderAddress is too short' })
  senderAddress: string;
}
