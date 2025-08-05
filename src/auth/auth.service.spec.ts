import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockEmployee = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'hashedPassword123',
    phone: '+1234567890',
    department: 'IT',
    position: 'Developer',
    salary: 50000,
    hireDate: new Date('2023-01-01'),
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockEmployeeWithoutPassword = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    department: 'IT',
    position: 'Developer',
    salary: 50000,
    hireDate: new Date('2023-01-01'),
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockPrismaService = {
    employee: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'john.doe@example.com',
        'password123',
      );

      expect(mockPrismaService.employee.findUnique).toHaveBeenCalledWith({
        where: { email: 'john.doe@example.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashedPassword123',
      );
      expect(result).toEqual(mockEmployeeWithoutPassword);
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user is not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password123',
      );

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is invalid', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'john.doe@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'john.doe@example.com',
      password: 'password123',
    };

    it('should return access and refresh tokens for valid credentials', async () => {
      jest
        .spyOn(service, 'validateUser')
        .mockResolvedValue(mockEmployeeWithoutPassword);
      mockJwtService.sign
        .mockReturnValueOnce('access_token_123')
        .mockReturnValueOnce('refresh_token_123');

      const result = await service.login(loginDto);

      expect(service.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(1, {
        email: mockEmployeeWithoutPassword.email,
        sub: mockEmployeeWithoutPassword.id,
      });
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        2,
        {
          email: mockEmployeeWithoutPassword.email,
          sub: mockEmployeeWithoutPassword.id,
        },
        { expiresIn: '7d' },
      );

      expect(result).toEqual({
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        user: {
          id: mockEmployeeWithoutPassword.id,
          email: mockEmployeeWithoutPassword.email,
          firstName: mockEmployeeWithoutPassword.firstName,
          lastName: mockEmployeeWithoutPassword.lastName,
        },
      });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockEmployeeWithoutPassword, isActive: false };
      jest.spyOn(service, 'validateUser').mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Account is inactive'),
      );
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid_refresh_token';

    it('should return new access token for valid refresh token', async () => {
      const payload = { sub: 1, email: 'john.doe@example.com' };
      mockJwtService.verify.mockReturnValue(payload);
      mockPrismaService.employee.findUnique.mockResolvedValue(
        mockEmployeeWithoutPassword,
      );
      mockJwtService.sign.mockReturnValue('new_access_token');

      const result = await service.refreshToken(refreshToken);

      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken);
      expect(mockPrismaService.employee.findUnique).toHaveBeenCalledWith({
        where: { id: payload.sub },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: mockEmployeeWithoutPassword.email,
        sub: mockEmployeeWithoutPassword.id,
      });
      expect(result).toEqual({
        access_token: 'new_access_token',
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid_token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const payload = { sub: 999, email: 'nonexistent@example.com' };
      mockJwtService.verify.mockReturnValue(payload);
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const payload = { sub: 1, email: 'john.doe@example.com' };
      const inactiveUser = { ...mockEmployeeWithoutPassword, isActive: false };
      mockJwtService.verify.mockReturnValue(payload);
      mockPrismaService.employee.findUnique.mockResolvedValue(inactiveUser);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });
  });

  describe('findUserById', () => {
    it('should return user when found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(
        mockEmployeeWithoutPassword,
      );

      const result = await service.findUserById(1);

      expect(mockPrismaService.employee.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(mockEmployeeWithoutPassword);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      await expect(service.findUserById(999)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });
  });
});
