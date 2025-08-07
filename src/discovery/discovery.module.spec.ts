import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryModule } from './discovery.module';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BrowseProgramsDto } from './dto/browse-programs.dto';
import { Language, MediaType, Status } from '@prisma/client';

describe('DiscoveryModule', () => {
  let module: TestingModule;
  let discoveryService: DiscoveryService;
  let discoveryController: DiscoveryController;
  let prismaService: PrismaService;

  const mockCategory = {
    id: 1,
    name: 'Technology',
    description: 'Technology and programming courses',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
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
    sourceType: 'MANUAL',
    sourceUrl: null,
    externalId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPrismaService = {
    program: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DiscoveryModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    discoveryService = module.get<DiscoveryService>(DiscoveryService);
    discoveryController = module.get<DiscoveryController>(DiscoveryController);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Compilation', () => {
    it('should compile the module', () => {
      expect(module).toBeDefined();
    });

    it('should have DiscoveryService defined', () => {
      expect(discoveryService).toBeDefined();
      expect(discoveryService).toBeInstanceOf(DiscoveryService);
    });

    it('should have DiscoveryController defined', () => {
      expect(discoveryController).toBeDefined();
      expect(discoveryController).toBeInstanceOf(DiscoveryController);
    });

    it('should have PrismaService injected', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should search programs through controller and service integration', async () => {
      const searchDto = { q: 'programming' };
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

      const result = await discoveryController.searchPrograms(searchDto);

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

    it('should browse programs through controller and service integration', async () => {
      const browseDto = new BrowseProgramsDto();
      browseDto.categoryId = 1;
      browseDto.language = Language.ENGLISH;
      browseDto.mediaType = MediaType.VIDEO;
      
      mockPrismaService.program.findMany.mockResolvedValue([
        mockPublishedProgram,
      ]);
      mockPrismaService.program.count.mockResolvedValue(1);

      const result = await discoveryController.browsePrograms(browseDto);

      expect(prismaService.program.count).toHaveBeenCalledWith({
        where: {
          status: Status.PUBLISHED,
          categoryId: 1,
          language: Language.ENGLISH,
          mediaType: MediaType.VIDEO,
        },
      });
      expect(prismaService.program.findMany).toHaveBeenCalledWith({
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
        take: 20,
        skip: 0,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].category.name).toBe('Technology');
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should get program by id through controller and service integration', async () => {
      const programId = 1;
      mockPrismaService.program.findFirst.mockResolvedValue(
        mockPublishedProgram,
      );

      const result = await discoveryController.getProgram(programId);

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
      expect(result.id).toBe(programId);
      expect(result.status).toBe(Status.PUBLISHED);
    });

    it('should handle errors through the full stack', async () => {
      const programId = 999;
      mockPrismaService.program.findFirst.mockResolvedValue(null);

      await expect(discoveryController.getProgram(programId)).rejects.toThrow(
        'Published program with ID 999 not found',
      );

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
    });
  });

  describe('Dependency Injection', () => {
    it('should inject PrismaService into DiscoveryService', () => {
      expect(discoveryService).toHaveProperty('prisma');
    });

    it('should inject DiscoveryService into DiscoveryController', () => {
      expect(discoveryController).toHaveProperty('discoveryService');
    });
  });

  describe('Module Dependencies', () => {
    it('should import PrismaModule', () => {
      const prismaModule = module.get(PrismaService);
      expect(prismaModule).toBeDefined();
    });

    it('should provide DiscoveryService', () => {
      const service = module.get(DiscoveryService);
      expect(service).toBeDefined();
    });

    it('should provide DiscoveryController', () => {
      const controller = module.get(DiscoveryController);
      expect(controller).toBeDefined();
    });
  });
});
