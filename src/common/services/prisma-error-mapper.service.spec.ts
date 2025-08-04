import { HttpStatus } from '@nestjs/common';
import { PrismaErrorMapperService } from './prisma-error-mapper.service';

describe('PrismaErrorMapperService', () => {
  let service: PrismaErrorMapperService;

  beforeEach(() => {
    service = new PrismaErrorMapperService();
  });

  describe('mapError', () => {
    it('should map P2002 error to CONFLICT status', () => {
      const error = {
        code: 'P2002',
        meta: { target: ['email'] },
      };

      const result = service.mapError(error);

      expect(result).toEqual({
        status: HttpStatus.CONFLICT,
        message: 'A record with this email already exists',
      });
    });

    it('should map P2002 error with multiple fields', () => {
      const error = {
        code: 'P2002',
        meta: { target: ['email', 'phone'] },
      };

      const result = service.mapError(error);

      expect(result).toEqual({
        status: HttpStatus.CONFLICT,
        message: 'A record with this email, phone already exists',
      });
    });

    it('should map P2025 error to NOT_FOUND status', () => {
      const error = {
        code: 'P2025',
      };

      const result = service.mapError(error);

      expect(result).toEqual({
        status: HttpStatus.NOT_FOUND,
        message: 'Record not found',
      });
    });

    it('should map P2003 error to BAD_REQUEST status', () => {
      const error = {
        code: 'P2003',
      };

      const result = service.mapError(error);

      expect(result).toEqual({
        status: HttpStatus.BAD_REQUEST,
        message: 'Foreign key constraint failed',
      });
    });

    it('should return null for unknown Prisma error', () => {
      const error = {
        code: 'P9999',
      };

      const result = service.mapError(error);

      expect(result).toBeNull();
    });

    it('should return null for non-Prisma error', () => {
      const error = {
        message: 'Some other error',
      };

      const result = service.mapError(error);

      expect(result).toBeNull();
    });

    it('should return null for null error', () => {
      const result = service.mapError(null);

      expect(result).toBeNull();
    });
  });

  describe('isPrismaError', () => {
    it('should return true for valid Prisma error', () => {
      const error = {
        code: 'P2002',
      };

      const result = service.isPrismaError(error);

      expect(result).toBe(true);
    });

    it('should return false for non-Prisma error code', () => {
      const error = {
        code: 'E001',
      };

      const result = service.isPrismaError(error);

      expect(result).toBe(false);
    });

    it('should return false for error without code', () => {
      const error = {
        message: 'Some error',
      };

      const result = service.isPrismaError(error);

      expect(result).toBe(false);
    });

    it('should return false for null error', () => {
      const result = service.isPrismaError(null);

      expect(result).toBe(false);
    });

    it('should return false for error with non-string code', () => {
      const error = {
        code: 123,
      };

      const result = service.isPrismaError(error);

      expect(result).toBe(false);
    });
  });
});
