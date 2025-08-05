import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import * as bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
}));

describe('EmployeesService', () => {
  let service: EmployeesService;

  const mockEmployee = {
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
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new employee', async () => {
      const createEmployeeDto: CreateEmployeeDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phone: '+1234567890',
        department: 'IT',
        position: 'Developer',
        salary: 50000,
      };

      mockPrismaService.employee.create.mockResolvedValue(mockEmployee as any);

      const result = await service.create(createEmployeeDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockPrismaService.employee.create).toHaveBeenCalledWith({
        data: {
          ...createEmployeeDto,
          password: 'hashedPassword123',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          department: true,
          position: true,
          salary: true,
          hireDate: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('findAll', () => {
    it('should return all employees ordered by createdAt desc', async () => {
      const employees = [mockEmployee];
      mockPrismaService.employee.findMany.mockResolvedValue(employees as any);

      const result = await service.findAll();

      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          department: true,
          position: true,
          salary: true,
          hireDate: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual(employees);
    });
  });

  describe('findOne', () => {
    it('should return a single employee by id', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(
        mockEmployee as any,
      );

      const result = await service.findOne(1);

      expect(mockPrismaService.employee.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          department: true,
          position: true,
          salary: true,
          hireDate: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(mockEmployee);
    });

    it('should return null if employee not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an employee', async () => {
      const updateEmployeeDto: UpdateEmployeeDto = {
        firstName: 'Jane',
        department: 'HR',
      };

      const updatedEmployee = { ...mockEmployee, ...updateEmployeeDto };
      mockPrismaService.employee.update.mockResolvedValue(
        updatedEmployee as any,
      );

      const result = await service.update(1, updateEmployeeDto);

      expect(mockPrismaService.employee.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateEmployeeDto,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          department: true,
          position: true,
          salary: true,
          hireDate: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(updatedEmployee);
    });

    it('should hash password when updating employee with password', async () => {
      const updateEmployeeDto: UpdateEmployeeDto = {
        firstName: 'Jane',
        password: 'newPassword123',
      };

      const updatedEmployee = { ...mockEmployee, ...updateEmployeeDto };
      mockPrismaService.employee.update.mockResolvedValue(
        updatedEmployee as any,
      );

      const result = await service.update(1, updateEmployeeDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(mockPrismaService.employee.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          ...updateEmployeeDto,
          password: 'hashedPassword123',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          department: true,
          position: true,
          salary: true,
          hireDate: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(updatedEmployee);
    });
  });

  describe('remove', () => {
    it('should delete an employee', async () => {
      mockPrismaService.employee.delete.mockResolvedValue(mockEmployee as any);

      const result = await service.remove(1);

      expect(mockPrismaService.employee.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('findActive', () => {
    it('should return only active employees', async () => {
      const activeEmployees = [mockEmployee];
      mockPrismaService.employee.findMany.mockResolvedValue(
        activeEmployees as any,
      );

      const result = await service.findActive();

      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          department: true,
          position: true,
          salary: true,
          hireDate: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual(activeEmployees);
    });
  });

  describe('findByDepartment', () => {
    it('should return employees by department', async () => {
      const itEmployees = [mockEmployee];
      mockPrismaService.employee.findMany.mockResolvedValue(itEmployees as any);

      const result = await service.findByDepartment('IT');

      expect(mockPrismaService.employee.findMany).toHaveBeenCalledWith({
        where: { department: 'IT' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          department: true,
          position: true,
          salary: true,
          hireDate: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          lastName: 'asc',
        },
      });
      expect(result).toEqual(itEmployees);
    });
  });
});
