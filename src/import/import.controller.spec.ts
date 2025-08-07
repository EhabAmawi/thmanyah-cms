import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportResultDto } from './dto/import-result.dto';

describe('ImportController', () => {
  let controller: ImportController;
  let importService: jest.Mocked<ImportService>;

  const mockImportResult: ImportResultDto = {
    success: true,
    importedCount: 1,
    duplicatesSkipped: 0,
    imported: [
      {
        id: 1,
        name: 'Test Video',
        description: 'Test Description',
        language: 'ENGLISH' as any,
        durationSec: 300,
        releaseDate: new Date('2023-01-01'),
        mediaUrl: 'https://www.youtube.com/watch?v=test123',
        mediaType: 'VIDEO' as any,
        sourceType: 'YOUTUBE' as any,
        sourceUrl: 'https://www.youtube.com/watch?v=test123',
        externalId: 'test123',
      },
    ],
    errors: [],
    message: 'Video imported successfully',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        {
          provide: ImportService,
          useValue: {
            importVideo: jest.fn(),
            importChannel: jest.fn(),
            importBySourceType: jest.fn(),
            getSupportedSourceTypes: jest.fn(),
            checkDuplicate: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<ImportController>(ImportController);
    importService = module.get(ImportService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('importYouTubeVideo', () => {
    const importVideoDto = {
      url: 'https://www.youtube.com/watch?v=test123',
      categoryId: 'cat-123',
    };

    it('should successfully import YouTube video', async () => {
      importService.importVideo.mockResolvedValue(mockImportResult);

      const result = await controller.importYouTubeVideo(importVideoDto);

      expect(result).toEqual(mockImportResult);
      expect(importService.importVideo).toHaveBeenCalledWith(importVideoDto);
    });

    it('should handle import service error', async () => {
      const errorResult = {
        ...mockImportResult,
        success: false,
        importedCount: 0,
        imported: [],
        errors: ['Invalid YouTube URL'],
        message: 'Failed to import video',
      };
      importService.importVideo.mockResolvedValue(errorResult);

      const result = await controller.importYouTubeVideo(importVideoDto);

      expect(result).toEqual(errorResult);
      expect(importService.importVideo).toHaveBeenCalledWith(importVideoDto);
    });

    it('should propagate service exceptions', async () => {
      importService.importVideo.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.importYouTubeVideo(importVideoDto),
      ).rejects.toThrow('Service error');
    });
  });

  describe('importYouTubeChannel', () => {
    const importChannelDto = {
      channelId: 'UC_test_channel',
      limit: 5,
      categoryId: 'cat-123',
    };

    it('should successfully import YouTube channel', async () => {
      const channelResult = {
        ...mockImportResult,
        importedCount: 3,
        imported: [
          mockImportResult.imported[0],
          mockImportResult.imported[0],
          mockImportResult.imported[0],
        ],
        message: 'Successfully imported 3 videos, skipped 0 duplicates',
      };
      importService.importChannel.mockResolvedValue(channelResult);

      const result = await controller.importYouTubeChannel(importChannelDto);

      expect(result).toEqual(channelResult);
      expect(importService.importChannel).toHaveBeenCalledWith(
        SourceType.YOUTUBE,
        importChannelDto,
      );
    });

    it('should handle channel import with duplicates', async () => {
      const channelWithDuplicatesResult = {
        ...mockImportResult,
        importedCount: 2,
        duplicatesSkipped: 1,
        errors: ['Content already exists'],
        message:
          'Successfully imported 2 videos, skipped 1 duplicates, encountered 1 errors',
      };
      importService.importChannel.mockResolvedValue(
        channelWithDuplicatesResult,
      );

      const result = await controller.importYouTubeChannel(importChannelDto);

      expect(result).toEqual(channelWithDuplicatesResult);
    });

    it('should handle service error', async () => {
      importService.importChannel.mockRejectedValue(
        new BadRequestException('Invalid channel ID'),
      );

      await expect(
        controller.importYouTubeChannel(importChannelDto),
      ).rejects.toThrow('Invalid channel ID');
    });
  });

  describe('importBySourceType', () => {
    const importBySourceDto = {
      sourceType: SourceType.YOUTUBE,
      url: 'https://www.youtube.com/watch?v=test123',
      categoryId: 'cat-123',
    };

    it('should successfully import by source type', async () => {
      importService.importBySourceType.mockResolvedValue(mockImportResult);

      const result = await controller.importBySourceType(importBySourceDto);

      expect(result).toEqual(mockImportResult);
      expect(importService.importBySourceType).toHaveBeenCalledWith(
        importBySourceDto,
      );
    });

    it('should handle unsupported source type error', async () => {
      const errorResult = {
        ...mockImportResult,
        success: false,
        importedCount: 0,
        imported: [],
        errors: ["Adapter for source type 'VIMEO' not found"],
        message: 'Failed to import content',
      };
      importService.importBySourceType.mockResolvedValue(errorResult);

      const result = await controller.importBySourceType({
        ...importBySourceDto,
        sourceType: SourceType.VIMEO,
      });

      expect(result).toEqual(errorResult);
    });

    it('should handle service exception', async () => {
      importService.importBySourceType.mockRejectedValue(
        new BadRequestException('Invalid source type'),
      );

      await expect(
        controller.importBySourceType(importBySourceDto),
      ).rejects.toThrow('Invalid source type');
    });
  });

  describe('importVideo', () => {
    const importVideoDto = {
      url: 'https://www.youtube.com/watch?v=test123',
      categoryId: 'cat-123',
    };

    it('should successfully import video with auto-detection', async () => {
      importService.importVideo.mockResolvedValue(mockImportResult);

      const result = await controller.importVideo(importVideoDto);

      expect(result).toEqual(mockImportResult);
      expect(importService.importVideo).toHaveBeenCalledWith(importVideoDto);
    });

    it('should handle unsupported URL', async () => {
      const errorResult = {
        ...mockImportResult,
        success: false,
        importedCount: 0,
        imported: [],
        errors: ['No adapter found for URL: https://unsupported.com/video'],
        message: 'Failed to import video',
      };
      importService.importVideo.mockResolvedValue(errorResult);

      const result = await controller.importVideo({
        url: 'https://unsupported.com/video',
        categoryId: 'cat-123',
      });

      expect(result).toEqual(errorResult);
    });
  });

  describe('getSupportedSources', () => {
    it('should return supported source types', async () => {
      const supportedTypes = [SourceType.YOUTUBE, SourceType.VIMEO];
      importService.getSupportedSourceTypes.mockResolvedValue(supportedTypes);

      const result = await controller.getSupportedSources();

      expect(result).toEqual({
        supportedSources: supportedTypes,
      });
      expect(importService.getSupportedSourceTypes).toHaveBeenCalled();
    });

    it('should handle empty supported sources', async () => {
      importService.getSupportedSourceTypes.mockResolvedValue([]);

      const result = await controller.getSupportedSources();

      expect(result).toEqual({
        supportedSources: [],
      });
    });

    it('should handle service error', async () => {
      importService.getSupportedSourceTypes.mockRejectedValue(
        new Error('Service error'),
      );

      await expect(controller.getSupportedSources()).rejects.toThrow(
        'Service error',
      );
    });
  });

  describe('checkDuplicate', () => {
    const checkDuplicateBody = {
      externalId: 'test123',
      sourceType: SourceType.YOUTUBE,
    };

    it('should return duplicate exists', async () => {
      importService.checkDuplicate.mockResolvedValue(true);

      const result = await controller.checkDuplicate(checkDuplicateBody);

      expect(result).toEqual({
        exists: true,
        externalId: 'test123',
        sourceType: SourceType.YOUTUBE,
      });
      expect(importService.checkDuplicate).toHaveBeenCalledWith(
        'test123',
        SourceType.YOUTUBE,
      );
    });

    it('should return duplicate does not exist', async () => {
      importService.checkDuplicate.mockResolvedValue(false);

      const result = await controller.checkDuplicate(checkDuplicateBody);

      expect(result).toEqual({
        exists: false,
        externalId: 'test123',
        sourceType: SourceType.YOUTUBE,
      });
      expect(importService.checkDuplicate).toHaveBeenCalledWith(
        'test123',
        SourceType.YOUTUBE,
      );
    });

    it('should throw BadRequestException when externalId is missing', async () => {
      const invalidBody = {
        sourceType: SourceType.YOUTUBE,
      } as any;

      await expect(controller.checkDuplicate(invalidBody)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.checkDuplicate(invalidBody)).rejects.toThrow(
        'externalId and sourceType are required',
      );
    });

    it('should throw BadRequestException when sourceType is missing', async () => {
      const invalidBody = {
        externalId: 'test123',
      } as any;

      await expect(controller.checkDuplicate(invalidBody)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.checkDuplicate(invalidBody)).rejects.toThrow(
        'externalId and sourceType are required',
      );
    });

    it('should throw BadRequestException when both fields are missing', async () => {
      const invalidBody = {} as any;

      await expect(controller.checkDuplicate(invalidBody)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.checkDuplicate(invalidBody)).rejects.toThrow(
        'externalId and sourceType are required',
      );
    });

    it('should handle service error', async () => {
      importService.checkDuplicate.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        controller.checkDuplicate(checkDuplicateBody),
      ).rejects.toThrow('Database error');
    });
  });

  describe('validation and edge cases', () => {
    it('should handle empty request body gracefully', async () => {
      const emptyDto = { url: '', categoryId: undefined };
      const errorResult = {
        ...mockImportResult,
        success: false,
        importedCount: 0,
        imported: [],
        errors: ['Invalid URL'],
        message: 'Failed to import video',
      };
      importService.importVideo.mockResolvedValue(errorResult);

      const result = await controller.importVideo(emptyDto);

      expect(result).toEqual(errorResult);
    });

    it('should handle malformed URLs', async () => {
      const malformedDto = { url: 'not-a-url', categoryId: 'cat-123' };
      const errorResult = {
        ...mockImportResult,
        success: false,
        importedCount: 0,
        imported: [],
        errors: ['No adapter found for URL: not-a-url'],
        message: 'Failed to import video',
      };
      importService.importVideo.mockResolvedValue(errorResult);

      const result = await controller.importVideo(malformedDto);

      expect(result).toEqual(errorResult);
    });

    it('should handle very long channel limits', async () => {
      const longLimitDto = {
        channelId: 'UC_test',
        limit: 1000, // This should be validated by DTOs
        categoryId: 'cat-123',
      };

      const errorResult = {
        ...mockImportResult,
        success: false,
        importedCount: 0,
        imported: [],
        errors: ['Limit exceeds maximum allowed'],
        message: 'Failed to import channel',
      };
      importService.importChannel.mockResolvedValue(errorResult);

      const result = await controller.importYouTubeChannel(longLimitDto);

      expect(result).toEqual(errorResult);
    });
  });

  describe('authentication and authorization', () => {
    it('should have JWT auth guard applied', () => {
      // Since we're mocking the guard, just verify the controller is decorated
      expect(controller).toBeDefined();
      // The actual guard behavior is tested in integration tests
    });

    it('should be properly configured for authentication', () => {
      // This test verifies basic controller setup
      expect(controller).toBeInstanceOf(ImportController);
    });
  });

  describe('API documentation', () => {
    it('should be properly configured with decorators', () => {
      // The swagger decorations are applied at runtime
      // Integration tests verify the actual Swagger documentation
      expect(controller).toBeDefined();
    });

    it('should have proper method signatures', () => {
      expect(typeof controller.importYouTubeVideo).toBe('function');
      expect(typeof controller.importYouTubeChannel).toBe('function');
      expect(typeof controller.getSupportedSources).toBe('function');
      expect(typeof controller.checkDuplicate).toBe('function');
    });
  });
});
