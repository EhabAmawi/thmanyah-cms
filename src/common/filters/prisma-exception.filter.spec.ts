import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { PrismaExceptionFilter } from './prisma-exception.filter';
import { PrismaErrorMapperService } from '../services/prisma-error-mapper.service';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let errorMapper: jest.Mocked<PrismaErrorMapperService>;
  let mockResponse: any;
  let mockHost: jest.Mocked<ArgumentsHost>;

  beforeEach(() => {
    errorMapper = {
      isPrismaError: jest.fn(),
      mapError: jest.fn(),
    } as any;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as any;

    filter = new PrismaExceptionFilter(errorMapper);
  });

  describe('catch', () => {
    it('should handle HttpException and pass it through', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Test error',
        timestamp: expect.any(String),
      });
    });

    it('should handle HttpException with object response', () => {
      const exception = new HttpException(
        { message: 'Validation failed' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        timestamp: expect.any(String),
      });
    });

    it('should handle Prisma error and map it correctly', () => {
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
      };

      errorMapper.isPrismaError.mockReturnValue(true);
      errorMapper.mapError.mockReturnValue({
        status: HttpStatus.CONFLICT,
        message: 'A record with this email already exists',
      });

      filter.catch(prismaError, mockHost);

      expect(errorMapper.isPrismaError).toHaveBeenCalledWith(prismaError);
      expect(errorMapper.mapError).toHaveBeenCalledWith(prismaError);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.CONFLICT,
        message: 'A record with this email already exists',
        timestamp: expect.any(String),
      });
    });

    it('should handle unmapped Prisma error as internal server error', () => {
      const prismaError = {
        code: 'P9999',
        message: 'Unknown Prisma error',
      };

      errorMapper.isPrismaError.mockReturnValue(true);
      errorMapper.mapError.mockReturnValue(null);

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        timestamp: expect.any(String),
      });
    });

    it('should handle non-Prisma error as internal server error', () => {
      const genericError = new Error('Something went wrong');

      errorMapper.isPrismaError.mockReturnValue(false);

      filter.catch(genericError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        timestamp: expect.any(String),
      });
    });
  });
});
