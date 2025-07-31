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
import {
  NotificationType,
  NotificationStatus,
} from '../../common/enums/notification';

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public message: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  public type: NotificationType;

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
  @ApiProperty({ enum: NotificationStatus })
  @IsEnum(NotificationStatus)
  public status: NotificationStatus;
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

  @ApiPropertyOptional({ enum: NotificationType })
  @IsEnum(NotificationType)
  @IsOptional()
  public type?: NotificationType;

  @ApiPropertyOptional({ enum: NotificationStatus })
  @IsEnum(NotificationStatus)
  @IsOptional()
  public status?: NotificationStatus;
}

export class NotificationResponseDto {
  @ApiProperty()
  public id: number;

  @ApiProperty()
  public title: string;

  @ApiProperty()
  public message: string;

  @ApiProperty({ enum: NotificationType })
  public type: NotificationType;

  @ApiProperty({ enum: NotificationStatus })
  public status: NotificationStatus;

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
