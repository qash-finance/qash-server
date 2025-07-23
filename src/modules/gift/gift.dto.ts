import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsArray,
  Matches,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGiftDto {
  @ApiProperty({
    description: 'Token address or symbol',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[0-9a-fA-F]+$/, {
    message: 'token must be a valid hex address starting with 0x',
  })
  @MinLength(3, { message: 'token is too short' })
  token: string;

  @ApiProperty({ description: 'Amount', example: '1000' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d+)?$/, {
    message: 'amount must be a valid positive number',
  })
  amount: string;

  @ApiProperty({ description: 'Serial number', example: [1, 2, 3, 4] })
  @IsArray()
  @ArrayMinSize(4, { message: 'serialNumber must contain exactly 4 elements' })
  @ArrayMaxSize(4, { message: 'serialNumber must contain exactly 4 elements' })
  @IsNumber(
    {},
    { each: true, message: 'Each element in serialNumber must be a number' },
  )
  serialNumber: number[];
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
