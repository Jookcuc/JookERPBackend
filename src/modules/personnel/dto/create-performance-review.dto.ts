import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePerformanceReviewDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  employeeId: number;

  @ApiProperty({ example: '2026-03-20' })
  @IsDateString()
  reviewDate: string;

  @ApiProperty({ example: 'Carlos Rojas' })
  @IsString()
  reviewerName: string;

  @ApiProperty({ example: 4.6 })
  @IsNumber()
  @Min(0)
  @Max(5)
  score: number;

  @ApiPropertyOptional({ example: 'Muy buena organizacion y liderazgo' })
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiPropertyOptional({ example: 'Profundizar en indicadores de costo' })
  @IsOptional()
  @IsString()
  improvements?: string;

  @ApiPropertyOptional({
    example: 'Liderar implementacion del modulo de nomina',
  })
  @IsOptional()
  @IsString()
  goals?: string;
}
