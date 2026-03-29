import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AttendanceType } from '../entities/attendance-record.entity';

export class CreateAttendanceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  employeeId: number;

  @ApiProperty({ example: '2026-03-25' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  checkIn?: string;

  @ApiPropertyOptional({ example: '17:30' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  checkOut?: string;

  @ApiPropertyOptional({ example: 8.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursWorked?: number = 0;

  @ApiPropertyOptional({
    enum: AttendanceType,
    example: AttendanceType.PRESENTE,
  })
  @IsOptional()
  @IsEnum(AttendanceType)
  type?: AttendanceType = AttendanceType.PRESENTE;

  @ApiPropertyOptional({ example: 'Ingreso puntual' })
  @IsOptional()
  @IsString()
  notes?: string;
}
