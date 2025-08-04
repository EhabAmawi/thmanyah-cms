import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { PrismaErrorMapperService } from './common/services/prisma-error-mapper.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Register global exception filter for Prisma errors
  const errorMapper = new PrismaErrorMapperService();
  app.useGlobalFilters(new PrismaExceptionFilter(errorMapper));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Thmanyah CMS API')
    .setDescription('Content Management System API for Thmanyah')
    .setVersion('1.0')
    .addTag('employees', 'Employee management endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
