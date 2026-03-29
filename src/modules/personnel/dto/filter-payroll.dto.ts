import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PayrollStatus } from '../entities/payroll.entity';

export class FilterPayrollDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employeeId?: number;

  @ApiPropertyOptional({ enum: PayrollStatus })
  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
