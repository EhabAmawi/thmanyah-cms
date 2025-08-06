import { ApiProperty } from '@nestjs/swagger';
import { Language, MediaType, Status } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  IsUrl,
  IsNotEmpty,
  Min,
} from 'class-validator';

export class CreateProgramDto {
  @ApiProperty({
    example: 'Introduction to Programming',
    description: 'The name of the program',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'A comprehensive introduction to programming concepts',
    description: 'The description of the program',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: Language,
    example: Language.ENGLISH,
    description: 'The language of the program',
    required: false,
    default: Language.ENGLISH,
  })
  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  @ApiProperty({
    example: 3600,
    description: 'Duration of the program in seconds',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  durationSec: number;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'The release date of the program',
  })
  @IsDateString()
  releaseDate: string;

  @ApiProperty({
    example: 'https://example.com/media/program1.mp4',
    description: 'URL to the program media',
  })
  @IsUrl()
  @IsNotEmpty()
  mediaUrl: string;

  @ApiProperty({
    enum: MediaType,
    example: MediaType.VIDEO,
    description: 'The type of media for the program',
    required: false,
    default: MediaType.VIDEO,
  })
  @IsEnum(MediaType)
  @IsOptional()
  mediaType?: MediaType;

  @ApiProperty({
    enum: Status,
    example: Status.DRAFT,
    description: 'The status of the program',
    required: false,
    default: Status.DRAFT,
  })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @ApiProperty({
    example: 1,
    description: 'The ID of the category this program belongs to',
  })
  @IsInt()
  @Min(1)
  categoryId: number;
}
