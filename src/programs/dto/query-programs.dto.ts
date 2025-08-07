import { ApiProperty } from '@nestjs/swagger';
import { Language, MediaType, Status } from '@prisma/client';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryProgramsDto extends PaginationDto {
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

  @ApiProperty({
    enum: Status,
    example: Status.PUBLISHED,
    description: 'Filter programs by status',
    required: false,
  })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiProperty({
    example: 10,
    description: 'Get recent programs (overrides pagination when specified)',
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  recent?: number;
}
