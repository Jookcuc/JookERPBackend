import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { LeaveStatus } from '../entities/leave-request.entity';

export class UpdateLeaveStatusDto {
  @ApiProperty({ enum: LeaveStatus, example: LeaveStatus.APROBADO })
  @IsEnum(LeaveStatus)
  status: LeaveStatus;
}
