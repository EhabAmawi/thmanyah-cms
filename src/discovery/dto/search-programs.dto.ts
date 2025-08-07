import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class SearchProgramsDto {
  @ApiProperty({
    example: 'programming',
    description: 'Search query to find programs by name or description',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  q?: string;
}
