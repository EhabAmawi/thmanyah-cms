import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { SearchProgramsDto } from './dto/search-programs.dto';
import { BrowseProgramsDto } from './dto/browse-programs.dto';
import { Language, MediaType, Status } from '@prisma/client';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let prismaService: jest.Mocked<PrismaService>;
  let cacheService: jest.Mocked<CacheService>;

  const mockCategory = {
    id: 1,
    name: 'Technology',
    description: 'Technology and programming courses',
  };

  const mockPublishedProgram = {
    id: 1,
    name: 'Introduction to Programming',
    description: 'A comprehensive introduction to programming concepts',
    language: Language.ENGLISH,
    durationSec: 3600,
    releaseDate: new Date('2024-01-01'),
    mediaUrl: 'https://example.com/media/program1.mp4',
    mediaType: MediaType.VIDEO,
    status: Status.PUBLISHED,
    categoryId: 1,
    category: mockCategory,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockDraftProgram = {
    id: 2,
    name: 'Draft Program',
    status: Status.DRAFT,
  };

  const mockPrismaService = {
    program: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    generateKey: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
    prismaService = module.get(PrismaService);
    cacheService = module.get(CacheService);

    // Reset all mocks and setup default cache behavior
    jest.clearAllMocks();
    mockCacheService.generateKey.mockReturnValue('test-cache-key');
    mockCacheService.get.mockResolvedValue(null); // Default cache miss
    mockCacheService.set.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchPrograms', () => {
    it('should search programs without query parameter (cache miss)', async () => {
      const searchDto = new SearchProgramsDto();
      mockPrismaService.program.findMany.mockResolvedValue([
        mockPublishedProgram,
      ]);
      mockPrismaService.program.count.mockResolvedValue(1);

      const result = await service.searchPrograms(searchDto);

      expect(cacheService.generateKey).toHaveBeenCalled();
      expect(cacheService.get).toHaveBeenCalled();
      expect(prismaService.program.count).toHaveBeenCalledWith({
        where: {
          status: Status.PUBLISHED,
        },
      });
      expect(prismaService.program.findMany).toHaveBeenCalledWith({
        where: {
          status: Status.PUBLISHED,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: {
          releaseDate: 'desc',
        },
        skip: 0,
        take: 20,
      });
      expect(cacheService.set).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(mockPublishedProgram.id);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should return cached result when available (cache hit)', async () => {
      const searchDto = new SearchProgramsDto();
      const cachedResult = {
        data: [mockPublishedProgram],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await service.searchPrograms(searchDto);

      expect(cacheService.get).toHaveBeenCalled();
      expect(prismaService.program.findMany).not.toHaveBeenCalled();
      expect(prismaService.program.count).not.toHaveBeenCalled();
      expect(result).toBe(cachedResult);
    });

    it('should search programs with query parameter', async () => {
      const searchDto = new SearchProgramsDto();
      searchDto.q = 'programming';
      const mockCountResult = [{ count: '1' }];
      const mockRawResult = [
        {
          id: 1,
          name: 'Introduction to Programming',
          description: 'A comprehensive introduction to programming concepts',
          language: 'ENGLISH',
          durationSec: 3600,
          releaseDate: new Date('2024-01-01'),
          mediaUrl: 'https://example.com/media/program1.mp4',
          mediaType: 'VIDEO',
          status: 'PUBLISHED',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          categoryId: 1,
          categoryName: 'Technology',
          categoryDescription: 'Technology and programming courses',
        },
      ];

      // Mock the count query first, then the data query
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockRawResult);

      const result = await service.searchPrograms(searchDto);

      expect(prismaService.$queryRaw).toHaveBeenCalledTimes(2);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Introduction to Programming');
      expect(result.data[0].category).toEqual({
        id: 1,
        name: 'Technology',
        description: 'Technology and programming courses',
      });
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should return empty array when no programs match search', async () => {
      const searchDto = new SearchProgramsDto();
      searchDto.q = 'nonexistent';
      const mockCountResult = [{ count: '0' }];
      
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce([]);

      const result = await service.searchPrograms(searchDto);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should only return published programs in search', async () => {
      const searchDto = new SearchProgramsDto();
      searchDto.q = 'program';
      const mockCountResult = [{ count: '0' }];
      
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce([]);

      await service.searchPrograms(searchDto);

      expect(prismaService.$queryRaw).toHaveBeenCalledTimes(2);
      // The SQL query includes WHERE p.status = 'PUBLISHED'
      const queryCall = mockPrismaService.$queryRaw.mock.calls[0];
      expect(queryCall[0].raw[0]).toContain("WHERE p.status = 'PUBLISHED'");
    });
  });

  describe('browsePrograms', () => {
    it('should browse programs without filters (cache miss)', async () => {
      const browseDto = new BrowseProgramsDto();
      mockPrismaService.program.findMany.mockResolvedValue([
        mockPublishedProgram,
      ]);
      mockPrismaService.program.count.mockResolvedValue(1);

      const result = await service.browsePrograms(browseDto);

      expect(cacheService.generateKey).toHaveBeenCalled();
      expect(cacheService.get).toHaveBeenCalled();
      expect(prismaService.program.count).toHaveBeenCalledWith({
        where: {
          status: Status.PUBLISHED,
        },
      });
      expect(prismaService.program.findMany).toHaveBeenCalledWith({
        where: {
          status: Status.PUBLISHED,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: {
          releaseDate: 'desc',
        },
        skip: 0,
        take: 20,
      });
      expect(cacheService.set).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should return cached result when available (cache hit)', async () => {
      const browseDto = new BrowseProgramsDto();
      const cachedResult = {
        data: [mockPublishedProgram],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await service.browsePrograms(browseDto);

      expect(cacheService.get).toHaveBeenCalled();
      expect(prismaService.program.findMany).not.toHaveBeenCalled();
      expect(prismaService.program.count).not.toHaveBeenCalled();
      expect(result).toBe(cachedResult);
    });

    it('should browse programs with category filter', async () => {
      const browseDto = new BrowseProgramsDto();
      browseDto.categoryId = 1;
      mockPrismaService.program.findMany.mockResolvedValue([
        mockPublishedProgram,
      ]);
      mockPrismaService.program.count.mockResolvedValue(1);

      const result = await service.browsePrograms(browseDto);

      expect(prismaService.program.count).toHaveBeenCalledWith({
        where: {
          status: Status.PUBLISHED,
          categoryId: 1,
        },
      });
      expect(prismaService.program.findMany).toHaveBeenCalledWith({
        where: {
          status: Status.PUBLISHED,
          categoryId: 1,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: {
          releaseDate: 'desc',
        },
        skip: 0,
        take: 20,
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should browse programs with language filter', async () => {
      const browseDto = new BrowseProgramsDto();
      browseDto.language = Language.ENGLISH;
      mockPrismaService.program.findMany.mockResolvedValue([
        mockPublishedProgram,
      ]);
      mockPrismaService.program.count.mockResolvedValue(1);

      await service.browsePrograms(browseDto);

      expect(prismaService.program.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: Status.PUBLISHED,
            language: Language.ENGLISH,
          }),
        }),
      );
      expect(prismaService.program.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: Status.PUBLISHED,
            language: Language.ENGLISH,
          }),
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should browse programs with media type filter', async () => {
      const browseDto = new BrowseProgramsDto();
      browseDto.mediaType = MediaType.VIDEO;
      mockPrismaService.program.findMany.mockResolvedValue([
        mockPublishedProgram,
      ]);
      mockPrismaService.program.count.mockResolvedValue(1);

      await service.browsePrograms(browseDto);

      expect(prismaService.program.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: Status.PUBLISHED,
            mediaType: MediaType.VIDEO,
          }),
        }),
      );
      expect(prismaService.program.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: Status.PUBLISHED,
            mediaType: MediaType.VIDEO,
          }),
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should browse programs with multiple filters', async () => {
      const browseDto = new BrowseProgramsDto();
      browseDto.categoryId = 1;
      browseDto.language = Language.ENGLISH;
      browseDto.mediaType = MediaType.VIDEO;
      mockPrismaService.program.findMany.mockResolvedValue([
        mockPublishedProgram,
      ]);
      mockPrismaService.program.count.mockResolvedValue(1);

      await service.browsePrograms(browseDto);

      expect(prismaService.program.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: Status.PUBLISHED,
            categoryId: 1,
            language: Language.ENGLISH,
            mediaType: MediaType.VIDEO,
          },
        }),
      );
      expect(prismaService.program.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: Status.PUBLISHED,
            categoryId: 1,
            language: Language.ENGLISH,
            mediaType: MediaType.VIDEO,
          },
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe('getProgram', () => {
    it('should get program by id (cache miss)', async () => {
      const programId = 1;
      mockPrismaService.program.findFirst.mockResolvedValue(
        mockPublishedProgram,
      );

      const result = await service.getProgram(programId);

      expect(cacheService.generateKey).toHaveBeenCalledWith(
        expect.any(String),
        { id: programId },
      );
      expect(cacheService.get).toHaveBeenCalled();
      expect(prismaService.program.findFirst).toHaveBeenCalledWith({
        where: {
          id: programId,
          status: Status.PUBLISHED,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });
      expect(cacheService.set).toHaveBeenCalled();
      expect(result.id).toBe(programId);
      expect(result.name).toBe('Introduction to Programming');
    });

    it('should return cached result when available (cache hit)', async () => {
      const programId = 1;
      mockCacheService.get.mockResolvedValue(mockPublishedProgram);

      const result = await service.getProgram(programId);

      expect(cacheService.get).toHaveBeenCalled();
      expect(prismaService.program.findFirst).not.toHaveBeenCalled();
      expect(result).toBe(mockPublishedProgram);
    });

    it('should throw NotFoundException when program not found', async () => {
      const programId = 999;
      mockPrismaService.program.findFirst.mockResolvedValue(null);

      await expect(service.getProgram(programId)).rejects.toThrow(
        new NotFoundException(
          `Published program with ID ${programId} not found`,
        ),
      );
    });

    it('should throw NotFoundException when program is not published', async () => {
      const programId = 2;
      mockPrismaService.program.findFirst.mockResolvedValue(null);

      await expect(service.getProgram(programId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should only return published programs', async () => {
      const programId = 1;
      mockPrismaService.program.findFirst.mockResolvedValue(
        mockPublishedProgram,
      );

      await service.getProgram(programId);

      expect(prismaService.program.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: Status.PUBLISHED,
          }),
        }),
      );
    });
  });
});
