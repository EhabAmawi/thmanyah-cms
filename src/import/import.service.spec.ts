import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Language, MediaType, SourceType } from '@prisma/client';
import { ImportService } from './import.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdapterFactory } from './adapters/adapter.factory';
import { BaseContentAdapter, ImportedContent } from './adapters/base.adapter';

// Mock Logger properly
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

describe('ImportService', () => {
  let service: ImportService;
  let prismaService: any;
  let adapterFactory: jest.Mocked<AdapterFactory>;
  let mockAdapter: jest.Mocked<BaseContentAdapter>;

  const mockImportedContent: ImportedContent = {
    name: 'Test Video',
    description: 'Test Description',
    language: Language.ENGLISH,
    durationSec: 300,
    releaseDate: new Date('2023-01-01'),
    mediaUrl: 'https://www.youtube.com/watch?v=test123',
    mediaType: MediaType.VIDEO,
    sourceType: SourceType.YOUTUBE,
    sourceUrl: 'https://www.youtube.com/watch?v=test123',
    externalId: 'test123',
  };

  const mockProgram = {
    id: 1,
    name: 'Test Video',
    description: 'Test Description',
    language: Language.ENGLISH,
    durationSec: 300,
    releaseDate: new Date('2023-01-01'),
    mediaUrl: 'https://www.youtube.com/watch?v=test123',
    mediaType: MediaType.VIDEO,
    sourceType: SourceType.YOUTUBE,
    sourceUrl: 'https://www.youtube.com/watch?v=test123',
    externalId: 'test123',
    categoryId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockAdapter = {
      sourceType: SourceType.YOUTUBE,
      supportedDomains: ['youtube.com'],
      importVideo: jest.fn(),
      importChannel: jest.fn(),
      extractVideoId: jest.fn(),
      validateUrl: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        {
          provide: PrismaService,
          useValue: {
            program: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: AdapterFactory,
          useValue: {
            getAdapterByUrl: jest.fn(),
            getAdapter: jest.fn(),
            getSupportedSourceTypes: jest.fn(),
          },
        },
      ],
    })
      .setLogger(mockLogger)
      .compile();

    service = module.get<ImportService>(ImportService);
    prismaService = module.get(PrismaService);
    adapterFactory = module.get(AdapterFactory);
  });

  describe('importVideo', () => {
    const importVideoDto = {
      url: 'https://www.youtube.com/watch?v=test123',
      categoryId: 'cat-123',
    };

    it('should successfully import a video', async () => {
      adapterFactory.getAdapterByUrl.mockReturnValue(mockAdapter);
      mockAdapter.importVideo.mockResolvedValue(mockImportedContent);
      prismaService.program.findFirst.mockResolvedValue(null); // No duplicate
      prismaService.program.create.mockResolvedValue(mockProgram);

      const result = await service.importVideo(importVideoDto);

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(result.duplicatesSkipped).toBe(0);
      expect(result.imported).toHaveLength(1);
      expect(result.imported[0].name).toBe('Test Video');
      expect(result.errors).toHaveLength(0);
      expect(result.message).toBe('Video imported successfully');
    });

    it('should skip duplicate video', async () => {
      adapterFactory.getAdapterByUrl.mockReturnValue(mockAdapter);
      mockAdapter.importVideo.mockResolvedValue(mockImportedContent);
      prismaService.program.findFirst.mockResolvedValue(mockProgram); // Duplicate exists

      const result = await service.importVideo(importVideoDto);

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(0);
      expect(result.duplicatesSkipped).toBe(1);
      expect(result.imported).toHaveLength(0);
      expect(result.errors).toEqual(['Content already exists']);
      expect(result.message).toBe('Video was skipped (duplicate or error)');
    });

    it('should handle adapter error', async () => {
      adapterFactory.getAdapterByUrl.mockImplementation(() => {
        throw new BadRequestException('Unsupported URL');
      });

      const result = await service.importVideo(importVideoDto);

      expect(result.success).toBe(false);
      expect(result.importedCount).toBe(0);
      expect(result.duplicatesSkipped).toBe(0);
      expect(result.imported).toHaveLength(0);
      expect(result.errors).toEqual(['Unsupported URL']);
      expect(result.message).toBe('Failed to import video');
    });

    it('should handle database error', async () => {
      adapterFactory.getAdapterByUrl.mockReturnValue(mockAdapter);
      mockAdapter.importVideo.mockResolvedValue(mockImportedContent);
      prismaService.program.findFirst.mockResolvedValue(null);
      prismaService.program.create.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.importVideo(importVideoDto);

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(0);
      expect(result.duplicatesSkipped).toBe(1);
      expect(result.imported).toHaveLength(0);
      expect(result.errors).toEqual(['Database error']);
      expect(result.message).toBe('Video was skipped (duplicate or error)');
    });
  });

  describe('importChannel', () => {
    const importChannelDto = {
      channelId: 'UC_test_channel',
      limit: 2,
      categoryId: 'cat-123',
    };

    const mockChannelContent = [
      { ...mockImportedContent, name: 'Video 1', externalId: 'vid1' },
      { ...mockImportedContent, name: 'Video 2', externalId: 'vid2' },
    ];

    const mockPrograms = [
      {
        ...mockProgram,
        id: 1,
        name: 'Video 1',
        externalId: 'vid1',
        categoryId: 1,
      },
      {
        ...mockProgram,
        id: 2,
        name: 'Video 2',
        externalId: 'vid2',
        categoryId: 1,
      },
    ];

    it('should successfully import channel videos', async () => {
      adapterFactory.getAdapter.mockReturnValue(mockAdapter);
      mockAdapter.importChannel.mockResolvedValue(mockChannelContent);
      prismaService.program.findFirst.mockResolvedValue(null); // No duplicates
      prismaService.program.create
        .mockResolvedValueOnce(mockPrograms[0])
        .mockResolvedValueOnce(mockPrograms[1]);

      const result = await service.importChannel(
        SourceType.YOUTUBE,
        importChannelDto,
      );

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(2);
      expect(result.duplicatesSkipped).toBe(0);
      expect(result.imported).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.message).toBe(
        'Successfully imported 2 videos, skipped 0 duplicates',
      );
    });

    it('should handle mixed success and duplicates', async () => {
      adapterFactory.getAdapter.mockReturnValue(mockAdapter);
      mockAdapter.importChannel.mockResolvedValue(mockChannelContent);
      prismaService.program.findFirst
        .mockResolvedValueOnce(null) // First video is new
        .mockResolvedValueOnce(mockPrograms[1]); // Second video is duplicate
      prismaService.program.create.mockResolvedValueOnce(mockPrograms[0]);

      const result = await service.importChannel(
        SourceType.YOUTUBE,
        importChannelDto,
      );

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(result.duplicatesSkipped).toBe(1);
      expect(result.imported).toHaveLength(1);
      expect(result.imported[0].name).toBe('Video 1');
      expect(result.errors).toEqual(['Content already exists']);
      expect(result.message).toBe(
        'Successfully imported 1 videos, skipped 1 duplicates, encountered 1 errors',
      );
    });

    it('should handle adapter error', async () => {
      adapterFactory.getAdapter.mockImplementation(() => {
        throw new BadRequestException('Invalid channel ID');
      });

      const result = await service.importChannel(
        SourceType.YOUTUBE,
        importChannelDto,
      );

      expect(result.success).toBe(false);
      expect(result.importedCount).toBe(0);
      expect(result.duplicatesSkipped).toBe(0);
      expect(result.imported).toHaveLength(0);
      expect(result.errors).toEqual(['Invalid channel ID']);
      expect(result.message).toBe('Failed to import channel');
    });
  });

  describe('importBySourceType', () => {
    const importBySourceDto = {
      sourceType: SourceType.YOUTUBE,
      url: 'https://www.youtube.com/watch?v=test123',
      categoryId: 'cat-123',
    };

    it('should import single video when URL contains video ID', async () => {
      adapterFactory.getAdapter.mockReturnValue(mockAdapter);
      mockAdapter.extractVideoId.mockReturnValue('test123');
      mockAdapter.importVideo.mockResolvedValue(mockImportedContent);
      prismaService.program.findFirst.mockResolvedValue(null);
      prismaService.program.create.mockResolvedValue(mockProgram);

      const result = await service.importBySourceType(importBySourceDto);

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(result.message).toBe('Content imported successfully');
      expect(mockAdapter.importVideo).toHaveBeenCalledWith({
        url: importBySourceDto.url,
        categoryId: importBySourceDto.categoryId,
      });
    });

    it('should throw error for channel URLs', async () => {
      adapterFactory.getAdapter.mockReturnValue(mockAdapter);
      mockAdapter.extractVideoId.mockReturnValue(null); // No video ID means it's a channel

      const result = await service.importBySourceType(importBySourceDto);

      expect(result.success).toBe(false);
      expect(result.importedCount).toBe(0);
      expect(result.errors).toEqual([
        'Channel import not yet supported via this endpoint. Use the specific channel import endpoint.',
      ]);
      expect(result.message).toBe('Failed to import content');
    });

    it('should handle adapter not found', async () => {
      adapterFactory.getAdapter.mockImplementation(() => {
        throw new BadRequestException('Adapter not found');
      });

      const result = await service.importBySourceType(importBySourceDto);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Adapter not found']);
      expect(result.message).toBe('Failed to import content');
    });
  });

  describe('getSupportedSourceTypes', () => {
    it('should return supported source types from adapter factory', async () => {
      const supportedTypes = [SourceType.YOUTUBE, SourceType.VIMEO];
      adapterFactory.getSupportedSourceTypes.mockReturnValue(supportedTypes);

      const result = await service.getSupportedSourceTypes();

      expect(result).toEqual(supportedTypes);
      expect(adapterFactory.getSupportedSourceTypes).toHaveBeenCalled();
    });
  });

  describe('checkDuplicate', () => {
    it('should return true when duplicate exists', async () => {
      prismaService.program.findFirst.mockResolvedValue(mockProgram);

      const result = await service.checkDuplicate(
        'test123',
        SourceType.YOUTUBE,
      );

      expect(result).toBe(true);
      expect(prismaService.program.findFirst).toHaveBeenCalledWith({
        where: {
          externalId: 'test123',
          sourceType: SourceType.YOUTUBE,
        },
      });
    });

    it('should return false when no duplicate exists', async () => {
      prismaService.program.findFirst.mockResolvedValue(null);

      const result = await service.checkDuplicate(
        'test123',
        SourceType.YOUTUBE,
      );

      expect(result).toBe(false);
      expect(prismaService.program.findFirst).toHaveBeenCalledWith({
        where: {
          externalId: 'test123',
          sourceType: SourceType.YOUTUBE,
        },
      });
    });
  });

  describe('importSingleContent', () => {
    it('should successfully import content', async () => {
      prismaService.program.findFirst.mockResolvedValue(null);
      prismaService.program.create.mockResolvedValue(mockProgram);

      const result = await service['importSingleContent'](mockImportedContent);

      expect(result.success).toBe(true);
      expect(result.program).toEqual(mockProgram);
      expect(result.error).toBeUndefined();
      expect(result.isDuplicate).toBeUndefined();
    });

    it('should skip duplicate content', async () => {
      prismaService.program.findFirst.mockResolvedValue(mockProgram);

      const result = await service['importSingleContent'](mockImportedContent);

      expect(result.success).toBe(false);
      expect(result.program).toBeUndefined();
      expect(result.error).toBe('Content already exists');
      expect(result.isDuplicate).toBe(true);
    });

    it('should handle database create error', async () => {
      prismaService.program.findFirst.mockResolvedValue(null);
      prismaService.program.create.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service['importSingleContent'](mockImportedContent);

      expect(result.success).toBe(false);
      expect(result.program).toBeUndefined();
      expect(result.error).toBe('Database error');
      expect(result.isDuplicate).toBeUndefined();
    });
  });

  describe('importMultipleContent', () => {
    const multipleContent = [
      { ...mockImportedContent, name: 'Video 1', externalId: 'vid1' },
      { ...mockImportedContent, name: 'Video 2', externalId: 'vid2' },
    ];

    it('should import multiple content items', async () => {
      prismaService.program.findFirst.mockResolvedValue(null);
      prismaService.program.create
        .mockResolvedValueOnce({
          ...mockProgram,
          id: 1,
          name: 'Video 1',
          categoryId: 1,
        })
        .mockResolvedValueOnce({
          ...mockProgram,
          id: 2,
          name: 'Video 2',
          categoryId: 1,
        });

      const results = await service['importMultipleContent'](multipleContent);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].program.name).toBe('Video 1');
      expect(results[1].program.name).toBe('Video 2');
    });

    it('should handle mixed success and failure', async () => {
      prismaService.program.findFirst
        .mockResolvedValueOnce(null) // First video is new
        .mockResolvedValueOnce(mockProgram); // Second video is duplicate
      prismaService.program.create.mockResolvedValueOnce({
        ...mockProgram,
        id: 1,
        name: 'Video 1',
        categoryId: 1,
      });

      const results = await service['importMultipleContent'](multipleContent);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].isDuplicate).toBe(true);
    });
  });

  describe('mapToDto', () => {
    it('should correctly map program to DTO', () => {
      const dto = service['mapToDto'](mockProgram);

      expect(dto).toEqual({
        id: mockProgram.id,
        name: mockProgram.name,
        description: mockProgram.description,
        language: mockProgram.language,
        durationSec: mockProgram.durationSec,
        releaseDate: mockProgram.releaseDate,
        mediaUrl: mockProgram.mediaUrl,
        mediaType: mockProgram.mediaType,
        sourceType: mockProgram.sourceType,
        sourceUrl: mockProgram.sourceUrl,
        externalId: mockProgram.externalId,
      });
    });

    it('should handle program with missing optional fields', () => {
      const programWithoutDescription = { ...mockProgram, description: null };
      const dto = service['mapToDto'](programWithoutDescription);

      expect(dto.description).toBeNull();
      expect(dto.id).toBe(mockProgram.id);
      expect(dto.name).toBe(mockProgram.name);
    });
  });
});
