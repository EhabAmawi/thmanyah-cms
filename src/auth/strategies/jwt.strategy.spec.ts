import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../auth.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: AuthService;

  const mockAuthService = {
    findUserById: jest.fn(),
  };

  const mockUser = {
    id: 1,
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const mockPayload = {
      sub: 1,
      email: 'john.doe@example.com',
    };

    it('should return user data when user exists', async () => {
      mockAuthService.findUserById.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockPayload);

      expect(authService.findUserById).toHaveBeenCalledWith(mockPayload.sub);
      expect(result).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockAuthService.findUserById.mockResolvedValue(null);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when authService throws error', async () => {
      mockAuthService.findUserById.mockRejectedValue(
        new UnauthorizedException('User not found'),
      );

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle different user IDs correctly', async () => {
      const differentPayload = {
        sub: 999,
        email: 'jane.smith@example.com',
      };

      const differentUser = {
        ...mockUser,
        id: 999,
        email: 'jane.smith@example.com',
      };

      mockAuthService.findUserById.mockResolvedValue(differentUser);

      const result = await strategy.validate(differentPayload);

      expect(authService.findUserById).toHaveBeenCalledWith(999);
      expect(result).toEqual({
        userId: 999,
        email: 'jane.smith@example.com',
      });
    });

    it('should only return userId and email from user object', async () => {
      const userWithExtraFields = {
        ...mockUser,
        password: 'hashedPassword',
        salary: 50000,
        department: 'IT',
      };

      mockAuthService.findUserById.mockResolvedValue(userWithExtraFields);

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        userId: userWithExtraFields.id,
        email: userWithExtraFields.email,
      });
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('salary');
      expect(result).not.toHaveProperty('department');
    });
  });

  describe('constructor', () => {
    it('should be properly configured', () => {
      expect(strategy).toBeDefined();
      expect(strategy).toBeInstanceOf(JwtStrategy);
    });
  });
});
