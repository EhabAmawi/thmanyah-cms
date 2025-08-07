import { ApiProperty } from '@nestjs/swagger';
import { Language, MediaType, Status } from '@prisma/client';

export class ProgramDiscoveryDto {
  @ApiProperty({
    example: 1,
    description: 'The unique identifier of the program',
  })
  id: number;

  @ApiProperty({
    example: 'Introduction to Programming',
    description: 'The name of the program',
  })
  name: string;

  @ApiProperty({
    example: 'A comprehensive introduction to programming concepts',
    description: 'The description of the program',
    required: false,
  })
  description?: string;

  @ApiProperty({
    enum: Language,
    example: Language.ENGLISH,
    description: 'The language of the program',
  })
  language: Language;

  @ApiProperty({
    example: 3600,
    description: 'Duration of the program in seconds',
  })
  durationSec: number;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'The release date of the program',
  })
  releaseDate: Date;

  @ApiProperty({
    example: 'https://example.com/media/program1.mp4',
    description: 'URL to the program media',
  })
  mediaUrl: string;

  @ApiProperty({
    enum: MediaType,
    example: MediaType.VIDEO,
    description: 'The type of media for the program',
  })
  mediaType: MediaType;

  @ApiProperty({
    enum: Status,
    example: Status.PUBLISHED,
    description: 'The status of the program (always PUBLISHED in discovery)',
  })
  status: Status;

  @ApiProperty({
    example: {
      id: 1,
      name: 'Technology',
      description: 'Programs about technology and programming',
    },
    description: 'The category this program belongs to',
  })
  category: {
    id: number;
    name: string;
    description?: string;
  };

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'The date when the program was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'The date when the program was last updated',
  })
  updatedAt: Date;
}
