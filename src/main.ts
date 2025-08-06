import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { PrismaErrorMapperService } from './common/services/prisma-error-mapper.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Register global exception filter for Prisma errors
  const errorMapper = new PrismaErrorMapperService();
  app.useGlobalFilters(new PrismaExceptionFilter(errorMapper));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Thmanyah CMS API')
    .setDescription(
      `
      Content Management System API for Thmanyah with JWT Authentication
      
      ## Features
      - Employee Management: Complete CRUD operations for staff management
      - Category Management: Organize content into categories
      - Program Management: Media content with multi-language support
      - Content Import: Import videos from external sources (YouTube, with extensible adapter pattern)
      
      ## Authentication
      This API uses JWT Bearer token authentication. To access protected endpoints:
      1. Login using /auth/login to get access and refresh tokens
      2. Include the access token in Authorization header: "Bearer <token>"
      3. Use /auth/refresh to get new access token when it expires
      
      ## Import System
      - Import videos from YouTube by URL or channel
      - Automatic duplicate detection using external ID + source type
      - Extensible adapter pattern for adding new sources (Vimeo, RSS, etc.)
      - Support for single video import and bulk channel import
      
      ## Security
      - Access tokens expire in 15 minutes
      - Refresh tokens expire in 7 days
      - All passwords are securely hashed with bcrypt
      - All endpoints require valid authentication
    `,
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

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
