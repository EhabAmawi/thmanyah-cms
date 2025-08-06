import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesModule } from './categories.module';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaModule } from '../prisma/prisma.module';

describe('CategoriesModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [CategoriesModule, PrismaModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('module setup', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should provide CategoriesService', () => {
      const categoriesService =
        module.get<CategoriesService>(CategoriesService);
      expect(categoriesService).toBeDefined();
      expect(categoriesService).toBeInstanceOf(CategoriesService);
    });

    it('should provide CategoriesController', () => {
      const categoriesController =
        module.get<CategoriesController>(CategoriesController);
      expect(categoriesController).toBeDefined();
      expect(categoriesController).toBeInstanceOf(CategoriesController);
    });

    it('should export CategoriesService', () => {
      const categoriesService =
        module.get<CategoriesService>(CategoriesService);
      expect(categoriesService).toBeDefined();
    });
  });

  describe('dependency injection', () => {
    it('should properly inject dependencies', () => {
      const categoriesService =
        module.get<CategoriesService>(CategoriesService);
      const categoriesController =
        module.get<CategoriesController>(CategoriesController);

      expect(categoriesService).toBeDefined();
      expect(categoriesController).toBeDefined();
    });
  });
});
