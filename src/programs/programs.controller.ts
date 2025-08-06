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
import { Program } from './entities/program.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('programs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({ summary: 'Get all programs with optional filtering' })
  @ApiQuery({
    name: 'language',
    required: false,
    enum: Language,
    description: 'Filter by program language',
  })
  @ApiQuery({
    name: 'mediaType',
    required: false,
    enum: MediaType,
    description: 'Filter by media type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Status,
    description: 'Filter by program status',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: 'number',
    description: 'Filter by category ID',
  })
  @ApiQuery({
    name: 'recent',
    required: false,
    type: 'number',
    description: 'Get recent programs (specify limit)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of programs retrieved successfully',
    type: [Program],
  })
  async findAll(
    @Query('language') language?: Language,
    @Query('mediaType') mediaType?: MediaType,
    @Query('status') status?: Status,
    @Query('categoryId') categoryId?: string,
    @Query('recent') recent?: string,
  ) {
    if (recent) {
      const limit = parseInt(recent, 10) || 10;
      return this.programsService.findRecent(limit);
    } else if (language) {
      return this.programsService.findByLanguage(language);
    } else if (mediaType) {
      return this.programsService.findByMediaType(mediaType);
    } else if (status) {
      return this.programsService.findByStatus(status);
    } else if (categoryId) {
      const categoryIdInt = parseInt(categoryId, 10);
      if (isNaN(categoryIdInt)) {
        throw new HttpException('Invalid category ID', HttpStatus.BAD_REQUEST);
      }
      return this.programsService.findByCategory(categoryIdInt);
    }
    return this.programsService.findAll();
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
