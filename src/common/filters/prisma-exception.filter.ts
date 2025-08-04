import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaErrorMapperService } from '../services/prisma-error-mapper.service';

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  constructor(private readonly errorMapper: PrismaErrorMapperService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Handle HttpExceptions (let them pass through)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = exception.getResponse();

      response.status(status).json({
        statusCode: status,
        message:
          typeof message === 'string' ? message : (message as any).message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Handle Prisma errors
    if (this.errorMapper.isPrismaError(exception)) {
      const mapping = this.errorMapper.mapError(exception);

      if (mapping) {
        this.logger.warn(
          `Prisma error ${exception.code}: ${exception.message}`,
        );

        response.status(mapping.status).json({
          statusCode: mapping.status,
          message: mapping.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // Handle unknown errors
    this.logger.error('Unexpected error:', exception);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
