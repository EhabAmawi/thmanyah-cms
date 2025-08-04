import { HttpStatus, Injectable } from '@nestjs/common';

export interface PrismaErrorMapping {
  status: HttpStatus;
  message: string;
}

@Injectable()
export class PrismaErrorMapperService {
  private readonly errorMap = new Map<string, PrismaErrorMapping>([
    [
      'P2002',
      {
        status: HttpStatus.CONFLICT,
        message: 'A record with this unique field already exists',
      },
    ],
    [
      'P2025',
      {
        status: HttpStatus.NOT_FOUND,
        message: 'Record not found',
      },
    ],
    [
      'P2003',
      {
        status: HttpStatus.BAD_REQUEST,
        message: 'Foreign key constraint failed',
      },
    ],
    [
      'P2014',
      {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid ID provided in the request',
      },
    ],
    [
      'P2016',
      {
        status: HttpStatus.BAD_REQUEST,
        message: 'Query interpretation error',
      },
    ],
    [
      'P2021',
      {
        status: HttpStatus.NOT_FOUND,
        message: 'Table does not exist in the current database',
      },
    ],
    [
      'P2022',
      {
        status: HttpStatus.NOT_FOUND,
        message: 'Column does not exist in the current database',
      },
    ],
  ]);

  mapError(error: any): PrismaErrorMapping | null {
    if (!error?.code || typeof error.code !== 'string') {
      return null;
    }

    const mapping = this.errorMap.get(error.code);
    if (!mapping) {
      return null;
    }

    // Customize message based on error details
    let customMessage = mapping.message;

    if (error.code === 'P2002' && error.meta?.target) {
      const field = Array.isArray(error.meta.target)
        ? error.meta.target.join(', ')
        : error.meta.target;
      customMessage = `A record with this ${field} already exists`;
    }

    return {
      status: mapping.status,
      message: customMessage,
    };
  }

  isPrismaError(error: any): boolean {
    return Boolean(
      error?.code &&
        typeof error.code === 'string' &&
        error.code.startsWith('P'),
    );
  }
}
