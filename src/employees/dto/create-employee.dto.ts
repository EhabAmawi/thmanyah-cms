export class CreateEmployeeDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  salary?: number;
}
