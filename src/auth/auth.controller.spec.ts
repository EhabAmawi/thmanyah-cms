import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
    findUserById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'john.doe@example.com',
      password: 'password123',
    };

    const mockLoginResponse = {
      access_token: 'access_token_123',
      refresh_token: 'refresh_token_123',
      user: {
        id: 1,
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    it('should return tokens and user info for valid credentials', async () => {
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockLoginResponse);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('should throw UnauthorizedException for inactive account', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Account is inactive'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Account is inactive'),
      );
    });
  });

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: 'valid_refresh_token_123',
    };

    const mockRefreshResponse = {
      access_token: 'new_access_token_123',
    };

    it('should return new access token for valid refresh token', async () => {
      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(
        refreshTokenDto.refresh_token,
      );
      expect(result).toEqual(mockRefreshResponse);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      const expiredTokenDto: RefreshTokenDto = {
        refresh_token: 'expired_refresh_token',
      };

      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(controller.refresh(expiredTokenDto)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });
  });

  describe('getProfile', () => {
    const mockUser = {
      id: 1,
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    const mockRequest = {
      user: {
        userId: 1,
      },
    };

    it('should return user profile for authenticated user', async () => {
      mockAuthService.findUserById.mockResolvedValue(mockUser);

      const result = await controller.getProfile(mockRequest);

      expect(authService.findUserById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockAuthService.findUserById.mockRejectedValue(
        new UnauthorizedException('User not found'),
      );

      await expect(controller.getProfile(mockRequest)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });

    it('should handle different user IDs correctly', async () => {
      const differentUserRequest = {
        user: {
          userId: 999,
        },
      };

      const differentUser = {
        ...mockUser,
        id: 999,
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockAuthService.findUserById.mockResolvedValue(differentUser);

      const result = await controller.getProfile(differentUserRequest);

      expect(authService.findUserById).toHaveBeenCalledWith(999);
      expect(result).toEqual(differentUser);
    });
  });

  describe('error handling', () => {
    it('should handle service errors properly in login', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle service errors properly in refresh', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refresh_token: 'some_token',
      };

      mockAuthService.refreshToken.mockRejectedValue(
        new Error('JWT verification failed'),
      );

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(
        'JWT verification failed',
      );
    });

    it('should handle service errors properly in getProfile', async () => {
      const mockRequest = {
        user: {
          userId: 1,
        },
      };

      mockAuthService.findUserById.mockRejectedValue(
        new Error('Database query failed'),
      );

      await expect(controller.getProfile(mockRequest)).rejects.toThrow(
        'Database query failed',
      );
    });
  });
});
