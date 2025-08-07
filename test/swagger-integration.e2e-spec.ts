import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { PrismaErrorMapperService } from '../src/common/services/prisma-error-mapper.service';

describe('Swagger Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as in main.ts

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const errorMapper = new PrismaErrorMapperService();
    app.useGlobalFilters(new PrismaExceptionFilter(errorMapper));

    // Swagger configuration (same as main.ts)
    const config = new DocumentBuilder()
      .setTitle('Thmanyah CMS API')
      .setDescription(
        'Content Management System API for Thmanyah with JWT Authentication',
      )
      .setVersion('1.0')
      .addServer('http://localhost:3000', 'Local development server')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag(
        'authentication',
        'Authentication endpoints for login, refresh, and profile',
      )
      .addTag(
        'employees',
        'Employee management endpoints (requires authentication)',
      )
      .addTag(
        'categories',
        'Category management endpoints (requires authentication)',
      )
      .addTag(
        'programs',
        'Program management endpoints (requires authentication)',
      )
      .addTag(
        'import',
        'Content import endpoints from external sources like YouTube (requires authentication)',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Swagger Documentation', () => {
    it('should serve Swagger UI at /api', async () => {
      const response = await request(app.getHttpServer())
        .get('/api')
        .expect(200);

      expect(response.text).toContain('Swagger UI');
      expect(response.text).toContain('Thmanyah CMS API');
    });

    it('should serve OpenAPI JSON specification at /api-json', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      const spec = response.body;

      expect(spec).toHaveProperty('openapi');
      expect(spec).toHaveProperty('info');
      expect(spec.info.title).toBe('Thmanyah CMS API');
      expect(spec.info.version).toBe('1.0');
    });

    it('should include import endpoints in OpenAPI specification', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      const spec = response.body;
      const paths = spec.paths;

      // Check that import endpoints are documented
      expect(paths).toHaveProperty('/import/youtube/video');
      expect(paths).toHaveProperty('/import/youtube/channel');
      expect(paths).toHaveProperty('/import/by-source');
      expect(paths).toHaveProperty('/import/video');
      expect(paths).toHaveProperty('/import/sources');
      expect(paths).toHaveProperty('/import/check-duplicate');

      // Verify HTTP methods
      expect(paths['/import/youtube/video']).toHaveProperty('post');
      expect(paths['/import/youtube/channel']).toHaveProperty('post');
      expect(paths['/import/sources']).toHaveProperty('get');
    });

    it('should include import tag in OpenAPI specification', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      const spec = response.body;

      expect(spec.tags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'import',
            description:
              'Content import endpoints from external sources like YouTube (requires authentication)',
          }),
        ]),
      );
    });

    it('should document bearer authentication for import endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      const spec = response.body;

      // Check security definitions
      expect(spec.components.securitySchemes).toHaveProperty('JWT-auth');
      expect(spec.components.securitySchemes['JWT-auth']).toMatchObject({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });

      // Check that import endpoints have security requirements
      const importVideoPath = spec.paths['/import/youtube/video'];
      expect(importVideoPath.post.security).toEqual([{ 'JWT-auth': [] }]);
    });

    it('should document request/response schemas for import endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      const spec = response.body;
      const components = spec.components.schemas;

      // Check that DTOs are documented
      expect(components).toHaveProperty('ImportVideoDto');
      expect(components).toHaveProperty('ImportChannelDto');
      expect(components).toHaveProperty('ImportBySourceTypeDto');
      expect(components).toHaveProperty('ImportResultDto');
      expect(components).toHaveProperty('ImportedContentDto');

      // Verify ImportVideoDto structure
      const importVideoDto = components.ImportVideoDto;
      expect(importVideoDto.properties).toHaveProperty('url');
      expect(importVideoDto.properties).toHaveProperty('categoryId');
      expect(importVideoDto.required).toContain('url');

      // Verify ImportResultDto structure
      const importResultDto = components.ImportResultDto;
      expect(importResultDto.properties).toHaveProperty('success');
      expect(importResultDto.properties).toHaveProperty('importedCount');
      expect(importResultDto.properties).toHaveProperty('duplicatesSkipped');
      expect(importResultDto.properties).toHaveProperty('imported');
      expect(importResultDto.properties).toHaveProperty('errors');
      expect(importResultDto.properties).toHaveProperty('message');
    });

    it('should document HTTP status codes for import endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      const spec = response.body;
      const importVideoEndpoint = spec.paths['/import/youtube/video'].post;

      expect(importVideoEndpoint.responses).toHaveProperty('200');
      expect(importVideoEndpoint.responses).toHaveProperty('400');
      expect(importVideoEndpoint.responses).toHaveProperty('401');

      expect(importVideoEndpoint.responses['200'].description).toBe(
        'Video imported successfully',
      );
      expect(importVideoEndpoint.responses['400'].description).toBe(
        'Invalid YouTube URL or video not found',
      );
      expect(importVideoEndpoint.responses['401'].description).toBe(
        'Unauthorized - Valid JWT token required',
      );
    });

    it('should document operation summaries and descriptions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      const spec = response.body;

      const youtubeVideoEndpoint = spec.paths['/import/youtube/video'].post;
      expect(youtubeVideoEndpoint.summary).toBe(
        'Import single video from YouTube',
      );
      expect(youtubeVideoEndpoint.description).toBe(
        'Imports a single video from YouTube by providing its URL',
      );

      const youtubeChannelEndpoint = spec.paths['/import/youtube/channel'].post;
      expect(youtubeChannelEndpoint.summary).toBe(
        'Import videos from YouTube channel',
      );
      expect(youtubeChannelEndpoint.description).toBe(
        'Imports multiple videos from a YouTube channel with optional limit',
      );

      const sourcesEndpoint = spec.paths['/import/sources'].get;
      expect(sourcesEndpoint.summary).toBe('Get supported source types');
      expect(sourcesEndpoint.description).toBe(
        'Returns a list of all supported import source types',
      );
    });

    it('should include enum values in schema documentation', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      const spec = response.body;
      const components = spec.components.schemas;

      // Check SourceType enum
      expect(components).toHaveProperty('SourceType');
      expect(components.SourceType.enum).toEqual([
        'MANUAL',
        'YOUTUBE',
        'VIMEO',
        'RSS',
        'API',
      ]);

      // Check Language enum
      expect(components).toHaveProperty('Language');
      expect(components.Language.enum).toEqual(['ENGLISH', 'ARABIC']);

      // Check MediaType enum
      expect(components).toHaveProperty('MediaType');
      expect(components.MediaType.enum).toEqual(['VIDEO', 'AUDIO']);
    });

    it('should document examples in request/response schemas', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      const spec = response.body;
      const components = spec.components.schemas;

      // Check that ImportVideoDto has examples
      const importVideoDto = components.ImportVideoDto;
      expect(importVideoDto.properties.url.example).toBe(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      );
      expect(importVideoDto.properties.categoryId.example).toBe(
        '550e8400-e29b-41d4-a716-446655440000',
      );

      // Check that ImportResultDto has examples
      const importResultDto = components.ImportResultDto;
      expect(importResultDto.properties.success.example).toBe(true);
      expect(importResultDto.properties.importedCount.example).toBe(5);
      expect(importResultDto.properties.message.example).toBe(
        'Successfully imported 5 items, skipped 2 duplicates',
      );
    });
  });

  describe('API Documentation Content', () => {
    it('should include comprehensive API description', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      const spec = response.body;

      expect(spec.info.description).toContain('Content Management System API');
      expect(spec.info.description).toContain('Import videos from YouTube');
      expect(spec.info.description).toContain('Extensible adapter pattern');
      expect(spec.info.description).toContain('Automatic duplicate detection');
    });

    it('should document all import endpoint tags consistently', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      const spec = response.body;
      const paths = spec.paths;

      // All import endpoints should have the 'import' tag
      const importEndpoints = [
        '/import/youtube/video',
        '/import/youtube/channel',
        '/import/by-source',
        '/import/video',
        '/import/sources',
        '/import/check-duplicate',
      ];

      importEndpoints.forEach((endpoint) => {
        const methods = Object.keys(paths[endpoint]);
        methods.forEach((method) => {
          expect(paths[endpoint][method].tags).toContain('import');
        });
      });
    });
  });
});
