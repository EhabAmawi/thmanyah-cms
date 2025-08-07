import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { SearchProgramsDto } from './dto/search-programs.dto';
import { BrowseProgramsDto } from './dto/browse-programs.dto';
import { ProgramDiscoveryDto } from './dto/program-discovery.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@ApiTags('Discovery (Public)')
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search published programs',
    description:
      'Search for published programs by name and description. No authentication required.',
  })
  @ApiQuery({
    name: 'q',
    description: 'Search query to find programs by name or description',
    required: false,
    type: String,
    example: 'programming',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated programs matching the search criteria',
    type: PaginatedResponse<ProgramDiscoveryDto>,
  })
  async searchPrograms(
    @Query() searchDto: SearchProgramsDto,
  ): Promise<PaginatedResponse<ProgramDiscoveryDto>> {
    return this.discoveryService.searchPrograms(searchDto);
  }

  @Get('browse')
  @ApiOperation({
    summary: 'Browse published programs',
    description:
      'Browse published programs with optional filters for category, language, and media type. No authentication required.',
  })
  @ApiQuery({
    name: 'categoryId',
    description: 'Filter programs by category ID',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'language',
    description: 'Filter programs by language (ENGLISH or ARABIC)',
    required: false,
    enum: ['ENGLISH', 'ARABIC'],
    example: 'ENGLISH',
  })
  @ApiQuery({
    name: 'mediaType',
    description: 'Filter programs by media type (VIDEO or AUDIO)',
    required: false,
    enum: ['VIDEO', 'AUDIO'],
    example: 'VIDEO',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated programs matching the browse criteria',
    type: PaginatedResponse<ProgramDiscoveryDto>,
  })
  async browsePrograms(
    @Query() browseDto: BrowseProgramsDto,
  ): Promise<PaginatedResponse<ProgramDiscoveryDto>> {
    return this.discoveryService.browsePrograms(browseDto);
  }

  @Get('programs/:id')
  @ApiOperation({
    summary: 'Get published program details',
    description:
      'Get detailed information about a specific published program. No authentication required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Program ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Program details',
    type: ProgramDiscoveryDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Published program not found',
  })
  async getProgram(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProgramDiscoveryDto> {
    return this.discoveryService.getProgram(id);
  }
}
