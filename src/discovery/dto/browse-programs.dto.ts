import { ApiProperty } from '@nestjs/swagger';
import { Language, MediaType } from '@prisma/client';
import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BrowseProgramsDto {
  @ApiProperty({
    example: 1,
    description: 'Filter programs by category ID',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiProperty({
    enum: Language,
    example: Language.ENGLISH,
    description: 'Filter programs by language',
    required: false,
  })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @ApiProperty({
    enum: MediaType,
    example: MediaType.VIDEO,
    description: 'Filter programs by media type',
    required: false,
  })
  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;
}
