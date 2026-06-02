import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskPriority } from '../entities/project-task.entity';

export class CreateProjectTaskDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  phaseId: number;

  @ApiProperty({ example: 'Levantamiento de requerimientos' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Descripción de la tarea...', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 40, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage?: number;

  @ApiProperty({ enum: TaskPriority, required: false })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ type: [Number], example: [1, 2], required: false })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  dependsOnIds?: number[];
}

export class UpdateProjectTaskDto extends PartialType(CreateProjectTaskDto) {}
