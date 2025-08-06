import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportService } from './import.service';
import {
  ImportVideoDto,
  ImportChannelDto,
  ImportBySourceTypeDto,
} from './dto/import-config.dto';
import { ImportResultDto } from './dto/import-result.dto';
import { SourceType } from '@prisma/client';

@ApiTags('import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('youtube/video')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import single video from YouTube',
    description: 'Imports a single video from YouTube by providing its URL',
  })
  @ApiResponse({
    status: 200,
    description: 'Video imported successfully',
    type: ImportResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid YouTube URL or video not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  @ApiBody({ type: ImportVideoDto })
  async importYouTubeVideo(
    @Body() dto: ImportVideoDto,
  ): Promise<ImportResultDto> {
    return await this.importService.importVideo(dto);
  }

  @Post('youtube/channel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import videos from YouTube channel',
    description:
      'Imports multiple videos from a YouTube channel with optional limit',
  })
  @ApiResponse({
    status: 200,
    description: 'Channel videos imported successfully',
    type: ImportResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid channel ID or channel not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  @ApiBody({ type: ImportChannelDto })
  async importYouTubeChannel(
    @Body() dto: ImportChannelDto,
  ): Promise<ImportResultDto> {
    return await this.importService.importChannel(SourceType.YOUTUBE, dto);
  }

  @Post('by-source')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import content by specifying source type',
    description:
      'Generic import endpoint that accepts content from any supported source type',
  })
  @ApiResponse({
    status: 200,
    description: 'Content imported successfully',
    type: ImportResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid source type or URL',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  @ApiBody({ type: ImportBySourceTypeDto })
  async importBySourceType(
    @Body() dto: ImportBySourceTypeDto,
  ): Promise<ImportResultDto> {
    return await this.importService.importBySourceType(dto);
  }

  @Post('video')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import single video from any supported source',
    description: 'Auto-detects the source type from URL and imports the video',
  })
  @ApiResponse({
    status: 200,
    description: 'Video imported successfully',
    type: ImportResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unsupported URL or video not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  @ApiBody({ type: ImportVideoDto })
  async importVideo(@Body() dto: ImportVideoDto): Promise<ImportResultDto> {
    return await this.importService.importVideo(dto);
  }

  @Get('sources')
  @ApiOperation({
    summary: 'Get supported source types',
    description: 'Returns a list of all supported import source types',
  })
  @ApiResponse({
    status: 200,
    description: 'List of supported source types',
    schema: {
      type: 'object',
      properties: {
        supportedSources: {
          type: 'array',
          items: {
            type: 'string',
            enum: Object.values(SourceType),
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  async getSupportedSources() {
    const sources = await this.importService.getSupportedSourceTypes();
    return {
      supportedSources: sources,
    };
  }

  @Post('check-duplicate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check if content already exists',
    description:
      'Checks if content with given external ID and source type already exists in the database',
  })
  @ApiResponse({
    status: 200,
    description: 'Duplicate check completed',
    schema: {
      type: 'object',
      properties: {
        exists: {
          type: 'boolean',
          description: 'Whether the content already exists',
        },
        externalId: {
          type: 'string',
          description: 'The external ID that was checked',
        },
        sourceType: {
          type: 'string',
          enum: Object.values(SourceType),
          description: 'The source type that was checked',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['externalId', 'sourceType'],
      properties: {
        externalId: {
          type: 'string',
          description: 'External platform ID',
          example: 'dQw4w9WgXcQ',
        },
        sourceType: {
          type: 'string',
          enum: Object.values(SourceType),
          description: 'Source platform type',
          example: 'YOUTUBE',
        },
      },
    },
  })
  async checkDuplicate(
    @Body() body: { externalId: string; sourceType: SourceType },
  ) {
    if (!body.externalId || !body.sourceType) {
      throw new BadRequestException('externalId and sourceType are required');
    }

    const exists = await this.importService.checkDuplicate(
      body.externalId,
      body.sourceType,
    );

    return {
      exists,
      externalId: body.externalId,
      sourceType: body.sourceType,
    };
  }
}
