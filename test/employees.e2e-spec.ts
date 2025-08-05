import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { PrismaErrorMapperService } from '../src/common/services/prisma-error-mapper.service';

describe('EmployeesController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;

  const timestamp = Date.now();
  const testEmployee = {
    firstName: 'John',
    lastName: 'Doe',
    email: `john.doe.emp.${timestamp}@example.com`,
    password: 'password123',
    phone: '+1234567890',
    department: 'IT',
    position: 'Developer',
    salary: 50000,
    isActive: true,
  };

  const mockEmployee = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: `jane.smith.emp.${timestamp}@example.com`,
    password: 'password123',
    phone: '+1234567891',
    department: 'HR',
    position: 'Manager',
    salary: 60000,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes and filters
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

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
          contains: `emp.${timestamp}@example.com`,
        },
      },
    });

    // Create a test employee and get access token
    const hashedPassword = await bcrypt.hash(testEmployee.password, 10);
    await prismaService.employee.create({
      data: {
        ...testEmployee,
        password: hashedPassword,
      },
    });

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmployee.email,
        password: testEmployee.password,
      });

    if (loginResponse.status !== 201) {
      console.error('Login failed:', loginResponse.body);
      throw new Error(`Login failed with status ${loginResponse.status}`);
    }

    accessToken = loginResponse.body.access_token;

    if (!accessToken) {
      console.error('No access token received:', loginResponse.body);
      throw new Error('No access token received from login');
    }
  });

  afterAll(async () => {
    // Clean up test data specific to this test suite
    await prismaService.employee.deleteMany({
      where: {
        email: {
          contains: `emp.${timestamp}@example.com`,
        },
      },
    });
    await app.close();
  });

  describe('/employees (POST)', () => {
    it('should create a new employee with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(mockEmployee)
        .expect(HttpStatus.CREATED);

      expect(response.body.firstName).toBe(mockEmployee.firstName);
      expect(response.body.email).toBe(mockEmployee.email);
      expect(response.body).toHaveProperty('id');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without authentication token', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .send(mockEmployee)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'John',
          // missing required fields
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('/employees (GET)', () => {
    it('should return all employees with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).not.toHaveProperty('password');
    });

    it('should return 401 without authentication token', async () => {
      await request(app.getHttpServer())
        .get('/employees')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should filter active employees', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees?active=true')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('/employees/:id (GET)', () => {
    it('should return a single employee with valid token', async () => {
      // First create an employee to get its ID
      const createResponse = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(mockEmployee);

      const employeeId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/employees/${employeeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(employeeId);
      expect(response.body.firstName).toBe(mockEmployee.firstName);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without authentication token', async () => {
      await request(app.getHttpServer())
        .get('/employees/1')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 for non-existent employee', async () => {
      await request(app.getHttpServer())
        .get('/employees/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('/employees/:id (PATCH)', () => {
    it('should update an employee with valid token', async () => {
      // First create an employee to update
      const createResponse = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(mockEmployee);

      const employeeId = createResponse.body.id;

      const updateData = {
        firstName: 'UpdatedJane',
        department: 'Engineering',
      };

      const response = await request(app.getHttpServer())
        .patch(`/employees/${employeeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(response.body.firstName).toBe('UpdatedJane');
      expect(response.body.department).toBe('Engineering');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without authentication token', async () => {
      await request(app.getHttpServer())
        .patch('/employees/1')
        .send({ firstName: 'Jane' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('/employees/:id (DELETE)', () => {
    it('should delete an employee with valid token', async () => {
      // First create an employee to delete
      const createResponse = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(mockEmployee);

      const employeeId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .delete(`/employees/${employeeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Employee deleted successfully');
    });

    it('should return 401 without authentication token', async () => {
      await request(app.getHttpServer())
        .delete('/employees/1')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
