import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSettlementDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  employeeId: number;

  @ApiProperty({ example: '2026-03-31' })
  @IsDateString()
  terminationDate: string;

  @ApiProperty({ example: 'Terminacion sin justa causa' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: 2500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  severanceAmount?: number = 0;

  @ApiPropertyOptional({ example: 300000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pendingVacationAmount?: number = 0;

  @ApiPropertyOptional({ example: 180000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusesAmount?: number = 0;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deductionsAmount?: number = 0;

  @ApiPropertyOptional({ example: 'Liquidacion final marzo 2026' })
  @IsOptional()
  @IsString()
  notes?: string;
}
