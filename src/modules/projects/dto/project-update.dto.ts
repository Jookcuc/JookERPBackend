import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { UpdateType } from '../entities/project-update.entity';

export class CreateProjectUpdateDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  projectId: number;

  @ApiProperty({ example: 1, description: 'Empleado que registra la novedad' })
  @IsNumber()
  authorId: number;

  @ApiProperty({ enum: UpdateType, default: UpdateType.AVANCE, required: false })
  @IsOptional()
  @IsEnum(UpdateType)
  type?: UpdateType;

  @ApiProperty({ example: 'Se completó la cimentación del ala norte sin contratiempos.' })
  @IsString()
  description: string;

  @ApiProperty({ example: '2026-06-08' })
  @IsDateString()
  date: string;
}

export class UpdateProjectUpdateDto extends PartialType(CreateProjectUpdateDto) {}
