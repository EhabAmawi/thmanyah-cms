import { ApiProperty } from '@nestjs/swagger';
import { Language, MediaType, SourceType } from '@prisma/client';

export class ImportedContentDto {
  @ApiProperty({
    description: 'The ID of the imported program',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The name of the imported content',
    example: 'Introduction to Programming',
  })
  name: string;

  @ApiProperty({
    description: 'Description of the content',
    example: 'A comprehensive programming course for beginners',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Content language',
    enum: Language,
    example: Language.ENGLISH,
  })
  language: Language;

  @ApiProperty({
    description: 'Duration in seconds',
    example: 3600,
  })
  durationSec: number;

  @ApiProperty({
    description: 'Release date of the content',
    example: '2024-01-01T00:00:00.000Z',
  })
  releaseDate: Date;

  @ApiProperty({
    description: 'URL to the media content',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  mediaUrl: string;

  @ApiProperty({
    description: 'Type of media content',
    enum: MediaType,
    example: MediaType.VIDEO,
  })
  mediaType: MediaType;

  @ApiProperty({
    description: 'Source platform type',
    enum: SourceType,
    example: SourceType.YOUTUBE,
  })
  sourceType: SourceType;

  @ApiProperty({
    description: 'Original source URL',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  sourceUrl: string;

  @ApiProperty({
    description: 'External platform ID',
    example: 'dQw4w9WgXcQ',
  })
  externalId: string;
}

export class ImportResultDto {
  @ApiProperty({
    description: 'Whether the import operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Number of items successfully imported',
    example: 5,
  })
  importedCount: number;

  @ApiProperty({
    description: 'Number of duplicate items that were skipped',
    example: 2,
  })
  duplicatesSkipped: number;

  @ApiProperty({
    description: 'List of successfully imported content',
    type: [ImportedContentDto],
  })
  imported: ImportedContentDto[];

  @ApiProperty({
    description: 'List of error messages encountered during import',
    example: ['Failed to fetch metadata for video ID: xyz123'],
    type: [String],
  })
  errors: string[];

  @ApiProperty({
    description: 'Summary message of the import operation',
    example: 'Successfully imported 5 items, skipped 2 duplicates',
  })
  message: string;
}
