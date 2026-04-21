import { IsNumber, IsString, IsOptional, IsBoolean, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateFeesDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  condominiumId: number;

  @ApiProperty({ example: '2026-05', description: 'Period in YYYY-MM format' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Period must be in YYYY-MM format' })
  period: string;

  @ApiProperty({ example: 1500000, description: 'Total amount to distribute or base amount' })
  @IsNumber()
  baseAmount: number;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  useCoefficient?: boolean;
}
