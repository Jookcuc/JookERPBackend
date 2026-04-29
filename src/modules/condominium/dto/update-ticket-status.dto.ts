import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TicketStatus } from '../entities/maintenance-ticket.entity';

export class UpdateTicketStatusDto {
  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.EN_PROCESO,
    description: 'Nuevo estado del ticket de mantenimiento o PQRS.',
  })
  @IsEnum(TicketStatus)
  status: TicketStatus;
}
