import {
  IsString,
  IsEnum,
  IsNotEmpty,
  Matches,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequestPaymentStatus } from './request-payment.entity';
import { ApiProperty } from '@nestjs/swagger';
import { AssetDto } from '../transactions/transaction.dto';

export class CreateRequestPaymentDto {
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
    description: 'The address of the payee',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(mt|mm)[a-zA-Z0-9]+$/, {
    message: 'payee must be a valid address starting with mt or mm',
  })
  @MinLength(3, { message: 'payee address is too short' })
  payee: string;

  @ApiProperty({ description: 'The amount of the request', example: '1000' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, {
    message: 'amount must be a valid positive number',
  })
  amount: string;

  @ApiProperty({
    description: 'The tokens of the request',
    example: [
      {
        faucetId: '1',
        amount: '1000',
        metadata: {
          symbol: 'MTST',
          decimals: 18,
          maxSupply: 1000000000000000000,
        },
      },
    ],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetDto)
  tokens: AssetDto[];

  @ApiProperty({
    description: 'The message of the request',
    example: 'Please send me the money',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500, { message: 'message cannot be longer than 500 characters' })
  message: string;
}

export class UpdateRequestPaymentStatusDto {
  @IsEnum(RequestPaymentStatus)
  status: RequestPaymentStatus;
}
