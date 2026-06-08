import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProjectMemberDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  projectId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  employeeId: number;

  @ApiProperty({ example: 'Desarrollador', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  @ApiProperty({ example: 40, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  assignedHours?: number;

  @ApiProperty({ example: 50000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;
}

export class UpdateProjectMemberDto extends PartialType(CreateProjectMemberDto) {}
