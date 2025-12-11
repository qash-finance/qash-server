import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'OTP code (6 digits)',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: 'OTP must be a string' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'User information',
  })
  user: {
    id: number;
    email: string;
    isActive: boolean;
    createdAt: Date;
    lastLogin: Date | null;
  };
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'OTP sent successfully',
  })
  message: string;
}

export class CompanyInfoDto {
  @ApiProperty({ description: 'Company ID', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Company UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  uuid: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Acme Corporation Ltd.',
  })
  companyName: string;

  @ApiProperty({
    description: 'Registration number',
    example: 'REG123456789',
  })
  registrationNumber: string;

  @ApiProperty({
    description: 'Company type',
    example: 'CORPORATION',
  })
  companyType: string;

  @ApiPropertyOptional({ description: 'Tax ID', example: 'TAX123456' })
  taxId?: string | null;

  @ApiPropertyOptional({
    description: 'Notification email',
    example: 'notifications@company.com',
  })
  notificationEmail?: string | null;

  @ApiProperty({ description: 'Country', example: 'United States' })
  country: string;

  @ApiProperty({ description: 'Address line 1', example: '123 Business St' })
  address1: string;

  @ApiPropertyOptional({ description: 'Address line 2', example: 'Suite 456' })
  address2?: string | null;

  @ApiProperty({ description: 'City', example: 'New York' })
  city: string;

  @ApiProperty({ description: 'Postal code', example: '10001' })
  postalCode: string;

  @ApiProperty({
    description: 'Verification status',
    example: 'VERIFIED',
  })
  verificationStatus: string;

  @ApiProperty({ description: 'Is company active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: any;
}

export class TeamMembershipInfoDto {
  @ApiProperty({ description: 'Team member ID', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Team member UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  uuid: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName: string;

  @ApiPropertyOptional({ description: 'Position', example: 'CEO' })
  position?: string | null;

  @ApiPropertyOptional({
    description: 'Profile picture URL',
    example: 'https://example.com/profile.jpg',
  })
  profilePicture?: string | null;

  @ApiProperty({
    description: 'Team member role',
    example: 'OWNER',
  })
  role: string;

  @ApiProperty({ description: 'Is team member active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Company ID', example: 1 })
  companyId: number;

  @ApiPropertyOptional({ description: 'Join date' })
  joinedAt?: Date | null;

  @ApiProperty({
    description: 'Company information',
    type: CompanyInfoDto,
  })
  company: CompanyInfoDto;
}

export class UserMeResponseDto {
  @ApiProperty({ description: 'User ID', example: 1 })
  id: number;

  @ApiProperty({
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  uuid: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User role',
    enum: ['USER', 'ADMIN'],
    example: 'USER',
  })
  role: string;

  @ApiProperty({ description: 'Is user active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Last login timestamp' })
  lastLogin?: Date | null;

  @ApiPropertyOptional({
    description: 'Team member information',
    type: TeamMembershipInfoDto,
  })
  teamMembership?: TeamMembershipInfoDto | null;
}
