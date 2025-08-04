import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Employee first name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Employee last name', example: 'Doe' })
  lastName: string;

  @ApiProperty({ description: 'Employee email address', example: 'john.doe@example.com' })
  email: string;

  @ApiPropertyOptional({ description: 'Employee phone number', example: '+1234567890' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Employee department', example: 'IT' })
  department?: string;

  @ApiPropertyOptional({ description: 'Employee position', example: 'Developer' })
  position?: string;

  @ApiPropertyOptional({ description: 'Employee salary', example: 50000 })
  salary?: number;
}
