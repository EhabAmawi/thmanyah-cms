import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let cacheService: jest.Mocked<CacheService>;

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
        CategoriesService,
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

    service = module.get<CategoriesService>(CategoriesService);
    cacheService = module.get(CacheService);

    // Reset all mocks and setup default cache behavior
    jest.clearAllMocks();
    mockCacheService.generateKey.mockReturnValue('test-cache-key');
    mockCacheService.get.mockResolvedValue(null); // Default cache miss
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.delPattern.mockResolvedValue(undefined);
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
      expect(cacheService.delPattern).toHaveBeenCalledWith('categories:list:*');
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
      expect(cacheService.delPattern).toHaveBeenCalledWith('categories:list:*');
      expect(result).toEqual(categoryWithoutDescription);
    });
  });

  describe('findAll', () => {
    it('should return all categories ordered by createdAt desc (cache miss)', async () => {
      const categories = [mockCategory];
      mockPrismaService.category.findMany.mockResolvedValue(categories as any);

      const result = await service.findAll();

      expect(cacheService.generateKey).toHaveBeenCalled();
      expect(cacheService.get).toHaveBeenCalled();
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(cacheService.set).toHaveBeenCalled();
      expect(result).toEqual(categories);
    });

    it('should return cached result when available (cache hit)', async () => {
      const categories = [mockCategory];
      mockCacheService.get.mockResolvedValue(categories);

      const result = await service.findAll();

      expect(cacheService.get).toHaveBeenCalled();
      expect(mockPrismaService.category.findMany).not.toHaveBeenCalled();
      expect(result).toBe(categories);
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
      expect(cacheService.delPattern).toHaveBeenCalledWith('categories:list:*');
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
      expect(cacheService.delPattern).toHaveBeenCalledWith('categories:list:*');
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
      expect(cacheService.delPattern).toHaveBeenCalledWith('categories:list:*');
      expect(result).toEqual(mockCategory);
    });
  });

  describe('findActive', () => {
    it('should return only active categories ordered by name asc (cache miss)', async () => {
      const activeCategories = [mockCategory];
      mockPrismaService.category.findMany.mockResolvedValue(
        activeCategories as any,
      );

      const result = await service.findActive();

      expect(cacheService.generateKey).toHaveBeenCalled();
      expect(cacheService.get).toHaveBeenCalled();
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: {
          name: 'asc',
        },
      });
      expect(cacheService.set).toHaveBeenCalled();
      expect(result).toEqual(activeCategories);
    });

    it('should return cached result when available (cache hit)', async () => {
      const activeCategories = [mockCategory];
      mockCacheService.get.mockResolvedValue(activeCategories);

      const result = await service.findActive();

      expect(cacheService.get).toHaveBeenCalled();
      expect(mockPrismaService.category.findMany).not.toHaveBeenCalled();
      expect(result).toBe(activeCategories);
    });

    it('should return empty array when no active categories exist', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.findActive();

      expect(result).toEqual([]);
    });
  });
});
