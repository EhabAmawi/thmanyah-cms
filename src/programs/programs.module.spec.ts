import { Test, TestingModule } from '@nestjs/testing';
import { ProgramsModule } from './programs.module';
import { ProgramsService } from './programs.service';
import { ProgramsController } from './programs.controller';
import { PrismaModule } from '../prisma/prisma.module';

describe('ProgramsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ProgramsModule, PrismaModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('module setup', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should provide ProgramsService', () => {
      const programsService = module.get<ProgramsService>(ProgramsService);
      expect(programsService).toBeDefined();
      expect(programsService).toBeInstanceOf(ProgramsService);
    });

    it('should provide ProgramsController', () => {
      const programsController = module.get<ProgramsController>(ProgramsController);
      expect(programsController).toBeDefined();
      expect(programsController).toBeInstanceOf(ProgramsController);
    });
  });

  describe('dependency injection', () => {
    it('should inject PrismaService into ProgramsService', async () => {
      const programsService = module.get<ProgramsService>(ProgramsService);
      expect(programsService).toBeDefined();
      // Test that the service can be instantiated with its dependencies
      expect(programsService.create).toBeDefined();
      expect(programsService.findAll).toBeDefined();
      expect(programsService.findOne).toBeDefined();
      expect(programsService.update).toBeDefined();
      expect(programsService.remove).toBeDefined();
    });

    it('should inject ProgramsService into ProgramsController', async () => {
      const programsController = module.get<ProgramsController>(ProgramsController);
      expect(programsController).toBeDefined();
      // Test that the controller can be instantiated with its dependencies
      expect(programsController.create).toBeDefined();
      expect(programsController.findAll).toBeDefined();
      expect(programsController.findOne).toBeDefined();
      expect(programsController.update).toBeDefined();
      expect(programsController.remove).toBeDefined();
    });
  });

  describe('exports', () => {
    it('should export ProgramsService', () => {
      const programsService = module.get<ProgramsService>(ProgramsService);
      expect(programsService).toBeDefined();
    });
  });
});