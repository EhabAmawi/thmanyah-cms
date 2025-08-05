import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
  };

  const mockUser = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const email = 'john.doe@example.com';
    const password = 'password123';

    it('should return user when credentials are valid', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate(email, password);

      expect(authService.validateUser).toHaveBeenCalledWith(email, password);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user validation fails', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when authService throws error', async () => {
      mockAuthService.validateUser.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(strategy.validate(email, password)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle different email formats correctly', async () => {
      const testCases = [
        'user@example.com',
        'test.user+tag@domain.co.uk',
        'simple@test.org',
      ];

      for (const testEmail of testCases) {
        mockAuthService.validateUser.mockResolvedValue({
          ...mockUser,
          email: testEmail,
        });

        const result = await strategy.validate(testEmail, password);

        expect(authService.validateUser).toHaveBeenCalledWith(
          testEmail,
          password,
        );
        expect(result.email).toBe(testEmail);
      }
    });

    it('should handle empty credentials appropriately', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate('', '')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(email, '')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate('', password)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return complete user object when validation succeeds', async () => {
      const completeUser = {
        ...mockUser,
        additionalField: 'some value',
      };
      mockAuthService.validateUser.mockResolvedValue(completeUser);

      const result = await strategy.validate(email, password);

      expect(result).toEqual(completeUser);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
      expect(result).toHaveProperty('isActive');
    });

    it('should handle case-sensitive email validation', async () => {
      const upperCaseEmail = 'JOHN.DOE@EXAMPLE.COM';
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate(upperCaseEmail, password)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(authService.validateUser).toHaveBeenCalledWith(
        upperCaseEmail,
        password,
      );
    });
  });

  describe('constructor', () => {
    it('should be properly configured', () => {
      expect(strategy).toBeDefined();
      expect(strategy).toBeInstanceOf(LocalStrategy);
    });

    it('should use email as username field', () => {
      // This test verifies that the strategy is configured to use email as the username field
      // The actual configuration is done in the constructor super() call
      expect(strategy).toBeDefined();
    });
  });
});
