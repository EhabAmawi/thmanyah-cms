import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { PrismaErrorMapperService } from '../src/common/services/prisma-error-mapper.service';
import { Language, MediaType, Status } from '@prisma/client';

describe('DiscoveryController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let testCategory: any;
  let testPublishedProgram: any;
  let testDraftProgram: any;
  let testArchivedProgram: any;

  const timestamp = Date.now();

  const testCategoryData = {
    name: `Test Category Discovery ${timestamp}`,
    description: 'A test category for discovery e2e testing',
    isActive: true,
  };

  const getPublishedProgram = () => ({
    name: `Published Program ${timestamp}`,
    description:
      'A published program for discovery testing with programming content',
    language: Language.ENGLISH,
    durationSec: 3600,
    releaseDate: new Date('2024-01-01T00:00:00.000Z'),
    mediaUrl: 'https://example.com/media/published-program.mp4',
    mediaType: MediaType.VIDEO,
    status: Status.PUBLISHED,
    categoryId: testCategory?.id || 1,
  });

  const getDraftProgram = () => ({
    name: `Draft Program ${timestamp}`,
    description: 'A draft program that should not appear in discovery',
    language: Language.ENGLISH,
    durationSec: 1800,
    releaseDate: new Date('2024-02-01T00:00:00.000Z'),
    mediaUrl: 'https://example.com/media/draft-program.mp4',
    mediaType: MediaType.VIDEO,
    status: Status.DRAFT,
    categoryId: testCategory?.id || 1,
  });

  const getArchivedProgram = () => ({
    name: `Archived Program ${timestamp}`,
    description: 'An archived program that should not appear in discovery',
    language: Language.ARABIC,
    durationSec: 2400,
    releaseDate: new Date('2024-03-01T00:00:00.000Z'),
    mediaUrl: 'https://example.com/media/archived-program.mp3',
    mediaType: MediaType.AUDIO,
    status: Status.ARCHIVED,
    categoryId: testCategory?.id || 1,
  });

  const getSecondPublishedProgram = () => ({
    name: `Second Published Program ${timestamp}`,
    description: 'Another published program for filtering tests',
    language: Language.ARABIC,
    durationSec: 7200,
    releaseDate: new Date('2024-04-01T00:00:00.000Z'),
    mediaUrl: 'https://example.com/media/second-published.mp3',
    mediaType: MediaType.AUDIO,
    status: Status.PUBLISHED,
    categoryId: testCategory?.id || 1,
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Configure validation and exception handling
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    const prismaErrorMapper = new PrismaErrorMapperService();
    app.useGlobalFilters(new PrismaExceptionFilter(prismaErrorMapper));

    await app.init();
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanup();

    // Create test category
    testCategory = await prismaService.category.create({
      data: testCategoryData,
    });

    // Create test programs with different statuses
    testPublishedProgram = await prismaService.program.create({
      data: getPublishedProgram(),
      include: { category: true },
    });

    testDraftProgram = await prismaService.program.create({
      data: getDraftProgram(),
      include: { category: true },
    });

    testArchivedProgram = await prismaService.program.create({
      data: getArchivedProgram(),
      include: { category: true },
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  const cleanup = async () => {
    // Delete test programs
    await prismaService.program.deleteMany({
      where: {
        OR: [
          { name: { contains: `${timestamp}` } },
          { description: { contains: 'discovery testing' } },
        ],
      },
    });

    // Delete test categories
    await prismaService.category.deleteMany({
      where: {
        name: { contains: `${timestamp}` },
      },
    });
  };

  describe('GET /discovery/search', () => {
    it('should search published programs without query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/search')
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      // Should include our published program but not draft or archived
      const foundProgram = response.body.find(
        (p: any) => p.id === testPublishedProgram.id,
      );
      expect(foundProgram).toBeDefined();
      expect(foundProgram.status).toBe(Status.PUBLISHED);

      // Should not include draft or archived programs
      const foundDraft = response.body.find(
        (p: any) => p.id === testDraftProgram.id,
      );
      const foundArchived = response.body.find(
        (p: any) => p.id === testArchivedProgram.id,
      );
      expect(foundDraft).toBeUndefined();
      expect(foundArchived).toBeUndefined();
    });

    it('should search published programs with query parameter matching name', async () => {
      const response = await request(app.getHttpServer())
        .get(`/discovery/search?q=Published Program ${timestamp}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const foundProgram = response.body.find(
        (p: any) => p.id === testPublishedProgram.id,
      );
      expect(foundProgram).toBeDefined();
      expect(foundProgram.name).toContain('Published Program');
      expect(foundProgram.status).toBe(Status.PUBLISHED);
    });

    it('should search published programs with query parameter matching description', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/search?q=programming')
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const foundProgram = response.body.find(
        (p: any) => p.id === testPublishedProgram.id,
      );
      expect(foundProgram).toBeDefined();
      expect(foundProgram.description).toContain('programming');
      expect(foundProgram.status).toBe(Status.PUBLISHED);
    });

    it('should return empty array for non-matching search query', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/search?q=nonexistentquery123456')
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should perform case-insensitive search', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/search?q=PROGRAMMING')
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      const foundProgram = response.body.find(
        (p: any) => p.id === testPublishedProgram.id,
      );
      expect(foundProgram).toBeDefined();
    });

    it('should include category information in search results', async () => {
      const response = await request(app.getHttpServer())
        .get(`/discovery/search?q=Published Program ${timestamp}`)
        .expect(HttpStatus.OK);

      const foundProgram = response.body.find(
        (p: any) => p.id === testPublishedProgram.id,
      );
      expect(foundProgram.category).toBeDefined();
      expect(foundProgram.category.id).toBe(testCategory.id);
      expect(foundProgram.category.name).toBe(testCategory.name);
      expect(foundProgram.category.description).toBe(testCategory.description);
    });
  });

  describe('GET /discovery/browse', () => {
    let secondPublishedProgram: any;

    beforeEach(async () => {
      // Create a second published program with different attributes
      secondPublishedProgram = await prismaService.program.create({
        data: getSecondPublishedProgram(),
        include: { category: true },
      });
    });

    it('should browse all published programs without filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/browse')
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      // Should include both published programs
      const foundFirst = response.body.find(
        (p: any) => p.id === testPublishedProgram.id,
      );
      const foundSecond = response.body.find(
        (p: any) => p.id === secondPublishedProgram.id,
      );
      expect(foundFirst).toBeDefined();
      expect(foundSecond).toBeDefined();

      // Should not include draft or archived programs
      const foundDraft = response.body.find(
        (p: any) => p.id === testDraftProgram.id,
      );
      const foundArchived = response.body.find(
        (p: any) => p.id === testArchivedProgram.id,
      );
      expect(foundDraft).toBeUndefined();
      expect(foundArchived).toBeUndefined();
    });

    it('should filter programs by categoryId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/discovery/browse?categoryId=${testCategory.id}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((program: any) => {
        expect(program.category.id).toBe(testCategory.id);
        expect(program.status).toBe(Status.PUBLISHED);
      });
    });

    it('should filter programs by language', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/browse?language=ENGLISH')
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((program: any) => {
        expect(program.language).toBe(Language.ENGLISH);
        expect(program.status).toBe(Status.PUBLISHED);
      });

      const foundProgram = response.body.find(
        (p: any) => p.id === testPublishedProgram.id,
      );
      expect(foundProgram).toBeDefined();
    });

    it('should filter programs by mediaType', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/browse?mediaType=VIDEO')
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((program: any) => {
        expect(program.mediaType).toBe(MediaType.VIDEO);
        expect(program.status).toBe(Status.PUBLISHED);
      });
    });

    it('should filter programs with multiple filters', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/discovery/browse?categoryId=${testCategory.id}&language=ARABIC&mediaType=AUDIO`,
        )
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((program: any) => {
        expect(program.category.id).toBe(testCategory.id);
        expect(program.language).toBe(Language.ARABIC);
        expect(program.mediaType).toBe(MediaType.AUDIO);
        expect(program.status).toBe(Status.PUBLISHED);
      });

      const foundProgram = response.body.find(
        (p: any) => p.id === secondPublishedProgram.id,
      );
      expect(foundProgram).toBeDefined();
    });

    it('should return empty array when no programs match filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/browse?categoryId=999999')
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should validate categoryId parameter as integer', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/browse?categoryId=invalid')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'categoryId must be an integer number',
      );
    });

    it('should validate language enum parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/browse?language=INVALID')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'language must be one of the following values',
      );
    });

    it('should validate mediaType enum parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/browse?mediaType=INVALID')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'mediaType must be one of the following values',
      );
    });
  });

  describe('GET /discovery/programs/:id', () => {
    it('should get a published program by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/discovery/programs/${testPublishedProgram.id}`)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        id: testPublishedProgram.id,
        name: testPublishedProgram.name,
        description: testPublishedProgram.description,
        language: testPublishedProgram.language,
        durationSec: testPublishedProgram.durationSec,
        releaseDate: testPublishedProgram.releaseDate.toISOString(),
        mediaUrl: testPublishedProgram.mediaUrl,
        mediaType: testPublishedProgram.mediaType,
        status: testPublishedProgram.status,
        category: {
          id: testCategory.id,
          name: testCategory.name,
          description: testCategory.description,
        },
        createdAt: testPublishedProgram.createdAt.toISOString(),
        updatedAt: testPublishedProgram.updatedAt.toISOString(),
      });
    });

    it('should return 404 for non-existent program', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/programs/999999')
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe(
        'Published program with ID 999999 not found',
      );
    });

    it('should return 404 for draft program (not published)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/discovery/programs/${testDraftProgram.id}`)
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe(
        `Published program with ID ${testDraftProgram.id} not found`,
      );
    });

    it('should return 404 for archived program (not published)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/discovery/programs/${testArchivedProgram.id}`)
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body.message).toBe(
        `Published program with ID ${testArchivedProgram.id} not found`,
      );
    });

    it('should validate id parameter as integer', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/programs/invalid')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe(
        'Validation failed (numeric string is expected)',
      );
    });

    it('should include full category information', async () => {
      const response = await request(app.getHttpServer())
        .get(`/discovery/programs/${testPublishedProgram.id}`)
        .expect(HttpStatus.OK);

      expect(response.body.category).toBeDefined();
      expect(response.body.category.id).toBe(testCategory.id);
      expect(response.body.category.name).toBe(testCategory.name);
      expect(response.body.category.description).toBe(testCategory.description);
    });
  });

  describe('Public Access (No Authentication Required)', () => {
    it('should access search endpoint without authentication', async () => {
      await request(app.getHttpServer())
        .get('/discovery/search')
        .expect(HttpStatus.OK);
    });

    it('should access browse endpoint without authentication', async () => {
      await request(app.getHttpServer())
        .get('/discovery/browse')
        .expect(HttpStatus.OK);
    });

    it('should access program details endpoint without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/discovery/programs/${testPublishedProgram.id}`)
        .expect(HttpStatus.OK);
    });

    it('should not require Authorization header for any discovery endpoints', async () => {
      // Test all endpoints without Authorization header
      await request(app.getHttpServer())
        .get('/discovery/search?q=test')
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .get('/discovery/browse?language=ENGLISH')
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .get(`/discovery/programs/${testPublishedProgram.id}`)
        .expect(HttpStatus.OK);
    });
  });

  describe('Response Format and Data Integrity', () => {
    it('should return properly formatted program data', async () => {
      const response = await request(app.getHttpServer())
        .get('/discovery/search')
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const program = response.body[0];
        expect(program).toHaveProperty('id');
        expect(program).toHaveProperty('name');
        expect(program).toHaveProperty('language');
        expect(program).toHaveProperty('mediaType');
        expect(program).toHaveProperty('status');
        expect(program).toHaveProperty('category');
        expect(program).toHaveProperty('createdAt');
        expect(program).toHaveProperty('updatedAt');

        expect(program.category).toHaveProperty('id');
        expect(program.category).toHaveProperty('name');

        expect(typeof program.id).toBe('number');
        expect(typeof program.name).toBe('string');
        expect(typeof program.durationSec).toBe('number');
      }
    });

    it('should maintain consistent data types across endpoints', async () => {
      // Get program from search
      const searchResponse = await request(app.getHttpServer())
        .get(`/discovery/search?q=Published Program ${timestamp}`)
        .expect(HttpStatus.OK);

      const searchProgram = searchResponse.body.find(
        (p: any) => p.id === testPublishedProgram.id,
      );
      expect(searchProgram).toBeDefined();

      // Get same program from browse
      const browseResponse = await request(app.getHttpServer())
        .get(`/discovery/browse?categoryId=${testCategory.id}`)
        .expect(HttpStatus.OK);

      const browseProgram = browseResponse.body.find(
        (p: any) => p.id === testPublishedProgram.id,
      );
      expect(browseProgram).toBeDefined();

      // Get same program by ID
      const detailResponse = await request(app.getHttpServer())
        .get(`/discovery/programs/${testPublishedProgram.id}`)
        .expect(HttpStatus.OK);

      // All should have the same data structure and values
      expect(searchProgram.id).toBe(browseProgram.id);
      expect(browseProgram.id).toBe(detailResponse.body.id);
      expect(searchProgram.name).toBe(detailResponse.body.name);
      expect(browseProgram.status).toBe(Status.PUBLISHED);
      expect(detailResponse.body.status).toBe(Status.PUBLISHED);
    });
  });
});
