import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { EmployeesController } from '../src/employees/employees.controller';
import { EmployeesService } from '../src/employees/employees.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { PrismaErrorMapperService } from '../src/common/services/prisma-error-mapper.service';

describe('EmployeesController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const mockEmployee = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    department: 'IT',
    position: 'Developer',
    salary: 50000,
  };

  const mockPrismaService = {
    employee: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        EmployeesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Register the same global exception filter as in main.ts
    const errorMapper = new PrismaErrorMapperService();
    app.useGlobalFilters(new PrismaExceptionFilter(errorMapper));

    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('/employees (POST)', () => {
    it('should create a new employee', () => {
      const createdEmployee = {
        id: 1,
        ...mockEmployee,
        hireDate: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.employee.create.mockResolvedValue(createdEmployee);

      return request(app.getHttpServer())
        .post('/employees')
        .send(mockEmployee)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.firstName).toBe(mockEmployee.firstName);
          expect(res.body.email).toBe(mockEmployee.email);
          expect(res.body.id).toBe(1);
        });
    });

    it('should return conflict when creating employee with duplicate email', () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
      };
      mockPrismaService.employee.create.mockRejectedValue(prismaError);

      return request(app.getHttpServer())
        .post('/employees')
        .send(mockEmployee)
        .expect(HttpStatus.CONFLICT)
        .expect((res) => {
          expect(res.body.message).toContain('email already exists');
        });
    });
  });

  describe('/employees (GET)', () => {
    it('should return all employees', () => {
      const employees = [
        { id: 1, ...mockEmployee, isActive: true },
        {
          id: 2,
          ...mockEmployee,
          email: 'jane@example.com',
          firstName: 'Jane',
        },
      ];
      mockPrismaService.employee.findMany.mockResolvedValue(employees);

      return request(app.getHttpServer())
        .get('/employees')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
          expect(res.body[0].firstName).toBe('John');
        });
    });

    it('should return only active employees when active=true', () => {
      const activeEmployees = [{ id: 1, ...mockEmployee, isActive: true }];
      mockPrismaService.employee.findMany.mockResolvedValue(activeEmployees);

      return request(app.getHttpServer())
        .get('/employees?active=true')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveLength(1);
          expect(res.body[0].isActive).toBe(true);
        });
    });
  });

  describe('/employees/:id (GET)', () => {
    it('should return a single employee', () => {
      const employee = { id: 1, ...mockEmployee };
      mockPrismaService.employee.findUnique.mockResolvedValue(employee);

      return request(app.getHttpServer())
        .get('/employees/1')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.id).toBe(1);
          expect(res.body.firstName).toBe(mockEmployee.firstName);
        });
    });

    it('should return not found for non-existent employee', () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .get('/employees/999')
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Employee not found');
        });
    });
  });

  describe('/employees/:id (PATCH)', () => {
    it('should update an employee', () => {
      const updatedEmployee = {
        id: 1,
        ...mockEmployee,
        firstName: 'Jane',
        department: 'HR',
      };
      mockPrismaService.employee.update.mockResolvedValue(updatedEmployee);

      return request(app.getHttpServer())
        .patch('/employees/1')
        .send({ firstName: 'Jane', department: 'HR' })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.firstName).toBe('Jane');
          expect(res.body.department).toBe('HR');
        });
    });

    it('should return not found when updating non-existent employee', () => {
      const prismaError = { code: 'P2025' };
      mockPrismaService.employee.update.mockRejectedValue(prismaError);

      return request(app.getHttpServer())
        .patch('/employees/999')
        .send({ firstName: 'Jane' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('/employees/:id (DELETE)', () => {
    it('should delete an employee', () => {
      const deletedEmployee = { id: 1, ...mockEmployee };
      mockPrismaService.employee.delete.mockResolvedValue(deletedEmployee);

      return request(app.getHttpServer())
        .delete('/employees/1')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.message).toBe('Employee deleted successfully');
        });
    });

    it('should return not found when deleting non-existent employee', () => {
      const prismaError = { code: 'P2025' };
      mockPrismaService.employee.delete.mockRejectedValue(prismaError);

      return request(app.getHttpServer())
        .delete('/employees/999')
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
