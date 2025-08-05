import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { PrismaErrorMapperService } from '../src/common/services/prisma-error-mapper.service';

describe('Authentication E2E', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const timestamp = Date.now();
  const testEmployee = {
    firstName: 'John',
    lastName: 'Doe',
    email: `john.doe.auth.${timestamp}@example.com`,
    password: 'password123',
    department: 'IT',
    position: 'Developer',
    salary: 50000,
    isActive: true,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply global pipes and filters
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    const errorMapper = new PrismaErrorMapperService();
    app.useGlobalFilters(new PrismaExceptionFilter(errorMapper));

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    // Clean up test data specific to this test suite  
    await prismaService.employee.deleteMany({
      where: {
        email: {
          contains: `auth.${timestamp}@example.com`,
        },
      },
    });

    // Create a test employee
    const hashedPassword = await bcrypt.hash(testEmployee.password, 10);
    await prismaService.employee.create({
      data: {
        ...testEmployee,
        password: hashedPassword,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data specific to this test suite
    await prismaService.employee.deleteMany({
      where: {
        email: {
          contains: `auth.${timestamp}@example.com`,
        },
      },
    });
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmployee.email,
          password: testEmployee.password,
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testEmployee.email);
      expect(response.body.user.firstName).toBe(testEmployee.firstName);
      expect(response.body.user.lastName).toBe(testEmployee.lastName);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testEmployee.password,
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmployee.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for inactive employee', async () => {
      // Create inactive employee
      const inactiveEmployee = {
        ...testEmployee,
        email: `inactive.auth.${timestamp}@example.com`,
        isActive: false,
      };
      const hashedPassword = await bcrypt.hash(inactiveEmployee.password, 10);
      await prismaService.employee.create({
        data: {
          ...inactiveEmployee,
          password: hashedPassword,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: inactiveEmployee.email,
          password: inactiveEmployee.password,
        })
        .expect(401);

      expect(response.body.message).toBe('Account is inactive');
    });

    it('should validate input data', async () => {
      // Test missing email
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: testEmployee.password,
        })
        .expect(400);

      // Test missing password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmployee.email,
        })
        .expect(400);

      // Test invalid email format
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: testEmployee.password,
        })
        .expect(400);

      // Test short password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmployee.email,
          password: '123',
        })
        .expect(400);
    });
  });

  describe('/auth/refresh (POST)', () => {
    let validRefreshToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmployee.email,
          password: testEmployee.password,
        });

      validRefreshToken = loginResponse.body.refresh_token;
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: validRefreshToken,
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(typeof response.body.access_token).toBe('string');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: 'invalid.refresh.token',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should return 401 for missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });

    it('should return 401 for empty refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: '',
        })
        .expect(400);
    });
  });

  describe('/auth/profile (POST)', () => {
    let validAccessToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmployee.email,
          password: testEmployee.password,
        });

      validAccessToken = loginResponse.body.access_token;
    });

    it('should return user profile with valid access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/profile')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testEmployee.email);
      expect(response.body.firstName).toBe(testEmployee.firstName);
      expect(response.body.lastName).toBe(testEmployee.lastName);
      expect(response.body.isActive).toBe(true);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without access token', async () => {
      await request(app.getHttpServer())
        .post('/auth/profile')
        .expect(401);
    });

    it('should return 401 with invalid access token', async () => {
      await request(app.getHttpServer())
        .post('/auth/profile')
        .set('Authorization', 'Bearer invalid.access.token')
        .expect(401);
    });

    it('should return 401 with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .post('/auth/profile')
        .set('Authorization', 'InvalidBearer token')
        .expect(401);
    });
  });

  describe('Protected endpoints integration', () => {
    let validAccessToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmployee.email,
          password: testEmployee.password,
        });

      validAccessToken = loginResponse.body.access_token;
    });

    it('should access protected employee endpoints with valid token', async () => {
      // Test GET /employees
      const response = await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should deny access to protected endpoints without token', async () => {
      await request(app.getHttpServer())
        .get('/employees')
        .expect(401);
    });

    it('should deny access to protected endpoints with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);
    });
  });

  describe('Token expiration and refresh flow', () => {
    it('should handle full authentication flow', async () => {
      // 1. Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmployee.email,
          password: testEmployee.password,
        })
        .expect(201);

      const { access_token, refresh_token } = loginResponse.body;

      // 2. Access protected resource
      await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      // 3. Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token,
        })
        .expect(201);

      const newAccessToken = refreshResponse.body.access_token;

      // 4. Access protected resource with new token
      await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);
    });
  });
});