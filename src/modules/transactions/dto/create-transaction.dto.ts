import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsDateString, MaxLength } from 'class-validator';

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

  @ApiProperty({ example: 100.50 })
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

  @ApiProperty({ example: 'Ajuste' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  movement: string;

  @ApiProperty({ example: '2025-10-07' })
  @IsNotEmpty()
  @IsDateString()
  date: string;
}
