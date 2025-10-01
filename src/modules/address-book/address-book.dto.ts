import { ApiProperty } from '@nestjs/swagger';
import { CategoryShapeEnum } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsEmail,
  IsObject,
} from 'class-validator';

export class AddressBookDto {
  @ApiProperty({
    description: 'The category of the address book entry',
    example: 'Company',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'category cannot be longer than 50 characters' })
  @Matches(/^[a-zA-Z0-9\s\-]+$/, {
    message: 'category can only contain letters, numbers, spaces, and hyphens',
  })
  category: string;

  @ApiProperty({
    description: 'The name of the address book entry',
    example: 'JuPENG',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'name cannot be longer than 100 characters' })
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message:
      'name can only contain letters, numbers, spaces, hyphens, and underscores',
  })
  name: string;

  @ApiProperty({
    description: 'The address of the address book entry',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'address is too short' })
  address: string;

  @ApiProperty({
    description: 'The email of the address book entry',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(255, { message: 'email cannot be longer than 255 characters' })
  email?: string;

  @ApiProperty({
    description: 'The token information of the address book entry',
    example: { address: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a', symbol: 'USDC' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  token?: any;
}

export class CategoryDto {
  @ApiProperty({
    description: 'The name of the category',
    example: 'Company',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'name cannot be longer than 100 characters' })
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message:
      'name can only contain letters, numbers, spaces, hyphens, and underscores',
  })
  name: string;

  @ApiProperty({
    description: 'The shape of the category',
    example: 'CIRCLE',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(CategoryShapeEnum)
  shape: CategoryShapeEnum;

  @ApiProperty({
    description: 'The color of the category',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'color cannot be longer than 50 characters' })
  @Matches(/^#([0-9a-fA-F]{6})$/, {
    message: 'color must be a valid hex color',
  })
  color: string;
}

export class AddressBookNameDuplicateDto {
  @ApiProperty({
    description: 'The name of the address book entry',
    example: 'JuPENG',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'name cannot be longer than 100 characters' })
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message:
      'name can only contain letters, numbers, spaces, hyphens, and underscores',
  })
  name: string;

  @ApiProperty({
    description: 'The category of the address book entry',
    example: 'Company',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'category cannot be longer than 50 characters' })
  @Matches(/^[a-zA-Z0-9\s\-]+$/, {
    message: 'category can only contain letters, numbers, spaces, and hyphens',
  })
  category: string;

  @ApiProperty({
    description: 'The address of the user',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'userAddress is too short' })
  userAddress: string;
}

export class CategoryOrderDto {
  @ApiProperty({
    description: 'Array of category IDs in the desired order',
    example: [1, 3, 2, 4],
    type: [Number],
  })
  @IsNotEmpty()
  categoryIds: number[];
}
