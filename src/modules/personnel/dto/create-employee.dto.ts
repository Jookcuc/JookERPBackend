import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ContractType, EmployeeStatus } from '../entities/employee.entity';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Laura' })
  @IsString()
  @MaxLength(120)
  firstName: string;

  @ApiProperty({ example: 'Gomez' })
  @IsString()
  @MaxLength(120)
  lastName: string;

  @ApiProperty({ example: 'CC' })
  @IsString()
  @MaxLength(30)
  documentType: string;

  @ApiProperty({ example: '1032456789' })
  @IsString()
  @MaxLength(50)
  documentNumber: string;

  @ApiPropertyOptional({ example: 'laura@empresa.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Cra 10 #20-30' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({ example: 'Analista de nomina' })
  @IsString()
  @MaxLength(120)
  position: string;

  @ApiPropertyOptional({ example: 'Recursos Humanos' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  hireDate: string;

  @ApiProperty({ example: 2800000 })
  @IsNumber()
  @Min(0)
  baseSalary: number;

  @ApiProperty({ enum: ContractType, example: ContractType.INDEFINIDO })
  @IsEnum(ContractType)
  contractType: ContractType;

  @ApiPropertyOptional({
    example: 'https://bucket.s3.amazonaws.com/contracts/employee-1.pdf',
  })
  @IsOptional()
  @IsString()
  contractUrl?: string;

  @ApiPropertyOptional({ example: 'Maria Gomez' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string;

  @ApiPropertyOptional({ example: '3009990000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyContactPhone?: string;

  @ApiPropertyOptional({
    enum: EmployeeStatus,
    example: EmployeeStatus.ACTIVO,
  })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ example: 'Empleado remoto con horario flexible' })
  @IsOptional()
  @IsString()
  notes?: string;
}
