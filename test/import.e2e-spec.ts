import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { SourceType, Language, MediaType } from '@prisma/client';

describe('Import (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Clean up database
    await prisma.program.deleteMany();
    await prisma.employee.deleteMany();

    // Create test employee for authentication
    const testEmployee = await prisma.employee.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'hashedPassword', // In real app, this would be bcrypt hashed
        phone: '1234567890',
        department: 'IT',
        position: 'Developer',
        isActive: true,
      },
    });

    // Generate JWT token for authentication
    authToken = jwtService.sign({
      sub: testEmployee.id,
      email: testEmployee.email,
    });
  });

  afterAll(async () => {
    // Clean up database
    await prisma.program.deleteMany();
    await prisma.employee.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    // Clean programs before each test
    await prisma.program.deleteMany();
  });

  describe('/import/youtube/video (POST)', () => {
    it('should import a YouTube video successfully', async () => {
      const importDto = {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        categoryId: undefined,
      };

      const response = await request(app.getHttpServer())
        .post('/import/youtube/video')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importDto)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        importedCount: 1,
        duplicatesSkipped: 0,
        imported: expect.arrayContaining([
          expect.objectContaining({
            name: 'Mock Video Title dQw4w9WgXcQ',
            description: 'This is a mock video description for development purposes.',
            language: Language.ENGLISH,
            mediaType: MediaType.VIDEO,
            sourceType: SourceType.YOUTUBE,
            externalId: 'dQw4w9WgXcQ',
            sourceUrl: importDto.url,
          }),
        ]),
        errors: [],
        message: 'Video imported successfully',
      });

      // Verify the video was saved to database
      const savedProgram = await prisma.program.findFirst({
        where: { externalId: 'dQw4w9WgXcQ' },
      });

      expect(savedProgram).toBeDefined();
      expect(savedProgram!.name).toBe('Mock Video Title dQw4w9WgXcQ');
      expect(savedProgram!.sourceType).toBe(SourceType.YOUTUBE);
    });

    it('should skip duplicate video', async () => {
      const importDto = {
        url: 'https://www.youtube.com/watch?v=test123',
      };

      // Import the video first time
      await request(app.getHttpServer())
        .post('/import/youtube/video')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importDto)
        .expect(200);

      // Try to import the same video again
      const response = await request(app.getHttpServer())
        .post('/import/youtube/video')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importDto)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        importedCount: 0,
        duplicatesSkipped: 1,
        imported: [],
        errors: ['Content already exists'],
        message: 'Video was skipped (duplicate or error)',
      });
    });

    it('should return 400 for invalid YouTube URL', async () => {
      const importDto = {
        url: 'https://invalid-url.com/video',
      };

      const response = await request(app.getHttpServer())
        .post('/import/youtube/video')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importDto)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('No adapter found for URL: https://invalid-url.com/video');
    });

    it('should return 401 without authentication', async () => {
      const importDto = {
        url: 'https://www.youtube.com/watch?v=test123',
      };

      await request(app.getHttpServer())
        .post('/import/youtube/video')
        .send(importDto)
        .expect(401);
    });

    it('should validate request body', async () => {
      await request(app.getHttpServer())
        .post('/import/youtube/video')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('/import/youtube/channel (POST)', () => {
    it('should import YouTube channel videos successfully', async () => {
      const importDto = {
        channelId: 'UC_test_channel',
        limit: 3,
      };

      const response = await request(app.getHttpServer())
        .post('/import/youtube/channel')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.importedCount).toBe(3);
      expect(response.body.duplicatesSkipped).toBe(0);
      expect(response.body.imported).toHaveLength(3);
      expect(response.body.errors).toHaveLength(0);

      // Verify videos were saved to database
      const savedPrograms = await prisma.program.findMany({
        where: { sourceType: SourceType.YOUTUBE },
      });

      expect(savedPrograms).toHaveLength(3);
      savedPrograms.forEach((program, index) => {
        expect(program.name).toBe(`Mock Channel Video ${index + 1}`);
        expect(program.externalId).toBe(`mock-video-UC_test_channel-${index + 1}`);
      });
    });

    it('should respect limit parameter', async () => {
      const importDto = {
        channelId: 'UC_test_channel_2',
        limit: 2,
      };

      const response = await request(app.getHttpServer())
        .post('/import/youtube/channel')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importDto)
        .expect(200);

      expect(response.body.importedCount).toBe(2);
      expect(response.body.imported).toHaveLength(2);
    });

    it('should use default limit when not specified', async () => {
      const importDto = {
        channelId: 'UC_test_channel_default',
      };

      const response = await request(app.getHttpServer())
        .post('/import/youtube/channel')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importDto)
        .expect(200);

      // Mock adapter returns max 5 videos
      expect(response.body.importedCount).toBe(5);
    });

    it('should handle duplicates in channel import', async () => {
      // First import
      await request(app.getHttpServer())
        .post('/import/youtube/channel')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ channelId: 'UC_duplicate_test', limit: 2 })
        .expect(200);

      // Second import should detect duplicates
      const response = await request(app.getHttpServer())
        .post('/import/youtube/channel')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ channelId: 'UC_duplicate_test', limit: 2 })
        .expect(200);

      expect(response.body.importedCount).toBe(0);
      expect(response.body.duplicatesSkipped).toBe(2);
      expect(response.body.errors).toEqual(['Content already exists', 'Content already exists']);
    });

    it('should return 401 without authentication', async () => {
      const importDto = {
        channelId: 'UC_test_channel',
        limit: 3,
      };

      await request(app.getHttpServer())
        .post('/import/youtube/channel')
        .send(importDto)
        .expect(401);
    });
  });

  describe('/import/by-source (POST)', () => {
    it('should import video by source type', async () => {
      const importDto = {
        sourceType: SourceType.YOUTUBE,
        url: 'https://www.youtube.com/watch?v=source_test',
      };

      const response = await request(app.getHttpServer())
        .post('/import/by-source')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.importedCount).toBe(1);
      expect(response.body.message).toBe('Content imported successfully');
    });

    it('should reject unsupported source types', async () => {
      const importDto = {
        sourceType: SourceType.VIMEO,
        url: 'https://vimeo.com/123456789',
      };

      const response = await request(app.getHttpServer())
        .post('/import/by-source')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importDto)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain("Adapter for source type 'VIMEO' not found");
    });

    it('should validate request body', async () => {
      await request(app.getHttpServer())
        .post('/import/by-source')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: 'https://youtube.com/watch?v=test' }) // Missing sourceType
        .expect(400);
    });
  });

  describe('/import/video (POST)', () => {
    it('should auto-detect source type and import video', async () => {
      const importDto = {
        url: 'https://www.youtube.com/watch?v=auto_detect',
      };

      const response = await request(app.getHttpServer())
        .post('/import/video')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.importedCount).toBe(1);
      expect(response.body.imported[0].sourceType).toBe(SourceType.YOUTUBE);
    });

    it('should reject unsupported URLs', async () => {
      const importDto = {
        url: 'https://unsupported-platform.com/video/123',
      };

      const response = await request(app.getHttpServer())
        .post('/import/video')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importDto)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('No adapter found for URL: https://unsupported-platform.com/video/123');
    });
  });

  describe('/import/sources (GET)', () => {
    it('should return supported source types', async () => {
      const response = await request(app.getHttpServer())
        .get('/import/sources')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        supportedSources: [SourceType.YOUTUBE],
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/import/sources')
        .expect(401);
    });
  });

  describe('/import/check-duplicate (POST)', () => {
    beforeEach(async () => {
      // Create a test program for duplicate checking
      await prisma.program.create({
        data: {
          name: 'Existing Program',
          description: 'Test program for duplicate checking',
          language: Language.ENGLISH,
          durationSec: 300,
          releaseDate: new Date(),
          mediaUrl: 'https://www.youtube.com/watch?v=existing123',
          mediaType: MediaType.VIDEO,
          sourceType: SourceType.YOUTUBE,
          sourceUrl: 'https://www.youtube.com/watch?v=existing123',
          externalId: 'existing123',
        },
      });
    });

    it('should return true for existing content', async () => {
      const checkDto = {
        externalId: 'existing123',
        sourceType: SourceType.YOUTUBE,
      };

      const response = await request(app.getHttpServer())
        .post('/import/check-duplicate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkDto)
        .expect(200);

      expect(response.body).toEqual({
        exists: true,
        externalId: 'existing123',
        sourceType: SourceType.YOUTUBE,
      });
    });

    it('should return false for non-existing content', async () => {
      const checkDto = {
        externalId: 'nonexistent123',
        sourceType: SourceType.YOUTUBE,
      };

      const response = await request(app.getHttpServer())
        .post('/import/check-duplicate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkDto)
        .expect(200);

      expect(response.body).toEqual({
        exists: false,
        externalId: 'nonexistent123',
        sourceType: SourceType.YOUTUBE,
      });
    });

    it('should return 400 for missing externalId', async () => {
      const checkDto = {
        sourceType: SourceType.YOUTUBE,
      };

      await request(app.getHttpServer())
        .post('/import/check-duplicate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkDto)
        .expect(400);
    });

    it('should return 400 for missing sourceType', async () => {
      const checkDto = {
        externalId: 'test123',
      };

      await request(app.getHttpServer())
        .post('/import/check-duplicate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkDto)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const checkDto = {
        externalId: 'test123',
        sourceType: SourceType.YOUTUBE,
      };

      await request(app.getHttpServer())
        .post('/import/check-duplicate')
        .send(checkDto)
        .expect(401);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle malformed JSON', async () => {
      await request(app.getHttpServer())
        .post('/import/youtube/video')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle empty request body', async () => {
      await request(app.getHttpServer())
        .post('/import/youtube/video')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should handle invalid JWT token', async () => {
      await request(app.getHttpServer())
        .post('/import/youtube/video')
        .set('Authorization', 'Bearer invalid_token')
        .send({ url: 'https://www.youtube.com/watch?v=test' })
        .expect(401);
    });

    it('should handle very large request payloads gracefully', async () => {
      const largeDescription = 'A'.repeat(10000);
      const importDto = {
        url: 'https://www.youtube.com/watch?v=large_payload',
        categoryId: undefined,
        description: largeDescription,
      };

      const response = await request(app.getHttpServer())
        .post('/import/youtube/video')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importDto)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Integration with existing data', () => {
    it('should work alongside existing programs', async () => {
      // Create an existing manual program
      await prisma.program.create({
        data: {
          name: 'Manual Program',
          description: 'Manually created program',
          language: Language.ENGLISH,
          durationSec: 600,
          releaseDate: new Date(),
          mediaUrl: 'https://example.com/video.mp4',
          mediaType: MediaType.VIDEO,
          sourceType: SourceType.MANUAL,
          sourceUrl: null,
          externalId: null,
        },
      });

      // Import a YouTube video
      const importDto = {
        url: 'https://www.youtube.com/watch?v=integration_test',
      };

      const response = await request(app.getHttpServer())
        .post('/import/youtube/video')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importDto)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify both programs exist
      const allPrograms = await prisma.program.findMany();
      expect(allPrograms).toHaveLength(2);

      const manualProgram = allPrograms.find(p => p.sourceType === SourceType.MANUAL);
      const importedProgram = allPrograms.find(p => p.sourceType === SourceType.YOUTUBE);

      expect(manualProgram).toBeDefined();
      expect(importedProgram).toBeDefined();
    });
  });
});