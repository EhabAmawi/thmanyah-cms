import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { PrismaErrorMapperService } from '../src/common/services/prisma-error-mapper.service';
import { Language, MediaType, Status } from '@prisma/client';

describe('ProgramsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let testCategory: any;

  const timestamp = Date.now();
  const testEmployee = {
    firstName: 'Test',
    lastName: 'User',
    email: `test.user.prog.${timestamp}@example.com`,
    password: 'password123',
    phone: '+1234567890',
    department: 'IT',
    position: 'Developer',
    salary: 50000,
    isActive: true,
  };

  const getTestProgram = () => ({
    name: `Test Program ${timestamp}`,
    description: 'A test program for e2e testing',
    language: Language.ENGLISH,
    durationSec: 3600,
    releaseDate: '2024-01-01T00:00:00.000Z',
    mediaUrl: 'https://example.com/media/test-program.mp4',
    mediaType: MediaType.VIDEO,
    status: Status.DRAFT,
    categoryId: testCategory?.id || 1,
  });

  const getSecondTestProgram = () => ({
    name: `Second Test Program ${timestamp}`,
    description: 'Another test program',
    language: Language.ARABIC,
    durationSec: 1800,
    releaseDate: '2024-02-01T00:00:00.000Z',
    mediaUrl: 'https://example.com/media/test-audio.mp3',
    mediaType: MediaType.AUDIO,
    status: Status.PUBLISHED,
    categoryId: testCategory?.id || 1,
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes and filters
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const errorMapper = new PrismaErrorMapperService();
    app.useGlobalFilters(new PrismaExceptionFilter(errorMapper));

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    // Clean up test data specific to this test suite
    await prismaService.program.deleteMany({
      where: {
        name: {
          contains: `${timestamp}`,
        },
      },
    });

    await prismaService.category.deleteMany({
      where: {
        name: {
          contains: `Test Category ${timestamp}`,
        },
      },
    });

    await prismaService.employee.deleteMany({
      where: {
        email: {
          contains: `prog.${timestamp}@example.com`,
        },
      },
    });

    // Create a test category
    testCategory = await prismaService.category.create({
      data: {
        name: `Test Category ${timestamp}`,
        description: 'A test category for e2e testing',
        isActive: true,
      },
    });

    // Create a test employee and get access token
    const hashedPassword = await bcrypt.hash(testEmployee.password, 10);
    await prismaService.employee.create({
      data: {
        ...testEmployee,
        password: hashedPassword,
      },
    });

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmployee.email,
        password: testEmployee.password,
      });

    if (loginResponse.status !== 201) {
      console.error('Login failed:', loginResponse.body);
      throw new Error(`Login failed with status ${loginResponse.status}`);
    }

    accessToken = loginResponse.body.access_token;

    if (!accessToken) {
      console.error('No access token received:', loginResponse.body);
      throw new Error('No access token received from login');
    }
  });

  afterEach(async () => {
    // Clean up test data
    await prismaService.program.deleteMany({
      where: {
        name: {
          contains: `${timestamp}`,
        },
      },
    });

    await prismaService.category.deleteMany({
      where: {
        name: {
          contains: `Test Category ${timestamp}`,
        },
      },
    });

    await prismaService.employee.deleteMany({
      where: {
        email: {
          contains: `prog.${timestamp}@example.com`,
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /programs', () => {
    it('should create a new program', async () => {
      const testProgram = getTestProgram();
      const response = await request(app.getHttpServer())
        .post('/programs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProgram)
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        name: testProgram.name,
        description: testProgram.description,
        language: testProgram.language,
        durationSec: testProgram.durationSec,
        mediaUrl: testProgram.mediaUrl,
        mediaType: testProgram.mediaType,
        status: testProgram.status,
        categoryId: testProgram.categoryId,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.category).toBeDefined();
      expect(response.body.category.id).toBe(testCategory.id);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should create a program with default values', async () => {
      const minimalProgram = {
        name: `Minimal Program ${timestamp}`,
        durationSec: 600,
        releaseDate: '2024-01-01T00:00:00.000Z',
        mediaUrl: 'https://example.com/media/minimal.mp4',
        categoryId: testCategory.id,
      };

      const response = await request(app.getHttpServer())
        .post('/programs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(minimalProgram)
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        name: minimalProgram.name,
        language: Language.ENGLISH, // default
        mediaType: MediaType.VIDEO, // default
        status: Status.DRAFT, // default
        durationSec: minimalProgram.durationSec,
        mediaUrl: minimalProgram.mediaUrl,
        categoryId: testCategory.id,
      });
      expect(response.body.category).toBeDefined();
    });

    it('should return 409 for duplicate program name', async () => {
      const testProgram = getTestProgram();
      // Create first program
      await request(app.getHttpServer())
        .post('/programs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProgram)
        .expect(HttpStatus.CREATED);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/programs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProgram)
        .expect(HttpStatus.CONFLICT);
    });

    it('should return 400 for invalid data', async () => {
      const invalidProgram = {
        name: '', // empty name
        durationSec: -1, // negative duration
        releaseDate: 'invalid-date',
        mediaUrl: 'not-a-url',
      };

      await request(app.getHttpServer())
        .post('/programs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidProgram)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 401 without authentication', async () => {
      const testProgram = getTestProgram();
      await request(app.getHttpServer())
        .post('/programs')
        .send(testProgram)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /programs', () => {
    let createdProgram: any;
    let createdProgram2: any;

    beforeEach(async () => {
      // Create test programs
      const testProgram = getTestProgram();
      const secondTestProgram = getSecondTestProgram();

      const response1 = await request(app.getHttpServer())
        .post('/programs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProgram);
      createdProgram = response1.body;

      const response2 = await request(app.getHttpServer())
        .post('/programs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(secondTestProgram);
      createdProgram2 = response2.body;
    });

    it('should return all programs', async () => {
      const response = await request(app.getHttpServer())
        .get('/programs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const programNames = response.body.map((p: any) => p.name);
      expect(programNames).toContain(createdProgram.name);
      expect(programNames).toContain(createdProgram2.name);

      // Verify category relation is included
      response.body.forEach((program: any) => {
        expect(program.category).toBeDefined();
        expect(program.category.id).toBe(testCategory.id);
      });
    });

    it('should filter programs by language', async () => {
      const response = await request(app.getHttpServer())
        .get('/programs?language=ENGLISH')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((program: any) => {
        expect(program.language).toBe(Language.ENGLISH);
      });
    });

    it('should filter programs by media type', async () => {
      const response = await request(app.getHttpServer())
        .get('/programs?mediaType=VIDEO')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((program: any) => {
        expect(program.mediaType).toBe(MediaType.VIDEO);
      });
    });

    it('should filter programs by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/programs?status=PUBLISHED')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((program: any) => {
        expect(program.status).toBe(Status.PUBLISHED);
      });
    });

    it('should filter programs by categoryId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/programs?categoryId=${testCategory.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((program: any) => {
        expect(program.categoryId).toBe(testCategory.id);
        expect(program.category.id).toBe(testCategory.id);
      });
    });

    it('should return 400 for invalid categoryId', async () => {
      await request(app.getHttpServer())
        .get('/programs?categoryId=invalid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return recent programs with limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/programs?recent=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeLessThanOrEqual(1);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/programs')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /programs/:id', () => {
    let createdProgram: any;

    beforeEach(async () => {
      const testProgram = getTestProgram();
      const response = await request(app.getHttpServer())
        .post('/programs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProgram);
      createdProgram = response.body;
    });

    it('should return a program by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/programs/${createdProgram.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: createdProgram.id,
        name: createdProgram.name,
        description: createdProgram.description,
        language: createdProgram.language,
        status: createdProgram.status,
        categoryId: createdProgram.categoryId,
      });
      expect(response.body.category).toBeDefined();
      expect(response.body.category.id).toBe(testCategory.id);
    });

    it('should return 404 for non-existent program', async () => {
      await request(app.getHttpServer())
        .get('/programs/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/programs/${createdProgram.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /programs/:id', () => {
    let createdProgram: any;

    beforeEach(async () => {
      const testProgram = getTestProgram();
      const response = await request(app.getHttpServer())
        .post('/programs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProgram);
      createdProgram = response.body;
    });

    it('should update a program', async () => {
      const updateData = {
        name: `Updated Program ${timestamp}`,
        description: 'Updated description',
        durationSec: 7200,
        status: Status.PUBLISHED,
      };

      const response = await request(app.getHttpServer())
        .patch(`/programs/${createdProgram.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: createdProgram.id,
        name: updateData.name,
        description: updateData.description,
        durationSec: updateData.durationSec,
        status: updateData.status,
      });
      expect(response.body.category).toBeDefined();
      expect(response.body.category.id).toBe(testCategory.id);
    });

    it('should return 404 for non-existent program', async () => {
      await request(app.getHttpServer())
        .patch('/programs/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/programs/${createdProgram.id}`)
        .send({ name: 'Updated' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /programs/:id', () => {
    let createdProgram: any;

    beforeEach(async () => {
      const testProgram = getTestProgram();
      const response = await request(app.getHttpServer())
        .post('/programs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProgram);
      createdProgram = response.body;
    });

    it('should delete a program', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/programs/${createdProgram.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        message: 'Program deleted successfully',
      });

      // Verify program is deleted
      await request(app.getHttpServer())
        .get(`/programs/${createdProgram.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 404 for non-existent program', async () => {
      await request(app.getHttpServer())
        .delete('/programs/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/programs/${createdProgram.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
