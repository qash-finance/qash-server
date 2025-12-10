import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillStatusEnum } from 'src/database/generated/client';

export class BillQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: BillStatusEnum,
  })
  @IsOptional()
  @IsEnum(BillStatusEnum)
  status?: BillStatusEnum;

  @ApiPropertyOptional({
    description: 'Filter by group ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  groupId?: number;

  @ApiPropertyOptional({
    description: 'Search by invoice number or employee name',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class BillStatsDto {
  @ApiProperty({
    description: 'Total number of bills',
    example: 50,
  })
  totalBills: number;

  @ApiProperty({
    description: 'Total number of pending bills',
    example: 15,
  })
  totalPending: number;

  @ApiProperty({
    description: 'Total number of paid bills',
    example: 30,
  })
  totalPaid: number;

  @ApiProperty({
    description: 'Total number of overdue bills',
    example: 5,
  })
  totalOverdue: number;

  @ApiProperty({
    description: 'Total amount of all bills',
    example: '125000.00',
  })
  totalAmount: string;

  @ApiProperty({
    description: 'Total amount of pending bills',
    example: '45000.00',
  })
  pendingAmount: string;

  @ApiProperty({
    description: 'Total amount of paid bills',
    example: '75000.00',
  })
  paidAmount: string;

  @ApiProperty({
    description: 'Total amount of overdue bills',
    example: '5000.00',
  })
  overdueAmount: string;
}

export class PayBillsDto {
  @ApiProperty({
    description: 'Array of bill IDs to pay',
    example: [1, 2, 3],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  billIds: number[];

  @ApiProperty({
    description: 'Transaction hash from the blockchain payment',
    example: '0x1234567890abcdef...',
  })
  @IsString()
  @IsNotEmpty()
  transactionHash: string;

  @ApiPropertyOptional({
    description: 'Additional metadata about the payment',
    example: {
      network: 'ethereum',
      gasUsed: '21000',
      gasPrice: '20000000000',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BillTimelineDto {
  @ApiProperty({
    description: 'Timeline event type',
    example: 'created',
  })
  event: string;

  @ApiProperty({
    description: 'Event timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Event description',
    example: 'Invoice was created',
  })
  description: string;

  @ApiPropertyOptional({
    description: 'Additional event metadata',
  })
  metadata?: Record<string, any>;
}

export class BillDetailsDto {
  @ApiProperty({
    description: 'Bill ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Invoice number',
    example: 'INV-202401-1-0001',
  })
  invoiceNumber: string;

  @ApiProperty({
    description: 'Employee name',
    example: 'John Doe',
  })
  employeeName: string;

  @ApiProperty({
    description: 'Employee email',
    example: 'john.doe@example.com',
  })
  employeeEmail: string;

  @ApiProperty({
    description: 'Employee group name',
    example: 'Engineering',
  })
  groupName: string;

  @ApiProperty({
    description: 'Bill amount',
    example: '5000.00',
  })
  amount: string;

  @ApiProperty({
    description: 'Due date',
    example: '2024-02-15T23:59:59Z',
  })
  dueDate: Date;

  @ApiProperty({
    description: 'Bill status',
    enum: BillStatusEnum,
    example: BillStatusEnum.PENDING,
  })
  status: BillStatusEnum;

  @ApiProperty({
    description: 'Timeline of events',
    type: [BillTimelineDto],
  })
  timeline: BillTimelineDto[];

  @ApiPropertyOptional({
    description: 'Payment date',
    example: '2024-02-10T14:30:00Z',
  })
  paidAt?: Date;

  @ApiPropertyOptional({
    description: 'Transaction hash',
    example: '0x1234567890abcdef...',
  })
  transactionHash?: string;

  @ApiProperty({
    description: 'Full invoice details',
  })
  invoice: any;
}

export class BatchPaymentResultDto {
  @ApiProperty({
    description: 'Number of bills successfully paid',
    example: 3,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of bills that failed to pay',
    example: 0,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Array of successfully paid bill IDs',
    example: [1, 2, 3],
  })
  successfulBills: number[];

  @ApiProperty({
    description: 'Array of failed bill IDs with error messages',
    example: [],
  })
  failedBills: Array<{
    billId: number;
    error: string;
  }>;

  @ApiProperty({
    description: 'Transaction hash',
    example: '0x1234567890abcdef...',
  })
  transactionHash: string;

  @ApiProperty({
    description: 'Total amount paid',
    example: '15000.00',
  })
  totalAmount: string;
}
