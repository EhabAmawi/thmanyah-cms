import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiBody({ type: CreateEmployeeDto })
  @ApiResponse({ status: 201, description: 'Employee created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all employees with optional filtering' })
  @ApiQuery({ name: 'active', required: false, description: 'Filter by active status (true/false)' })
  @ApiQuery({ name: 'department', required: false, description: 'Filter by department name' })
  @ApiResponse({ status: 200, description: 'List of employees retrieved successfully' })
  async findAll(
    @Query('active') active?: string,
    @Query('department') department?: string,
  ) {
    if (active === 'true') {
      return this.employeesService.findActive();
    } else if (department) {
      return this.employeesService.findByDepartment(department);
    }
    return this.employeesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const employee = await this.employeesService.findOne(id);
    if (!employee) {
      throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
    }
    return employee;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee deleted successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.employeesService.remove(id);
    return { message: 'Employee deleted successfully' };
  }
}
