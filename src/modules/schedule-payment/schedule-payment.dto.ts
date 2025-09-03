import {
  IsString,
  IsEnum,
  IsNotEmpty,
  Matches,
  MinLength,
  IsArray,
  ValidateNested,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetDto } from '../transactions/transaction.dto';
import {
  SchedulePaymentFrequencyEnum,
  SchedulePaymentStatusEnum,
} from '@prisma/client';

export class CreateSchedulePaymentDto {
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

  @ApiProperty({ description: 'The amount of the payment', example: '1000' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, {
    message: 'amount must be a valid positive number',
  })
  amount: string;

  @ApiProperty({
    description: 'The tokens of the payment',
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

  @ApiPropertyOptional({
    description: 'The message for the payment',
    example: 'Monthly rent payment',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({
    description: 'The frequency of the scheduled payment',
    enum: SchedulePaymentFrequencyEnum,
    example: SchedulePaymentFrequencyEnum.MONTHLY,
  })
  @IsEnum(SchedulePaymentFrequencyEnum)
  frequency: SchedulePaymentFrequencyEnum;

  @ApiPropertyOptional({
    description: 'The end date of the scheduled payment',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'The next execution date of the scheduled payment',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  nextExecutionDate: string;

  @ApiPropertyOptional({
    description: 'Maximum number of executions (null for unlimited)',
    example: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value === null ? null : parseInt(value)))
  maxExecutions?: number;

  @ApiPropertyOptional({
    description: 'The transaction ids of the scheduled payment',
    example: [123, 456, 789],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  transactionIds?: number[];
}

export class UpdateSchedulePaymentDto {
  @ApiPropertyOptional({
    description: 'The status of the scheduled payment',
    enum: SchedulePaymentStatusEnum,
  })
  @IsOptional()
  @IsEnum(SchedulePaymentStatusEnum)
  status?: SchedulePaymentStatusEnum;

  @ApiPropertyOptional({
    description: 'The frequency of the scheduled payment',
    enum: SchedulePaymentFrequencyEnum,
  })
  @IsOptional()
  @IsEnum(SchedulePaymentFrequencyEnum)
  frequency?: SchedulePaymentFrequencyEnum;

  @ApiPropertyOptional({
    description: 'The end date of the scheduled payment',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'The next execution date of the scheduled payment',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  nextExecutionDate?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of executions (null for unlimited)',
    example: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value === null ? null : parseInt(value)))
  maxExecutions?: number;
}

export class SchedulePaymentQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: SchedulePaymentStatusEnum,
  })
  @IsOptional()
  @IsEnum(SchedulePaymentStatusEnum)
  status?: SchedulePaymentStatusEnum;

  @ApiPropertyOptional({
    description: 'Filter by payer address',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
  })
  @IsOptional()
  @IsString()
  payer?: string;

  @ApiPropertyOptional({
    description: 'Filter by payee address',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
  })
  @IsOptional()
  @IsString()
  payee?: string;
}
