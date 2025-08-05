import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockCategory = {
    id: 1,
    name: 'Electronics',
    description: 'Electronic devices and accessories',
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockPrismaService = {
    category: {
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
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new category', async () => {
      const createCategoryDto: CreateCategoryDto = {
        name: 'Electronics',
        description: 'Electronic devices and accessories',
      };

      mockPrismaService.category.create.mockResolvedValue(mockCategory as any);

      const result = await service.create(createCategoryDto);

      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
        data: createCategoryDto,
      });
      expect(result).toEqual(mockCategory);
    });

    it('should create a category without description', async () => {
      const createCategoryDto: CreateCategoryDto = {
        name: 'Books',
      };

      const categoryWithoutDescription = {
        ...mockCategory,
        name: 'Books',
        description: null,
      };

      mockPrismaService.category.create.mockResolvedValue(
        categoryWithoutDescription as any,
      );

      const result = await service.create(createCategoryDto);

      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
        data: createCategoryDto,
      });
      expect(result).toEqual(categoryWithoutDescription);
    });
  });

  describe('findAll', () => {
    it('should return all categories ordered by createdAt desc', async () => {
      const categories = [mockCategory];
      mockPrismaService.category.findMany.mockResolvedValue(categories as any);

      const result = await service.findAll();

      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual(categories);
    });

    it('should return empty array when no categories exist', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single category by id', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(
        mockCategory as any,
      );

      const result = await service.findOne(1);

      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockCategory);
    });

    it('should return null if category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Updated Electronics',
        description: 'Updated description',
      };

      const updatedCategory = { ...mockCategory, ...updateCategoryDto };
      mockPrismaService.category.update.mockResolvedValue(
        updatedCategory as any,
      );

      const result = await service.update(1, updateCategoryDto);

      expect(mockPrismaService.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateCategoryDto,
      });
      expect(result).toEqual(updatedCategory);
    });

    it('should update only provided fields', async () => {
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Updated Electronics',
      };

      const updatedCategory = { ...mockCategory, ...updateCategoryDto };
      mockPrismaService.category.update.mockResolvedValue(
        updatedCategory as any,
      );

      const result = await service.update(1, updateCategoryDto);

      expect(mockPrismaService.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateCategoryDto,
      });
      expect(result).toEqual(updatedCategory);
    });
  });

  describe('remove', () => {
    it('should delete a category', async () => {
      mockPrismaService.category.delete.mockResolvedValue(mockCategory as any);

      const result = await service.remove(1);

      expect(mockPrismaService.category.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockCategory);
    });
  });

  describe('findActive', () => {
    it('should return only active categories ordered by name asc', async () => {
      const activeCategories = [mockCategory];
      mockPrismaService.category.findMany.mockResolvedValue(
        activeCategories as any,
      );

      const result = await service.findActive();

      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: {
          name: 'asc',
        },
      });
      expect(result).toEqual(activeCategories);
    });

    it('should return empty array when no active categories exist', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.findActive();

      expect(result).toEqual([]);
    });
  });
});