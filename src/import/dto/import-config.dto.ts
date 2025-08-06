import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { SourceType } from '@prisma/client';

export class ImportVideoDto {
  @ApiProperty({
    description: 'The URL of the video to import',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  @IsString()
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: 'Optional category ID to assign to the imported video',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class ImportChannelDto {
  @ApiProperty({
    description: 'The channel ID to import videos from',
    example: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  })
  @IsString()
  channelId: string;

  @ApiPropertyOptional({
    description: 'Maximum number of videos to import',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Optional category ID to assign to imported videos',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class ImportBySourceTypeDto {
  @ApiProperty({
    description: 'The source type to import from',
    enum: SourceType,
    example: SourceType.YOUTUBE,
  })
  @IsEnum(SourceType)
  sourceType: SourceType;

  @ApiProperty({
    description: 'The URL or identifier for the content to import',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  @IsString()
  url: string;

  @ApiPropertyOptional({
    description: 'Optional category ID to assign to imported content',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of items to import (for channels/playlists)',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
