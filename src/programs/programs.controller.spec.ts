import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { Language, MediaType } from '@prisma/client';

describe('ProgramsController', () => {
  let controller: ProgramsController;
  let service: jest.Mocked<ProgramsService>;

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

  const mockProgramsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findByLanguage: jest.fn(),
    findByMediaType: jest.fn(),
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
      };

      service.create.mockResolvedValue(mockProgram as any);

      const result = await controller.create(createProgramDto);

      expect(service.create).toHaveBeenCalledWith(createProgramDto);
      expect(result).toEqual(mockProgram);
    });
  });

  describe('findAll', () => {
    it('should return all programs when no query params', async () => {
      const programs = [mockProgram];
      service.findAll.mockResolvedValue(programs as any);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(programs);
    });

    it('should return recent programs when recent param provided', async () => {
      const recentPrograms = [mockProgram];
      service.findRecent.mockResolvedValue(recentPrograms as any);

      const result = await controller.findAll(undefined, undefined, '5');

      expect(service.findRecent).toHaveBeenCalledWith(5);
      expect(result).toEqual(recentPrograms);
    });

    it('should return recent programs with default limit when recent param is invalid', async () => {
      const recentPrograms = [mockProgram];
      service.findRecent.mockResolvedValue(recentPrograms as any);

      const result = await controller.findAll(undefined, undefined, 'invalid');

      expect(service.findRecent).toHaveBeenCalledWith(10);
      expect(result).toEqual(recentPrograms);
    });

    it('should return programs by language when language param provided', async () => {
      const englishPrograms = [mockProgram];
      service.findByLanguage.mockResolvedValue(englishPrograms as any);

      const result = await controller.findAll(Language.ENGLISH);

      expect(service.findByLanguage).toHaveBeenCalledWith(Language.ENGLISH);
      expect(result).toEqual(englishPrograms);
    });

    it('should return programs by media type when mediaType param provided', async () => {
      const videoPrograms = [mockProgram];
      service.findByMediaType.mockResolvedValue(videoPrograms as any);

      const result = await controller.findAll(undefined, MediaType.VIDEO);

      expect(service.findByMediaType).toHaveBeenCalledWith(MediaType.VIDEO);
      expect(result).toEqual(videoPrograms);
    });

    it('should prioritize recent over other filters', async () => {
      const recentPrograms = [mockProgram];
      service.findRecent.mockResolvedValue(recentPrograms as any);

      const result = await controller.findAll(
        Language.ENGLISH,
        MediaType.VIDEO,
        '3',
      );

      expect(service.findRecent).toHaveBeenCalledWith(3);
      expect(service.findByLanguage).not.toHaveBeenCalled();
      expect(service.findByMediaType).not.toHaveBeenCalled();
      expect(result).toEqual(recentPrograms);
    });

    it('should prioritize language over mediaType when both provided', async () => {
      const englishPrograms = [mockProgram];
      service.findByLanguage.mockResolvedValue(englishPrograms as any);

      const result = await controller.findAll(
        Language.ENGLISH,
        MediaType.VIDEO,
      );

      expect(service.findByLanguage).toHaveBeenCalledWith(Language.ENGLISH);
      expect(service.findByMediaType).not.toHaveBeenCalled();
      expect(result).toEqual(englishPrograms);
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
