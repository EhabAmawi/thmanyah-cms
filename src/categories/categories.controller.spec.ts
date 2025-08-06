import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: jest.Mocked<CategoriesService>;

  const mockCategory = {
    id: 1,
    name: 'Electronics',
    description: 'Electronic devices and accessories',
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findActive: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get(CategoriesService);
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

      service.create.mockResolvedValue(mockCategory as any);

      const result = await controller.create(createCategoryDto);

      expect(service.create).toHaveBeenCalledWith(createCategoryDto);
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

      service.create.mockResolvedValue(categoryWithoutDescription as any);

      const result = await controller.create(createCategoryDto);

      expect(service.create).toHaveBeenCalledWith(createCategoryDto);
      expect(result).toEqual(categoryWithoutDescription);
    });
  });

  describe('findAll', () => {
    it('should return all categories when no query params', async () => {
      const categories = [mockCategory];
      service.findAll.mockResolvedValue(categories as any);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(categories);
    });

    it('should return active categories when active=true', async () => {
      const activeCategories = [mockCategory];
      service.findActive.mockResolvedValue(activeCategories as any);

      const result = await controller.findAll('true');

      expect(service.findActive).toHaveBeenCalled();
      expect(result).toEqual(activeCategories);
    });

    it('should return all categories when active=false', async () => {
      const categories = [mockCategory];
      service.findAll.mockResolvedValue(categories as any);

      const result = await controller.findAll('false');

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(categories);
    });

    it('should return all categories when active param is invalid', async () => {
      const categories = [mockCategory];
      service.findAll.mockResolvedValue(categories as any);

      const result = await controller.findAll('invalid');

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(categories);
    });
  });

  describe('findOne', () => {
    it('should return a single category', async () => {
      service.findOne.mockResolvedValue(mockCategory as any);

      const result = await controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockCategory);
    });

    it('should throw HttpException when category not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne(999)).rejects.toThrow(
        new HttpException('Category not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Updated Electronics',
        description: 'Updated description',
      };

      const updatedCategory = { ...mockCategory, ...updateCategoryDto };
      service.update.mockResolvedValue(updatedCategory as any);

      const result = await controller.update(1, updateCategoryDto);

      expect(service.update).toHaveBeenCalledWith(1, updateCategoryDto);
      expect(result).toEqual(updatedCategory);
    });

    it('should update only provided fields', async () => {
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Updated Electronics',
      };

      const updatedCategory = { ...mockCategory, ...updateCategoryDto };
      service.update.mockResolvedValue(updatedCategory as any);

      const result = await controller.update(1, updateCategoryDto);

      expect(service.update).toHaveBeenCalledWith(1, updateCategoryDto);
      expect(result).toEqual(updatedCategory);
    });
  });

  describe('remove', () => {
    it('should delete a category', async () => {
      service.remove.mockResolvedValue(mockCategory as any);

      const result = await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'Category deleted successfully' });
    });
  });
});
