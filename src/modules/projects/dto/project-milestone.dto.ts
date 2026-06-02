import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProjectMilestoneDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  projectId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  phaseId?: number;

  @ApiProperty({ example: 'Firma de contrato' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '2026-06-15', required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

export class UpdateProjectMilestoneDto extends PartialType(
  CreateProjectMilestoneDto,
) {}
