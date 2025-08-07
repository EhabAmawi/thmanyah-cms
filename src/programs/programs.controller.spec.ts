import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { Language, MediaType, Status } from '@prisma/client';

describe('ProgramsController', () => {
  let controller: ProgramsController;
  let service: jest.Mocked<ProgramsService>;

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

  const mockProgramsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findByLanguage: jest.fn(),
    findByMediaType: jest.fn(),
    findByStatus: jest.fn(),
    findByCategory: jest.fn(),
    findRecent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgramsController],
      providers: [
        {
          provide: ProgramsService,
          useValue: mockProgramsService,
        },
      ],
    }).compile();

    controller = module.get<ProgramsController>(ProgramsController);
    service = module.get(ProgramsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new program', async () => {
      const createProgramDto: CreateProgramDto = {
        name: 'Introduction to Programming',
        description: 'A comprehensive introduction to programming concepts',
        durationSec: 3600,
        releaseDate: '2024-01-01T00:00:00.000Z',
        mediaUrl: 'https://example.com/media/program1.mp4',
        categoryId: 1,
      };

      service.create.mockResolvedValue(mockProgram as any);

      const result = await controller.create(createProgramDto);

      expect(service.create).toHaveBeenCalledWith(createProgramDto);
      expect(result).toEqual(mockProgram);
    });
  });

  describe('findAll', () => {
    it('should return paginated programs when no query params', async () => {
      const paginatedResponse = {
        data: [mockProgram],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      service.findAllPaginated.mockResolvedValue(paginatedResponse as any);

      const result = await controller.findAll({});

      expect(service.findAllPaginated).toHaveBeenCalledWith({});
      expect(result).toEqual(paginatedResponse);
    });

    it('should return paginated programs with language filter', async () => {
      const queryDto = { language: Language.ENGLISH };
      const paginatedResponse = {
        data: [mockProgram],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      service.findAllPaginated.mockResolvedValue(paginatedResponse as any);

      const result = await controller.findAll(queryDto);

      expect(service.findAllPaginated).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return paginated programs with mediaType filter', async () => {
      const queryDto = { mediaType: MediaType.VIDEO };
      const paginatedResponse = {
        data: [mockProgram],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      service.findAllPaginated.mockResolvedValue(paginatedResponse as any);

      const result = await controller.findAll(queryDto);

      expect(service.findAllPaginated).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return paginated programs with status filter', async () => {
      const queryDto = { status: Status.PUBLISHED };
      const paginatedResponse = {
        data: [mockProgram],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      service.findAllPaginated.mockResolvedValue(paginatedResponse as any);

      const result = await controller.findAll(queryDto);

      expect(service.findAllPaginated).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return paginated programs with category filter', async () => {
      const queryDto = { categoryId: 1 };
      const paginatedResponse = {
        data: [mockProgram],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      service.findAllPaginated.mockResolvedValue(paginatedResponse as any);

      const result = await controller.findAll(queryDto);

      expect(service.findAllPaginated).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return paginated programs with pagination params', async () => {
      const queryDto = { page: 2, limit: 10 };
      const paginatedResponse = {
        data: [mockProgram],
        meta: { page: 2, limit: 10, total: 15, totalPages: 2 },
      };
      service.findAllPaginated.mockResolvedValue(paginatedResponse as any);

      const result = await controller.findAll(queryDto);

      expect(service.findAllPaginated).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(paginatedResponse);
    });

    it('should return paginated programs with multiple filters', async () => {
      const queryDto = { 
        language: Language.ENGLISH, 
        mediaType: MediaType.VIDEO,
        status: Status.PUBLISHED,
        categoryId: 1,
        page: 1,
        limit: 5
      };
      const paginatedResponse = {
        data: [mockProgram],
        meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
      };
      service.findAllPaginated.mockResolvedValue(paginatedResponse as any);

      const result = await controller.findAll(queryDto);

      expect(service.findAllPaginated).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(paginatedResponse);
    });
  });

  describe('findOne', () => {
    it('should return a program by id', async () => {
      service.findOne.mockResolvedValue(mockProgram as any);

      const result = await controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProgram);
    });

    it('should throw HttpException when program not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne(999)).rejects.toThrow(
        new HttpException('Program not found', HttpStatus.NOT_FOUND),
      );

      expect(service.findOne).toHaveBeenCalledWith(999);
    });
  });

  describe('update', () => {
    it('should update a program', async () => {
      const updateProgramDto: UpdateProgramDto = {
        name: 'Updated Program',
        description: 'Updated description',
      };

      const updatedProgram = { ...mockProgram, ...updateProgramDto };
      service.update.mockResolvedValue(updatedProgram as any);

      const result = await controller.update(1, updateProgramDto);

      expect(service.update).toHaveBeenCalledWith(1, updateProgramDto);
      expect(result).toEqual(updatedProgram);
    });
  });

  describe('remove', () => {
    it('should delete a program', async () => {
      service.remove.mockResolvedValue(mockProgram as any);

      const result = await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'Program deleted successfully' });
    });
  });
});
