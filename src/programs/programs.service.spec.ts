import { Test, TestingModule } from '@nestjs/testing';
import { ProgramsService } from './programs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { Language, MediaType, Status } from '@prisma/client';

describe('ProgramsService', () => {
  let service: ProgramsService;
  let cacheService: jest.Mocked<CacheService>;

  const mockCategory = {
    id: 1,
    name: 'Programming',
    description: 'Programming courses',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockProgram = {
    id: 1,
    name: 'Introduction to Programming',
    description: 'A comprehensive introduction to programming concepts',
    language: Language.ENGLISH,
    durationSec: 3600,
    releaseDate: new Date('2024-01-01'),
    mediaUrl: 'https://example.com/media/program1.mp4',
    mediaType: MediaType.VIDEO,
    status: Status.DRAFT,
    categoryId: 1,
    category: mockCategory,
    sourceType: 'MANUAL',
    sourceUrl: null,
    externalId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPrismaService = {
    program: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
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
        ProgramsService,
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

    service = module.get<ProgramsService>(ProgramsService);
    cacheService = module.get(CacheService);

    // Reset all mocks and setup default cache behavior
    jest.clearAllMocks();
    mockCacheService.generateKey.mockReturnValue('test-cache-key');
    mockCacheService.delPattern.mockResolvedValue(undefined);
    mockCacheService.del.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a program with default values', async () => {
      const createProgramDto: CreateProgramDto = {
        name: 'Introduction to Programming',
        description: 'A comprehensive introduction to programming concepts',
        durationSec: 3600,
        releaseDate: '2024-01-01T00:00:00.000Z',
        mediaUrl: 'https://example.com/media/program1.mp4',
        categoryId: 1,
      };

      mockPrismaService.program.create.mockResolvedValue(mockProgram);

      const result = await service.create(createProgramDto);

      expect(mockPrismaService.program.create).toHaveBeenCalledWith({
        data: {
          ...createProgramDto,
          releaseDate: new Date(createProgramDto.releaseDate),
          language: Language.ENGLISH,
          mediaType: MediaType.VIDEO,
          status: Status.DRAFT,
          sourceType: 'MANUAL',
          sourceUrl: null,
          externalId: null,
        },
        include: {
          category: true,
        },
      });
      // Draft program should not invalidate cache
      expect(cacheService.delPattern).not.toHaveBeenCalled();
      expect(result).toEqual(mockProgram);
    });

    it('should create a program with specified language, mediaType, and status', async () => {
      const createProgramDto: CreateProgramDto = {
        name: 'Arabic Program',
        description: 'Arabic content',
        language: Language.ARABIC,
        durationSec: 1800,
        releaseDate: '2024-01-01T00:00:00.000Z',
        mediaUrl: 'https://example.com/media/audio1.mp3',
        mediaType: MediaType.AUDIO,
        status: Status.PUBLISHED,
        categoryId: 1,
      };

      const arabicProgram = {
        ...mockProgram,
        language: Language.ARABIC,
        mediaType: MediaType.AUDIO,
        status: Status.PUBLISHED,
      };
      mockPrismaService.program.create.mockResolvedValue(arabicProgram);

      const result = await service.create(createProgramDto);

      expect(mockPrismaService.program.create).toHaveBeenCalledWith({
        data: {
          ...createProgramDto,
          releaseDate: new Date(createProgramDto.releaseDate),
          language: Language.ARABIC,
          mediaType: MediaType.AUDIO,
          status: Status.PUBLISHED,
          sourceType: 'MANUAL',
          sourceUrl: null,
          externalId: null,
        },
        include: {
          category: true,
        },
      });
      // Published program should invalidate cache
      expect(cacheService.delPattern).toHaveBeenCalledWith('discovery:search:*');
      expect(cacheService.delPattern).toHaveBeenCalledWith('discovery:browse:*');
      expect(result).toEqual(arabicProgram);
    });
  });

  describe('findAll', () => {
    it('should return all programs ordered by creation date', async () => {
      const programs = [mockProgram];
      mockPrismaService.program.findMany.mockResolvedValue(programs);

      const result = await service.findAll();

      expect(mockPrismaService.program.findMany).toHaveBeenCalledWith({
        include: {
          category: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual(programs);
    });
  });

  describe('findOne', () => {
    it('should return a program by id', async () => {
      mockPrismaService.program.findUnique.mockResolvedValue(mockProgram);

      const result = await service.findOne(1);

      expect(mockPrismaService.program.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          category: true,
        },
      });
      expect(result).toEqual(mockProgram);
    });

    it('should return null if program not found', async () => {
      mockPrismaService.program.findUnique.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(mockPrismaService.program.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
        include: {
          category: true,
        },
      });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a program', async () => {
      const updateProgramDto: UpdateProgramDto = {
        name: 'Updated Program',
        description: 'Updated description',
      };

      const updatedProgram = { ...mockProgram, ...updateProgramDto };
      mockPrismaService.program.update.mockResolvedValue(updatedProgram);

      const result = await service.update(1, updateProgramDto);

      expect(mockPrismaService.program.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateProgramDto,
        include: {
          category: true,
        },
      });
      expect(result).toEqual(updatedProgram);
    });

    it('should update a program with releaseDate conversion', async () => {
      const updateProgramDto: UpdateProgramDto = {
        releaseDate: '2024-02-01T00:00:00.000Z',
      };

      const updatedProgram = {
        ...mockProgram,
        releaseDate: new Date('2024-02-01'),
      };
      mockPrismaService.program.update.mockResolvedValue(updatedProgram);

      const result = await service.update(1, updateProgramDto);

      expect(mockPrismaService.program.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          releaseDate: new Date(updateProgramDto.releaseDate!),
        },
        include: {
          category: true,
        },
      });
      expect(result).toEqual(updatedProgram);
    });
  });

  describe('remove', () => {
    it('should delete a program', async () => {
      mockPrismaService.program.delete.mockResolvedValue(mockProgram);

      const result = await service.remove(1);

      expect(mockPrismaService.program.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockProgram);
    });
  });

  describe('findByLanguage', () => {
    it('should return programs filtered by language', async () => {
      const programs = [mockProgram];
      mockPrismaService.program.findMany.mockResolvedValue(programs);

      const result = await service.findByLanguage(Language.ENGLISH);

      expect(mockPrismaService.program.findMany).toHaveBeenCalledWith({
        where: { language: Language.ENGLISH },
        include: {
          category: true,
        },
        orderBy: {
          releaseDate: 'desc',
        },
      });
      expect(result).toEqual(programs);
    });
  });

  describe('findByMediaType', () => {
    it('should return programs filtered by media type', async () => {
      const programs = [mockProgram];
      mockPrismaService.program.findMany.mockResolvedValue(programs);

      const result = await service.findByMediaType(MediaType.VIDEO);

      expect(mockPrismaService.program.findMany).toHaveBeenCalledWith({
        where: { mediaType: MediaType.VIDEO },
        include: {
          category: true,
        },
        orderBy: {
          releaseDate: 'desc',
        },
      });
      expect(result).toEqual(programs);
    });
  });

  describe('findByStatus', () => {
    it('should return programs filtered by status', async () => {
      const programs = [mockProgram];
      mockPrismaService.program.findMany.mockResolvedValue(programs);

      const result = await service.findByStatus(Status.PUBLISHED);

      expect(mockPrismaService.program.findMany).toHaveBeenCalledWith({
        where: { status: Status.PUBLISHED },
        include: {
          category: true,
        },
        orderBy: {
          releaseDate: 'desc',
        },
      });
      expect(result).toEqual(programs);
    });
  });

  describe('findByCategory', () => {
    it('should return programs filtered by category', async () => {
      const programs = [mockProgram];
      mockPrismaService.program.findMany.mockResolvedValue(programs);

      const result = await service.findByCategory(1);

      expect(mockPrismaService.program.findMany).toHaveBeenCalledWith({
        where: { categoryId: 1 },
        include: {
          category: true,
        },
        orderBy: {
          releaseDate: 'desc',
        },
      });
      expect(result).toEqual(programs);
    });
  });

  describe('findRecent', () => {
    it('should return recent programs with default limit', async () => {
      const programs = [mockProgram];
      mockPrismaService.program.findMany.mockResolvedValue(programs);

      const result = await service.findRecent();

      expect(mockPrismaService.program.findMany).toHaveBeenCalledWith({
        take: 10,
        include: {
          category: true,
        },
        orderBy: {
          releaseDate: 'desc',
        },
      });
      expect(result).toEqual(programs);
    });

    it('should return recent programs with custom limit', async () => {
      const programs = [mockProgram];
      mockPrismaService.program.findMany.mockResolvedValue(programs);

      const result = await service.findRecent(5);

      expect(mockPrismaService.program.findMany).toHaveBeenCalledWith({
        take: 5,
        include: {
          category: true,
        },
        orderBy: {
          releaseDate: 'desc',
        },
      });
      expect(result).toEqual(programs);
    });
  });

  describe('Enhanced search methods', () => {
    describe('findPublishedPrograms', () => {
      it('should find published programs with filters', async () => {
        const programs = [{ ...mockProgram, status: Status.PUBLISHED }];
        mockPrismaService.program.findMany.mockResolvedValue(programs);

        const result = await service.findPublishedPrograms({
          categoryId: 1,
          language: Language.ENGLISH,
          mediaType: MediaType.VIDEO,
          limit: 10,
        });

        expect(mockPrismaService.program.findMany).toHaveBeenCalledWith({
          where: {
            status: Status.PUBLISHED,
            categoryId: 1,
            language: Language.ENGLISH,
            mediaType: MediaType.VIDEO,
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
          take: 10,
          skip: undefined,
        });
        expect(result).toEqual(programs);
      });
    });

    describe('searchPrograms', () => {
      it('should search programs using full-text search', async () => {
        const mockRawResult = [{
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
          sourceType: 'MANUAL',
          sourceUrl: null,
          externalId: null,
          categoryId: 1,
          categoryName: 'Programming',
          categoryDescription: 'Programming courses',
        }];
        
        mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockRawResult);

        const result = await service.searchPrograms('programming', {
          categoryId: 1,
          limit: 10,
        });

        expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Introduction to Programming');
        expect(result[0].category).toEqual({
          id: 1,
          name: 'Programming',
          description: 'Programming courses',
        });
      });

      it('should fallback to regular query for empty search', async () => {
        const programs = [{ ...mockProgram, status: Status.PUBLISHED }];
        mockPrismaService.program.findMany.mockResolvedValue(programs);

        const result = await service.searchPrograms('', { categoryId: 1 });

        expect(mockPrismaService.program.findMany).toHaveBeenCalled();
        expect(mockPrismaService.$queryRawUnsafe).not.toHaveBeenCalled();
      });
    });

    describe('getRecentPublishedPrograms', () => {
      it('should get recent published programs', async () => {
        const programs = [{ ...mockProgram, status: Status.PUBLISHED }];
        mockPrismaService.program.findMany.mockResolvedValue(programs);

        const result = await service.getRecentPublishedPrograms(5);

        expect(mockPrismaService.program.findMany).toHaveBeenCalledWith({
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
          take: 5,
        });
        expect(result).toEqual(programs);
      });
    });
  });
});
