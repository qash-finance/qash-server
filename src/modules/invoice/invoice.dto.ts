import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  IsEmail,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { InvoiceStatusEnum } from 'src/database/generated/client';
import { Currency } from 'src/common/constants/currency';

export class InvoiceItemDto {
  @ApiProperty({
    description: 'Description of the invoice item',
    example: 'Software Development Services - December 2024',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Quantity of the item (as string for precision)',
    example: '1',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      'Quantity must be a valid positive number with up to 8 decimal places',
  })
  quantity: string;

  @ApiProperty({
    description: 'Price per unit (as string for precision)',
    example: '5000.00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      'Price must be a valid positive number with up to 8 decimal places',
  })
  unitPrice: string;

  @ApiPropertyOptional({
    description: 'Unit of measurement',
    example: 'hours',
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    description: 'Tax rate as percentage (as string)',
    example: '10.00',
    default: '0.00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Tax rate must be a valid number with up to 2 decimal places',
  })
  taxRate?: string;

  @ApiPropertyOptional({
    description: 'Discount amount (as string for precision)',
    example: '0.00',
    default: '0.00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      'Discount must be a valid positive number with up to 8 decimal places',
  })
  discount?: string;

  @ApiPropertyOptional({
    description: 'Total amount for this item (auto-calculated if not provided)',
    example: '5000.00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      'Total must be a valid positive number with up to 8 decimal places',
  })
  total?: string;

