import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MovementType } from '../entities/transaction.entity';

export class CreateTransactionDto {
  @ApiProperty({ example: 'AJ-001' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  reference: string;

  @ApiProperty({ example: 'Ajuste' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  category: string;

  @ApiProperty({ example: 100.5 })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Efectivo', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  method?: string;

  @ApiProperty({ example: 'Ajuste de caja', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: MovementType.AJUSTE, enum: MovementType })
  @IsNotEmpty()
  @IsEnum(MovementType)
  @MaxLength(50)
  movement: MovementType;

  @ApiProperty({ example: '2025-10-07' })
  @IsNotEmpty()
  @IsDateString()
  date: string;
}
