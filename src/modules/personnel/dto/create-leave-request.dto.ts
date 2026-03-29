import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { LeaveType } from '../entities/leave-request.entity';

export class CreateLeaveRequestDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  employeeId: number;

  @ApiProperty({ enum: LeaveType, example: LeaveType.VACACIONES })
  @IsEnum(LeaveType)
  type: LeaveType;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-04-05' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 'Vacaciones de Semana Santa' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number;
}