  @ApiPropertyOptional({
    description: 'Display order',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata for the item',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateInvoiceItemDto extends InvoiceItemDto {
  // Inherits all fields from InvoiceItemDto
}

export class UpdateInvoiceItemDto {
  @ApiPropertyOptional({
    description: 'Description of the invoice item',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({
    description: 'Quantity of the item (as string for precision)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      'Quantity must be a valid positive number with up to 8 decimal places',
  })
  quantity?: string;

  @ApiPropertyOptional({
    description: 'Price per unit (as string for precision)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      'Price must be a valid positive number with up to 8 decimal places',
  })
  unitPrice?: string;

  @ApiPropertyOptional({
    description: 'Unit of measurement',
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    description: 'Tax rate as percentage (as string)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Tax rate must be a valid number with up to 2 decimal places',
  })
  taxRate?: string;

  @ApiPropertyOptional({
    description: 'Discount amount (as string for precision)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      'Discount must be a valid positive number with up to 8 decimal places',
  })
  discount?: string;

  @ApiPropertyOptional({
    description: 'Display order',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata for the item',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ReorderInvoiceItemsDto {
  @ApiProperty({
    description: 'Array of item ID and order pairs',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        order: { type: 'number' },
      },
    },
    example: [
      { id: 1, order: 0 },
      { id: 2, order: 1 },
      { id: 3, order: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemOrderDto)
  itemOrders: ItemOrderDto[];
}

export class ItemOrderDto {
  @ApiProperty({ description: 'Invoice item ID', example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ description: 'New order position', example: 0 })
  @IsNumber()
  @Min(0)
  order: number;
}

export class FromDetailsDto {
  @ApiProperty({
    description: 'Employee name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Employee email',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Employee company name',
    example: 'Freelance Developer',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Employee address line 1',
    example: '123 Main Street',
  })
  @IsOptional()
  @IsString()
  address1?: string;

  @ApiPropertyOptional({
    description: 'Employee address line 2',
    example: 'Apt 4B',
  })
  @IsOptional()
  @IsString()
  address2?: string;

  @ApiPropertyOptional({
    description: 'Employee city',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Employee country',
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Employee postal code',
    example: '10001',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({
    description: 'Employee wallet address',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({
    description: 'Payment network details',
  })
  @IsObject()
  network: Record<string, any>;

  @ApiProperty({
    description: 'Payment token details',
  })
  @IsObject()
  token: Record<string, any>;
}

export class BillToDetailsDto {
  @ApiProperty({
    description: 'Company name',
    example: 'Acme Corporation',
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({
    description: 'Contact person name',
    example: 'Jane Smith',
  })
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @ApiProperty({
    description: 'Contact email',
    example: 'jane.smith@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Company address line 1',
    example: '456 Business Ave',
  })
  @IsString()
  @IsNotEmpty()
  address1: string;

  @ApiPropertyOptional({
    description: 'Company address line 2',
    example: 'Suite 100',
  })
  @IsOptional()
  @IsString()
  address2?: string;

  @ApiProperty({
    description: 'Company city',
    example: 'San Francisco',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'Company country',
    example: 'United States',
  })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({
    description: 'Company postal code',
    example: '94105',
  })
  @IsString()
  @IsNotEmpty()
  postalCode: string;
}

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Currency of the invoice',
    example: 'USD',
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({
    description: 'Payroll ID this invoice is for',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  payrollId: number;

  @ApiProperty({
    description: 'Invoice due date',
    example: '2024-01-31T23:59:59Z',
  })
  @IsDateString()
  dueDate: string;

  @ApiProperty({
    description: 'Employee details (from)',
    type: FromDetailsDto,
  })
  @ValidateNested()
  @Type(() => FromDetailsDto)
  fromDetails: FromDetailsDto;

  @ApiProperty({
    description: 'Company details (bill to)',
    type: BillToDetailsDto,
  })
  @ValidateNested()
  @Type(() => BillToDetailsDto)
  billToDetails: BillToDetailsDto;

  @ApiProperty({
    description: 'Invoice items',
    type: [InvoiceItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ApiProperty({
    description: 'Subtotal amount (as string for precision)',
    example: '5000.00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      'Subtotal must be a valid positive number with up to 8 decimal places',
  })
  subtotal: string;

  @ApiProperty({
    description: 'Tax rate as percentage (as string for precision)',
    example: '10.00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Tax rate must be a valid percentage with up to 2 decimal places',
  })
  taxRate: string;

  @ApiProperty({
    description: 'Tax amount (as string for precision)',
    example: '500.00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      'Tax amount must be a valid positive number with up to 8 decimal places',
  })
  taxAmount: string;

  @ApiProperty({
    description: 'Total amount (as string for precision)',
    example: '5500.00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      'Total must be a valid positive number with up to 8 decimal places',
  })
  total: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({
    description: 'Employee details (from)',
    type: FromDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FromDetailsDto)
  fromDetails?: FromDetailsDto;

  @ApiPropertyOptional({
    description: 'Invoice items',
    type: [InvoiceItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items?: InvoiceItemDto[];

  @ApiPropertyOptional({
    description: 'Subtotal amount (as string for precision)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      'Subtotal must be a valid positive number with up to 8 decimal places',
  })
  subtotal?: string;

  @ApiPropertyOptional({
    description: 'Tax rate as percentage (as string for precision)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Tax rate must be a valid percentage with up to 2 decimal places',
  })
  taxRate?: string;

  @ApiPropertyOptional({
    description: 'Tax amount (as string for precision)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      'Tax amount must be a valid positive number with up to 8 decimal places',
  })
  taxAmount?: string;

  @ApiPropertyOptional({
    description: 'Total amount (as string for precision)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      'Total must be a valid positive number with up to 8 decimal places',
  })
  total?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class InvoiceQueryDto {
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
    enum: InvoiceStatusEnum,
  })
  @IsOptional()
  @IsEnum(InvoiceStatusEnum)
  status?: InvoiceStatusEnum;

  @ApiPropertyOptional({
    description: 'Filter by payroll ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  payrollId?: number;

  @ApiPropertyOptional({
    description: 'Search by invoice number or employee name',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class InvoiceStatsDto {
  @ApiProperty({
    description: 'Total number of draft invoices',
    example: 5,
  })
  totalDraft: number;

  @ApiProperty({
    description: 'Total number of sent invoices',
    example: 15,
  })
  totalSent: number;

  @ApiProperty({
    description: 'Total number of reviewed invoices',
    example: 8,
  })
  totalReviewed: number;

  @ApiProperty({
    description: 'Total number of confirmed invoices',
    example: 12,
  })
  totalConfirmed: number;

  @ApiProperty({
    description: 'Total amount of all invoices',
    example: '125000.00',
  })
  totalAmount: string;

  @ApiProperty({
    description: 'Number of invoices due this month',
    example: 10,
  })
  dueThisMonth: number;
}

export class CreateInvoiceScheduleDto {
  @ApiProperty({
    description: 'Frequency of invoice generation',
    enum: ['MONTHLY', 'WEEKLY', 'BIWEEKLY', 'QUARTERLY'],
    example: 'MONTHLY',
  })
  @IsString()
  @IsNotEmpty()
  frequency: string;

  @ApiPropertyOptional({
    description: 'Day of month to generate (1-31), for MONTHLY frequency',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    description:
      'Day of week to generate (0-6, Sunday=0), for WEEKLY frequency',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiProperty({
    description: 'Number of days before due date to generate invoice',
    example: 7,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  generateDaysBefore: number;

  @ApiPropertyOptional({
    description: 'Invoice template settings',
  })
  @IsOptional()
  @IsObject()
  invoiceTemplate?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateInvoiceScheduleDto {
  @ApiPropertyOptional({
    description: 'Frequency of invoice generation',
    enum: ['MONTHLY', 'WEEKLY', 'BIWEEKLY', 'QUARTERLY'],
  })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional({
    description: 'Day of month to generate (1-31)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'Day of week to generate (0-6, Sunday=0)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    description: 'Number of days before due date to generate invoice',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  generateDaysBefore?: number;

  @ApiPropertyOptional({
    description: 'Whether the schedule is active',
  })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Invoice template settings',
  })
  @IsOptional()
  @IsObject()
  invoiceTemplate?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class InvoiceScheduleResponseDto {
  @ApiProperty({ description: 'Schedule ID' })
  id: number;

  @ApiProperty({ description: 'Schedule UUID' })
  uuid: string;

  @ApiProperty({ description: 'Payroll ID' })
  payrollId: number;

  @ApiProperty({ description: 'Frequency' })
  frequency: string;

  @ApiPropertyOptional({ description: 'Day of month' })
  dayOfMonth?: number;

  @ApiPropertyOptional({ description: 'Day of week' })
  dayOfWeek?: number;

  @ApiProperty({ description: 'Days before due date to generate' })
  generateDaysBefore: number;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Next generate date' })
  nextGenerateDate?: Date;

  @ApiPropertyOptional({ description: 'Last generated at' })
  lastGeneratedAt?: Date;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}
