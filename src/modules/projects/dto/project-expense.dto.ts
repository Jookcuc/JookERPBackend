import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ExpenseStatus } from '../entities/project-expense.entity';

export class CreateProjectExpenseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  projectId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  taskId?: number;

  @ApiProperty({ example: '2026-06-08' })
  @IsDateString()
  expenseDate: string;

  @ApiProperty({ example: 1500.0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'Compra de material eléctrico' })
  @IsString()
  @MaxLength(255)
  concept: string;

  @ApiProperty({ example: 'Cableado para segundo piso', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'FAC-001-2026', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNumber?: string;

  @ApiProperty({ example: 1, required: false, description: 'ID de factura interna del sistema' })
  @IsOptional()
  @IsNumber()
  invoiceId?: number;

  @ApiProperty({ enum: ExpenseStatus, default: ExpenseStatus.PENDIENTE, required: false })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;
}

export class UpdateProjectExpenseDto extends PartialType(CreateProjectExpenseDto) {}
