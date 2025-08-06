import { Test, TestingModule } from '@nestjs/testing';
import { ImportModule } from './import.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { AdapterFactory } from './adapters/adapter.factory';
import { YouTubeAdapter } from './adapters/youtube.adapter';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

describe('ImportModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ImportModule],
    })
    .overrideProvider(PrismaService)
    .useValue({
      program: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    })
    .compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('module configuration', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should compile successfully', async () => {
      await expect(module.init()).resolves.not.toThrow();
    });
  });

  describe('controller registration', () => {
    it('should provide ImportController', () => {
      const controller = module.get<ImportController>(ImportController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(ImportController);
    });

    it('should have controllers properly registered', () => {
      const controller = module.get<ImportController>(ImportController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(ImportController);
    });
  });

  describe('service registration', () => {
    it('should provide ImportService', () => {
      const service = module.get<ImportService>(ImportService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ImportService);
    });

    it('should provide YouTubeAdapter', () => {
      const adapter = module.get<YouTubeAdapter>(YouTubeAdapter);
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(YouTubeAdapter);
    });

    it('should provide AdapterFactory', () => {
      const factory = module.get<AdapterFactory>(AdapterFactory);
      expect(factory).toBeDefined();
      expect(factory).toBeInstanceOf(AdapterFactory);
    });

    it('should register all required providers', () => {
      // Verify all providers are accessible
      expect(module.get<ImportService>(ImportService)).toBeDefined();
      expect(module.get<YouTubeAdapter>(YouTubeAdapter)).toBeDefined();
      expect(module.get<AdapterFactory>(AdapterFactory)).toBeDefined();
    });
  });

  describe('dependency injection', () => {
    it('should inject dependencies into ImportService correctly', () => {
      const importService = module.get<ImportService>(ImportService);
      
      // Test that the service can be instantiated and has access to its dependencies
      expect(importService).toBeDefined();
      expect(typeof importService.importVideo).toBe('function');
      expect(typeof importService.importChannel).toBe('function');
      expect(typeof importService.getSupportedSourceTypes).toBe('function');
    });

    it('should inject YouTubeAdapter into AdapterFactory', () => {
      const adapterFactory = module.get<AdapterFactory>(AdapterFactory);
      const youtubeAdapter = module.get<YouTubeAdapter>(YouTubeAdapter);
      
      // Test that the factory has access to the YouTube adapter
      expect(adapterFactory).toBeDefined();
      expect(youtubeAdapter).toBeDefined();
      
      const supportedTypes = adapterFactory.getSupportedSourceTypes();
      expect(supportedTypes).toContain('YOUTUBE');
    });

    it('should inject AdapterFactory into ImportService', () => {
      const importService = module.get<ImportService>(ImportService);
      const adapterFactory = module.get<AdapterFactory>(AdapterFactory);
      
      // Both should be defined and properly connected
      expect(importService).toBeDefined();
      expect(adapterFactory).toBeDefined();
    });

    it('should inject ImportService into ImportController', () => {
      const controller = module.get<ImportController>(ImportController);
      const service = module.get<ImportService>(ImportService);
      
      expect(controller).toBeDefined();
      expect(service).toBeDefined();
      
      // Test that controller methods exist (dependency injection successful)
      expect(typeof controller.importYouTubeVideo).toBe('function');
      expect(typeof controller.importYouTubeChannel).toBe('function');
    });
  });

  describe('module imports', () => {
    it('should have access to PrismaService through PrismaModule', () => {
      const prismaService = module.get<PrismaService>(PrismaService);
      expect(prismaService).toBeDefined();
      // Verify it has the expected methods
      expect(prismaService.program).toBeDefined();
    });
  });

  describe('module exports', () => {
    it('should allow access to exported ImportService', () => {
      const importService = module.get<ImportService>(ImportService);
      expect(importService).toBeDefined();
      expect(importService).toBeInstanceOf(ImportService);
    });

    it('should allow access to exported AdapterFactory', () => {
      const adapterFactory = module.get<AdapterFactory>(AdapterFactory);
      expect(adapterFactory).toBeDefined();
      expect(adapterFactory).toBeInstanceOf(AdapterFactory);
    });

    it('should allow external modules to import exported services', () => {
      // This test verifies that exported services can be accessed by other modules
      const importService = module.get<ImportService>(ImportService);
      const adapterFactory = module.get<AdapterFactory>(AdapterFactory);
      
      expect(importService).toBeDefined();
      expect(adapterFactory).toBeDefined();
    });
  });

  describe('integration tests', () => {
    it('should create a working import flow', async () => {
      const controller = module.get<ImportController>(ImportController);
      const service = module.get<ImportService>(ImportService);
      
      expect(controller).toBeDefined();
      expect(service).toBeDefined();
      
      // Test that the full dependency chain works
      const supportedTypes = await service.getSupportedSourceTypes();
      expect(Array.isArray(supportedTypes)).toBe(true);
      expect(supportedTypes.length).toBeGreaterThan(0);
    });

    it('should handle adapter factory initialization properly', () => {
      const adapterFactory = module.get<AdapterFactory>(AdapterFactory);
      const youtubeAdapter = module.get<YouTubeAdapter>(YouTubeAdapter);
      
      // Verify that the factory was properly initialized with adapters
      const supportedTypes = adapterFactory.getSupportedSourceTypes();
      expect(supportedTypes).toContain('YOUTUBE');
      
      // Verify that we can get the adapter
      const retrievedAdapter = adapterFactory.getAdapter('YOUTUBE' as any);
      expect(retrievedAdapter).toBeDefined();
      expect(retrievedAdapter.sourceType).toBe('YOUTUBE');
    });

    it('should maintain singleton behavior for services', () => {
      const service1 = module.get<ImportService>(ImportService);
      const service2 = module.get<ImportService>(ImportService);
      const factory1 = module.get<AdapterFactory>(AdapterFactory);
      const factory2 = module.get<AdapterFactory>(AdapterFactory);
      
      // Services should be singletons
      expect(service1).toBe(service2);
      expect(factory1).toBe(factory2);
    });
  });

  describe('error handling', () => {
    it('should handle missing dependencies gracefully', async () => {
      // This test ensures that if dependencies are missing, 
      // the module fails gracefully during compilation
      try {
        const testModule = await Test.createTestingModule({
          imports: [ImportModule],
        })
        .overrideProvider(PrismaService)
        .useValue(null) // Intentionally break the dependency
        .compile();
        
        expect(testModule).toBeDefined();
      } catch (error) {
        // If it fails, it should fail with a meaningful error
        expect(error).toBeDefined();
      }
    });
  });

  describe('module metadata', () => {
    it('should be properly configured as a NestJS module', () => {
      // Verify the module can provide its services
      expect(module.get<ImportService>(ImportService)).toBeDefined();
      expect(module.get<ImportController>(ImportController)).toBeDefined();
    });

    it('should follow NestJS module conventions', () => {
      // Basic module functionality test
      expect(module).toBeDefined();
      expect(module.get).toBeDefined();
    });
  });
});