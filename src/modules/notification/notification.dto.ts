import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { notifications_status_enum, notifications_type_enum } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public message: string;

  @ApiProperty({ enum: notifications_type_enum })
  @IsEnum(notifications_type_enum)
  public type: notifications_type_enum;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  public metadata?: Record<string, any> | null;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  public actionUrl?: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public walletAddress: string;
}

export class UpdateNotificationStatusDto {
  @ApiProperty({ enum: notifications_status_enum })
  @IsEnum(notifications_status_enum)
  public status: notifications_status_enum;
}

export class NotificationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  public page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  public limit?: number = 10;

  @ApiPropertyOptional({ enum: notifications_type_enum })
  @IsEnum(notifications_type_enum)
  @IsOptional()
  public type?: notifications_type_enum;

  @ApiPropertyOptional({ enum: notifications_status_enum })
  @IsEnum(notifications_status_enum)
  @IsOptional()
  public status?: notifications_status_enum;
}

export class NotificationResponseDto {
  @ApiProperty()
  public id: number;

  @ApiProperty()
  public title: string;

  @ApiProperty()
  public message: string;

  @ApiProperty({ enum: notifications_type_enum })
  public type: notifications_type_enum;

  @ApiProperty({ enum: notifications_status_enum })
  public status: notifications_status_enum;

  @ApiPropertyOptional()
  public metadata: Record<string, any> | null;

  @ApiPropertyOptional()
  public actionUrl: string | null;

  @ApiProperty()
  public walletAddress: string;

  @ApiProperty()
  public createdAt: Date;

  @ApiProperty()
  public updatedAt: Date;

  @ApiPropertyOptional()
  public readAt: Date | null;
}
