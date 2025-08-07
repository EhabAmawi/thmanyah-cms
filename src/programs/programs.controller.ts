import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Language, MediaType, Status } from '@prisma/client';
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { QueryProgramsDto } from './dto/query-programs.dto';
import { Program } from './entities/program.entity';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedRateLimit,
  SearchRateLimit,
} from '../common/decorators/throttle-config.decorator';

@ApiTags('programs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@AuthenticatedRateLimit()
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new program' })
  @ApiBody({ type: CreateProgramDto })
  @ApiResponse({
    status: 201,
    description: 'Program created successfully',
    type: Program,
  })
  @ApiResponse({ status: 409, description: 'Program name already exists' })
  async create(@Body() createProgramDto: CreateProgramDto) {
    return this.programsService.create(createProgramDto);
  }

  @Get()
  @SearchRateLimit()
  @ApiOperation({
    summary: 'Get all programs with optional filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of programs retrieved successfully',
    type: PaginatedResponse<Program>,
  })
  async findAll(
    @Query() queryDto: QueryProgramsDto,
  ): Promise<PaginatedResponse<Program>> {
    return this.programsService.findAllPaginated(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get program by ID' })
  @ApiParam({ name: 'id', description: 'Program ID' })
  @ApiResponse({
    status: 200,
    description: 'Program retrieved successfully',
    type: Program,
  })
  @ApiResponse({ status: 404, description: 'Program not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const program = await this.programsService.findOne(id);
    if (!program) {
      throw new HttpException('Program not found', HttpStatus.NOT_FOUND);
    }
    return program;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update program by ID' })
  @ApiParam({ name: 'id', description: 'Program ID' })
  @ApiBody({ type: UpdateProgramDto })
  @ApiResponse({
    status: 200,
    description: 'Program updated successfully',
    type: Program,
  })
  @ApiResponse({ status: 404, description: 'Program not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProgramDto: UpdateProgramDto,
  ) {
    return this.programsService.update(id, updateProgramDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete program by ID' })
  @ApiParam({ name: 'id', description: 'Program ID' })
  @ApiResponse({ status: 200, description: 'Program deleted successfully' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.programsService.remove(id);
    return { message: 'Program deleted successfully' };
  }
}
