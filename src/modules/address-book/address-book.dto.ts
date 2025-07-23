import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
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
    description: 'The token address of the address book entry',
    example: 'mtst1qzxh4e7uwlu5xyrnms9d5tfm7v2y7u6a',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'token is too short' })
  token?: string;
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
