import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class SearchProgramsDto extends PaginationDto {
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
