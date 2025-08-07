import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Decimal } from '@prisma/client/runtime/library';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let service: jest.Mocked<EmployeesService>;

  const mockEmployee = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    department: 'IT',
    position: 'Developer',
    salary: new Decimal(50000),
    hireDate: new Date('2023-01-01'),
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockEmployeesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findActive: jest.fn(),
    findByDepartment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: mockEmployeesService,
        },
      ],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
    service = module.get(EmployeesService);
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

      service.create.mockResolvedValue(mockEmployee as any);

      const result = await controller.create(createEmployeeDto);

      expect(service.create).toHaveBeenCalledWith(createEmployeeDto);
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('findAll', () => {
    it('should return all employees when no query params', async () => {
      const employees = [mockEmployee];
      service.findAll.mockResolvedValue(employees as any);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(employees);
    });

    it('should return active employees when active=true', async () => {
      const activeEmployees = [mockEmployee];
      service.findActive.mockResolvedValue(activeEmployees as any);

      const result = await controller.findAll('true');

      expect(service.findActive).toHaveBeenCalled();
      expect(result).toEqual(activeEmployees);
    });

    it('should return employees by department when department param provided', async () => {
      const itEmployees = [mockEmployee];
      service.findByDepartment.mockResolvedValue(itEmployees as any);

      const result = await controller.findAll(undefined, 'IT');

      expect(service.findByDepartment).toHaveBeenCalledWith('IT');
      expect(result).toEqual(itEmployees);
    });

    it('should prioritize active filter over department filter', async () => {
      const activeEmployees = [mockEmployee];
      service.findActive.mockResolvedValue(activeEmployees as any);

      const result = await controller.findAll('true', 'IT');

      expect(service.findActive).toHaveBeenCalled();
      expect(service.findByDepartment).not.toHaveBeenCalled();
      expect(result).toEqual(activeEmployees);
    });
  });

  describe('findOne', () => {
    it('should return a single employee', async () => {
      service.findOne.mockResolvedValue(mockEmployee as any);

      const result = await controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockEmployee);
    });

    it('should throw HttpException when employee not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne(999)).rejects.toThrow(
        new HttpException('Employee not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('update', () => {
    it('should update an employee', async () => {
      const updateEmployeeDto: UpdateEmployeeDto = {
        firstName: 'Jane',
        department: 'HR',
      };

      const updatedEmployee = { ...mockEmployee, ...updateEmployeeDto };
      service.update.mockResolvedValue(updatedEmployee as any);

      const result = await controller.update(1, updateEmployeeDto);

      expect(service.update).toHaveBeenCalledWith(1, updateEmployeeDto);
      expect(result).toEqual(updatedEmployee);
    });
  });

  describe('remove', () => {
    it('should delete an employee', async () => {
      service.remove.mockResolvedValue(mockEmployee as any);

      const result = await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'Employee deleted successfully' });
    });
  });
});
