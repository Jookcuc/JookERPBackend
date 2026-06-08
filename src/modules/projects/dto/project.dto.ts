import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProjectStatus } from '../entities/project.entity';

export class CreateProjectDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  companyId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  contactId?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  managerId?: number;

  @ApiProperty({ example: 'Implementación ERP' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Descripción del proyecto...', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Objetivos del proyecto...', required: false })
  @IsOptional()
  @IsString()
  objectives?: string;

  @ApiProperty({ enum: ProjectStatus, required: false })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiProperty({ example: 10000, required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  budget?: number;

  @ApiProperty({ example: '2026-06-01', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2026-12-31', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class FilterProjectDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  companyId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  managerId?: number;

  @ApiProperty({ enum: ProjectStatus, required: false })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
