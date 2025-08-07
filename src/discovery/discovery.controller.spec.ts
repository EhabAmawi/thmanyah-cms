import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { SearchProgramsDto } from './dto/search-programs.dto';
import { BrowseProgramsDto } from './dto/browse-programs.dto';
import { ProgramDiscoveryDto } from './dto/program-discovery.dto';
import { Language, MediaType, Status } from '@prisma/client';

describe('DiscoveryController', () => {
  let controller: DiscoveryController;
  let service: jest.Mocked<DiscoveryService>;

  const mockCategory = {
    id: 1,
    name: 'Technology',
    description: 'Technology and programming courses',
  };

  const mockProgramDiscoveryDto: ProgramDiscoveryDto = {
    id: 1,
    name: 'Introduction to Programming',
    description: 'A comprehensive introduction to programming concepts',
    language: Language.ENGLISH,
    durationSec: 3600,
    releaseDate: new Date('2024-01-01'),
    mediaUrl: 'https://example.com/media/program1.mp4',
    mediaType: MediaType.VIDEO,
    status: Status.PUBLISHED,
    category: mockCategory,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockDiscoveryService = {
    searchPrograms: jest.fn(),
    browsePrograms: jest.fn(),
    getProgram: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoveryController],
      providers: [
        {
          provide: DiscoveryService,
          useValue: mockDiscoveryService,
        },
      ],
    }).compile();

    controller = module.get<DiscoveryController>(DiscoveryController);
    service = module.get(DiscoveryService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('searchPrograms', () => {
    it('should search programs without query', async () => {
      const searchDto: SearchProgramsDto = {};
      const expectedResult = [mockProgramDiscoveryDto];
      mockDiscoveryService.searchPrograms.mockResolvedValue(expectedResult);

      const result = await controller.searchPrograms(searchDto);

      expect(service.searchPrograms).toHaveBeenCalledWith(searchDto);
      expect(result).toEqual(expectedResult);
    });

    it('should search programs with query', async () => {
      const searchDto: SearchProgramsDto = { q: 'programming' };
      const expectedResult = [mockProgramDiscoveryDto];
      mockDiscoveryService.searchPrograms.mockResolvedValue(expectedResult);

      const result = await controller.searchPrograms(searchDto);

      expect(service.searchPrograms).toHaveBeenCalledWith(searchDto);
      expect(result).toEqual(expectedResult);
    });

    it('should return empty array when no programs found', async () => {
      const searchDto: SearchProgramsDto = { q: 'nonexistent' };
      const expectedResult: ProgramDiscoveryDto[] = [];
      mockDiscoveryService.searchPrograms.mockResolvedValue(expectedResult);

      const result = await controller.searchPrograms(searchDto);

      expect(service.searchPrograms).toHaveBeenCalledWith(searchDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      const searchDto: SearchProgramsDto = { q: 'error' };
      const error = new Error('Database error');
      mockDiscoveryService.searchPrograms.mockRejectedValue(error);

      await expect(controller.searchPrograms(searchDto)).rejects.toThrow(
        'Database error',
      );
      expect(service.searchPrograms).toHaveBeenCalledWith(searchDto);
    });
  });

  describe('browsePrograms', () => {
    it('should browse programs without filters', async () => {
      const browseDto: BrowseProgramsDto = {};
      const expectedResult = [mockProgramDiscoveryDto];
      mockDiscoveryService.browsePrograms.mockResolvedValue(expectedResult);

      const result = await controller.browsePrograms(browseDto);

      expect(service.browsePrograms).toHaveBeenCalledWith(browseDto);
      expect(result).toEqual(expectedResult);
    });

    it('should browse programs with category filter', async () => {
      const browseDto: BrowseProgramsDto = { categoryId: 1 };
      const expectedResult = [mockProgramDiscoveryDto];
      mockDiscoveryService.browsePrograms.mockResolvedValue(expectedResult);

      const result = await controller.browsePrograms(browseDto);

      expect(service.browsePrograms).toHaveBeenCalledWith(browseDto);
      expect(result).toEqual(expectedResult);
    });

    it('should browse programs with language filter', async () => {
      const browseDto: BrowseProgramsDto = { language: Language.ENGLISH };
      const expectedResult = [mockProgramDiscoveryDto];
      mockDiscoveryService.browsePrograms.mockResolvedValue(expectedResult);

      const result = await controller.browsePrograms(browseDto);

      expect(service.browsePrograms).toHaveBeenCalledWith(browseDto);
      expect(result).toEqual(expectedResult);
    });

    it('should browse programs with mediaType filter', async () => {
      const browseDto: BrowseProgramsDto = { mediaType: MediaType.VIDEO };
      const expectedResult = [mockProgramDiscoveryDto];
      mockDiscoveryService.browsePrograms.mockResolvedValue(expectedResult);

      const result = await controller.browsePrograms(browseDto);

      expect(service.browsePrograms).toHaveBeenCalledWith(browseDto);
      expect(result).toEqual(expectedResult);
    });

    it('should browse programs with multiple filters', async () => {
      const browseDto: BrowseProgramsDto = {
        categoryId: 1,
        language: Language.ENGLISH,
        mediaType: MediaType.VIDEO,
      };
      const expectedResult = [mockProgramDiscoveryDto];
      mockDiscoveryService.browsePrograms.mockResolvedValue(expectedResult);

      const result = await controller.browsePrograms(browseDto);

      expect(service.browsePrograms).toHaveBeenCalledWith(browseDto);
      expect(result).toEqual(expectedResult);
    });

    it('should return empty array when no programs found', async () => {
      const browseDto: BrowseProgramsDto = { categoryId: 999 };
      const expectedResult: ProgramDiscoveryDto[] = [];
      mockDiscoveryService.browsePrograms.mockResolvedValue(expectedResult);

      const result = await controller.browsePrograms(browseDto);

      expect(service.browsePrograms).toHaveBeenCalledWith(browseDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      const browseDto: BrowseProgramsDto = {};
      const error = new Error('Database error');
      mockDiscoveryService.browsePrograms.mockRejectedValue(error);

      await expect(controller.browsePrograms(browseDto)).rejects.toThrow(
        'Database error',
      );
      expect(service.browsePrograms).toHaveBeenCalledWith(browseDto);
    });
  });

  describe('getProgram', () => {
    it('should get a program by id', async () => {
      const programId = 1;
      const expectedResult = mockProgramDiscoveryDto;
      mockDiscoveryService.getProgram.mockResolvedValue(expectedResult);

      const result = await controller.getProgram(programId);

      expect(service.getProgram).toHaveBeenCalledWith(programId);
      expect(result).toEqual(expectedResult);
    });

    it('should throw NotFoundException when program not found', async () => {
      const programId = 999;
      const error = new NotFoundException(
        'Published program with ID 999 not found',
      );
      mockDiscoveryService.getProgram.mockRejectedValue(error);

      await expect(controller.getProgram(programId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getProgram(programId)).rejects.toThrow(
        'Published program with ID 999 not found',
      );
      expect(service.getProgram).toHaveBeenCalledWith(programId);
    });

    it('should handle service errors', async () => {
      const programId = 1;
      const error = new Error('Database error');
      mockDiscoveryService.getProgram.mockRejectedValue(error);

      await expect(controller.getProgram(programId)).rejects.toThrow(
        'Database error',
      );
      expect(service.getProgram).toHaveBeenCalledWith(programId);
    });

    it('should parse id parameter correctly', async () => {
      const programId = 123;
      const expectedResult = { ...mockProgramDiscoveryDto, id: programId };
      mockDiscoveryService.getProgram.mockResolvedValue(expectedResult);

      const result = await controller.getProgram(programId);

      expect(service.getProgram).toHaveBeenCalledWith(programId);
      expect(result.id).toBe(programId);
    });
  });
});
