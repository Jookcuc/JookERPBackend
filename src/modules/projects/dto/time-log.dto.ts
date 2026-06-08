import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTimeLogDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  projectId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  taskId?: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  employeeId: number;

  @ApiProperty({ example: '2026-06-08' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 8, description: 'Horas trabajadas' })
  @IsNumber()
  @Min(0)
  hoursSpent: number;

  @ApiProperty({ example: 'Revisión de planos eléctricos', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTimeLogDto extends PartialType(CreateTimeLogDto) {}
