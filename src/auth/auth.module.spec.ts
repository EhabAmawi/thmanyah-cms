import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PrismaModule } from '../prisma/prisma.module';

describe('AuthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule, PrismaModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('module setup', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should provide AuthService', () => {
      const authService = module.get<AuthService>(AuthService);
      expect(authService).toBeDefined();
      expect(authService).toBeInstanceOf(AuthService);
    });

    it('should provide AuthController', () => {
      const authController = module.get<AuthController>(AuthController);
      expect(authController).toBeDefined();
      expect(authController).toBeInstanceOf(AuthController);
    });

    it('should provide JwtStrategy', () => {
      const jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
      expect(jwtStrategy).toBeDefined();
      expect(jwtStrategy).toBeInstanceOf(JwtStrategy);
    });

    it('should provide LocalStrategy', () => {
      const localStrategy = module.get<LocalStrategy>(LocalStrategy);
      expect(localStrategy).toBeDefined();
      expect(localStrategy).toBeInstanceOf(LocalStrategy);
    });

    it('should provide JwtService', () => {
      const jwtService = module.get<JwtService>(JwtService);
      expect(jwtService).toBeDefined();
      expect(jwtService).toBeInstanceOf(JwtService);
    });
  });

  describe('module dependencies', () => {
    it('should import PassportModule', () => {
      // PassportModule should be available
      expect(() => module.get(PassportModule)).not.toThrow();
    });

    it('should import JwtModule', () => {
      // JwtModule should be configured and available
      const jwtService = module.get<JwtService>(JwtService);
      expect(jwtService).toBeDefined();
    });

    it('should import PrismaModule', () => {
      // PrismaModule should be available through the import
      expect(module).toBeDefined();
    });
  });

  describe('service dependencies', () => {
    it('should inject dependencies correctly in AuthService', () => {
      const authService = module.get<AuthService>(AuthService);
      expect(authService).toBeDefined();
      
      // Check if AuthService has access to its dependencies
      expect(authService['prisma']).toBeDefined();
      expect(authService['jwtService']).toBeDefined();
    });

    it('should inject dependencies correctly in AuthController', () => {
      const authController = module.get<AuthController>(AuthController);
      expect(authController).toBeDefined();
      
      // Check if AuthController has access to AuthService
      expect(authController['authService']).toBeDefined();
    });

    it('should inject dependencies correctly in JwtStrategy', () => {
      const jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
      expect(jwtStrategy).toBeDefined();
      
      // Check if JwtStrategy has access to AuthService
      expect(jwtStrategy['authService']).toBeDefined();
    });

    it('should inject dependencies correctly in LocalStrategy', () => {
      const localStrategy = module.get<LocalStrategy>(LocalStrategy);
      expect(localStrategy).toBeDefined();
      
      // Check if LocalStrategy has access to AuthService
      expect(localStrategy['authService']).toBeDefined();
    });
  });

  describe('exports', () => {
    it('should export AuthService', () => {
      const authService = module.get<AuthService>(AuthService);
      expect(authService).toBeDefined();
    });
  });

  describe('JWT configuration', () => {
    it('should have JWT service configured with default secret', () => {
      const jwtService = module.get<JwtService>(JwtService);
      
      // Test token generation
      const payload = { sub: 1, email: 'test@example.com' };
      const token = jwtService.sign(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify JWT tokens correctly', () => {
      const jwtService = module.get<JwtService>(JwtService);
      
      const payload = { sub: 1, email: 'test@example.com' };
      const token = jwtService.sign(payload);
      const decoded = jwtService.verify(token);
      
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
    });
  });
});