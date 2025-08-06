import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdapterFactory } from './adapters/adapter.factory';
import { ImportedContent, ImportResult } from './adapters/base.adapter';
import {
  ImportVideoDto,
  ImportChannelDto,
  ImportBySourceTypeDto,
} from './dto/import-config.dto';
import { ImportResultDto, ImportedContentDto } from './dto/import-result.dto';
import { SourceType } from '@prisma/client';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterFactory: AdapterFactory,
  ) {}

  async importVideo(dto: ImportVideoDto): Promise<ImportResultDto> {
    this.logger.log(`Starting video import from URL: ${dto.url}`);

    try {
      const adapter = this.adapterFactory.getAdapterByUrl(dto.url);
      const content = await adapter.importVideo(dto);

      const result = await this.importSingleContent(content, dto.categoryId);

      return {
        success: true,
        importedCount: result.success ? 1 : 0,
        duplicatesSkipped: result.success ? 0 : 1,
        imported: result.success ? [this.mapToDto(result.program)] : [],
        errors: result.success ? [] : [result.error || 'Unknown error'],
        message: result.success
          ? 'Video imported successfully'
          : 'Video was skipped (duplicate or error)',
      };
    } catch (error) {
      this.logger.error(
        `Failed to import video: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        importedCount: 0,
        duplicatesSkipped: 0,
        imported: [],
        errors: [error.message],
        message: 'Failed to import video',
      };
    }
  }

  async importChannel(
    sourceType: SourceType,
    dto: ImportChannelDto,
  ): Promise<ImportResultDto> {
    this.logger.log(
      `Starting channel import from ${sourceType}: ${dto.channelId}`,
    );

    try {
      const adapter = this.adapterFactory.getAdapter(sourceType);
      const contentList = await adapter.importChannel(dto);

      const results = await this.importMultipleContent(
        contentList,
        dto.categoryId,
      );

      const imported = results
        .filter((r) => r.success)
        .map((r) => this.mapToDto(r.program));
      const errors = results.filter((r) => !r.success).map((r) => r.error!);
      const duplicatesSkipped = results.filter(
        (r) => !r.success && r.isDuplicate,
      ).length;

      return {
        success: true,
        importedCount: imported.length,
        duplicatesSkipped,
        imported,
        errors,
        message: `Successfully imported ${imported.length} videos, skipped ${duplicatesSkipped} duplicates${errors.length > 0 ? `, encountered ${errors.length} errors` : ''}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to import channel: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        importedCount: 0,
        duplicatesSkipped: 0,
        imported: [],
        errors: [error.message],
        message: 'Failed to import channel',
      };
    }
  }

  async importBySourceType(
    dto: ImportBySourceTypeDto,
  ): Promise<ImportResultDto> {
    this.logger.log(`Starting import from ${dto.sourceType}: ${dto.url}`);

    try {
      const adapter = this.adapterFactory.getAdapter(dto.sourceType);

      // Determine if it's a single video or channel/playlist
      if (adapter.extractVideoId(dto.url)) {
        // It's a single video
        const content = await adapter.importVideo({
          url: dto.url,
          categoryId: dto.categoryId,
        });

        const result = await this.importSingleContent(content, dto.categoryId);

        return {
          success: true,
          importedCount: result.success ? 1 : 0,
          duplicatesSkipped: result.success ? 0 : 1,
          imported: result.success ? [this.mapToDto(result.program)] : [],
          errors: result.success ? [] : [result.error || 'Unknown error'],
          message: result.success
            ? 'Content imported successfully'
            : 'Content was skipped (duplicate or error)',
        };
      } else {
        // Assume it's a channel (this logic could be enhanced based on URL patterns)
        throw new BadRequestException(
          'Channel import not yet supported via this endpoint. Use the specific channel import endpoint.',
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to import content: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        importedCount: 0,
        duplicatesSkipped: 0,
        imported: [],
        errors: [error.message],
        message: 'Failed to import content',
      };
    }
  }

  async getSupportedSourceTypes(): Promise<SourceType[]> {
    return this.adapterFactory.getSupportedSourceTypes();
  }

  async checkDuplicate(
    externalId: string,
    sourceType: SourceType,
  ): Promise<boolean> {
    const existing = await this.prisma.program.findFirst({
      where: {
        externalId,
        sourceType,
      },
    });

    return !!existing;
  }

  private async importSingleContent(
    content: ImportedContent,
    categoryId?: string,
  ): Promise<{
    success: boolean;
    program?: any;
    error?: string;
    isDuplicate?: boolean;
  }> {
    try {
      // Check for duplicates
      const isDuplicate = await this.checkDuplicate(
        content.externalId,
        content.sourceType,
      );
      if (isDuplicate) {
        this.logger.warn(
          `Skipping duplicate content: ${content.externalId} from ${content.sourceType}`,
        );
        return {
          success: false,
          isDuplicate: true,
          error: 'Content already exists',
        };
      }

      // Create the program
      const program = await this.prisma.program.create({
        data: {
          name: content.name,
          description: content.description,
          language: content.language,
          durationSec: content.durationSec,
          releaseDate: content.releaseDate,
          mediaUrl: content.mediaUrl,
          mediaType: content.mediaType,
          sourceType: content.sourceType,
          sourceUrl: content.sourceUrl,
          externalId: content.externalId,
        },
      });

      this.logger.log(
        `Successfully imported content: ${content.name} (${content.externalId})`,
      );
      return { success: true, program };
    } catch (error) {
      this.logger.error(
        `Failed to save content ${content.externalId}: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }

  private async importMultipleContent(
    contentList: ImportedContent[],
    categoryId?: string,
  ): Promise<
    Array<{
      success: boolean;
      program?: any;
      error?: string;
      isDuplicate?: boolean;
    }>
  > {
    const results: Array<{
      success: boolean;
      program?: any;
      error?: string;
      isDuplicate?: boolean;
    }> = [];

    for (const content of contentList) {
      const result = await this.importSingleContent(content, categoryId);
      results.push(result);
    }

    return results;
  }

  private mapToDto(program: any): ImportedContentDto {
    return {
      id: program.id,
      name: program.name,
      description: program.description,
      language: program.language,
      durationSec: program.durationSec,
      releaseDate: program.releaseDate,
      mediaUrl: program.mediaUrl,
      mediaType: program.mediaType,
      sourceType: program.sourceType,
      sourceUrl: program.sourceUrl,
      externalId: program.externalId,
    };
  }
}
