import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePayrollDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  employeeId: number;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-03-31' })
  @IsDateString()
  periodEnd: string;

  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  workedDays?: number = 30;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  extraHours?: number = 0;

  @ApiPropertyOptional({ example: 200000 })
  @IsOptional()
  @IsNumber()
  bonuses?: number = 0;

  @ApiPropertyOptional({ example: 85000 })
  @IsOptional()
  @IsNumber()
  deductions?: number = 0;

  @ApiPropertyOptional({
    example: 'https://bucket.s3.amazonaws.com/payslips/payroll-1.pdf',
  })
  @IsOptional()
  @IsString()
  payslipUrl?: string;

  @ApiPropertyOptional({ example: 'Nomina quincenal marzo' })
  @IsOptional()
  @IsString()
  notes?: string;
}
