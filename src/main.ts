import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { PrismaErrorMapperService } from './common/services/prisma-error-mapper.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Register global exception filter for Prisma errors
  const errorMapper = new PrismaErrorMapperService();
  app.useGlobalFilters(new PrismaExceptionFilter(errorMapper));

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
