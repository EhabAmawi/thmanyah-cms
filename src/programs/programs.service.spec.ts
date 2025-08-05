import { Test, TestingModule } from '@nestjs/testing';
import { ProgramsService } from './programs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { Language, MediaType } from '@prisma/client';

describe('ProgramsService', () => {
  let service: ProgramsService;

  const mockProgram = {
    id: 1,
    name: 'Introduction to Programming',
    description: 'A comprehensive introduction to programming concepts',
    language: Language.ENGLISH,
    durationSec: 3600,
    releaseDate: new Date('2024-01-01'),
    mediaUrl: 'https://example.com/media/program1.mp4',
    mediaType: MediaType.VIDEO,
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProgramsService>(ProgramsService);
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
      };

      mockPrismaService.program.create.mockResolvedValue(mockProgram);

      const result = await service.create(createProgramDto);

      expect(mockPrismaService.program.create).toHaveBeenCalledWith({
        data: {
          ...createProgramDto,
          releaseDate: new Date(createProgramDto.releaseDate),
          language: Language.ENGLISH,
          mediaType: MediaType.VIDEO,
        },
      });
      expect(result).toEqual(mockProgram);
    });

    it('should create a program with specified language and mediaType', async () => {
      const createProgramDto: CreateProgramDto = {
        name: 'Arabic Program',
        description: 'Arabic content',
        language: Language.ARABIC,
        durationSec: 1800,
        releaseDate: '2024-01-01T00:00:00.000Z',
        mediaUrl: 'https://example.com/media/audio1.mp3',
        mediaType: MediaType.AUDIO,
      };

      const arabicProgram = { ...mockProgram, language: Language.ARABIC, mediaType: MediaType.AUDIO };
      mockPrismaService.program.create.mockResolvedValue(arabicProgram);

      const result = await service.create(createProgramDto);

      expect(mockPrismaService.program.create).toHaveBeenCalledWith({
        data: {
          ...createProgramDto,
          releaseDate: new Date(createProgramDto.releaseDate),
          language: Language.ARABIC,
          mediaType: MediaType.AUDIO,
        },
      });
      expect(result).toEqual(arabicProgram);
    });
  });

  describe('findAll', () => {
    it('should return all programs ordered by creation date', async () => {
      const programs = [mockProgram];
      mockPrismaService.program.findMany.mockResolvedValue(programs);

      const result = await service.findAll();

      expect(mockPrismaService.program.findMany).toHaveBeenCalledWith({
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
      });
      expect(result).toEqual(mockProgram);
    });

    it('should return null if program not found', async () => {
      mockPrismaService.program.findUnique.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(mockPrismaService.program.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
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
      });
      expect(result).toEqual(updatedProgram);
    });

    it('should update a program with releaseDate conversion', async () => {
      const updateProgramDto: UpdateProgramDto = {
        releaseDate: '2024-02-01T00:00:00.000Z',
      };

      const updatedProgram = { ...mockProgram, releaseDate: new Date('2024-02-01') };
      mockPrismaService.program.update.mockResolvedValue(updatedProgram);

      const result = await service.update(1, updateProgramDto);

      expect(mockPrismaService.program.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          releaseDate: new Date(updateProgramDto.releaseDate),
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
        orderBy: {
          releaseDate: 'desc',
        },
      });
      expect(result).toEqual(programs);
    });
  });
});