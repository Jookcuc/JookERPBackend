import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PhaseStatus } from '../entities/project-phase.entity';

export class CreateProjectPhaseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  projectId: number;

  @ApiProperty({ example: 'Fase de Análisis' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Descripción de la fase...', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PhaseStatus, required: false })
  @IsOptional()
  @IsEnum(PhaseStatus)
  status?: PhaseStatus;

  @ApiProperty({ example: '2026-06-01', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2026-07-31', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateProjectPhaseDto extends PartialType(CreateProjectPhaseDto) {}
