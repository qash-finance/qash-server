import {
  IsString,
  IsEnum,
  IsNotEmpty,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { RequestPaymentStatus } from './request-payment.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRequestPaymentDto {
  @ApiProperty({
    description: 'The address of the payer',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[0-9a-fA-F]+$/, {
    message: 'payer must be a valid hex address starting with 0x',
  })
  @MinLength(3, { message: 'payer address is too short' })
  payer: string;

  @ApiProperty({
    description: 'The address of the payee',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[0-9a-fA-F]+$/, {
    message: 'payee must be a valid hex address starting with 0x',
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
    description: 'The token of the request',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[0-9a-fA-F]+$/, {
    message: 'token must be a valid hex address starting with 0x',
  })
  @MinLength(3, { message: 'token address is too short' })
  token: string;

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
