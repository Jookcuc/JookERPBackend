import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { TicketType } from '../entities/maintenance-ticket.entity';

export class CreateMaintenanceTicketDto {
  @ApiProperty({
    example: 1,
    description: 'ID del condominio al que pertenece el ticket.',
  })
  @IsInt()
  condominiumId: number;

  @ApiPropertyOptional({
    example: 34,
    description: 'ID de la unidad privada relacionada con la novedad.',
  })
  @IsOptional()
  @IsInt()
  propertyUnitId?: number;

  @ApiProperty({
    example: 'Fuga de agua en el pasillo',
    description: 'Título corto del requerimiento o PQRS.',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Se evidencia filtración constante cerca del apartamento 502.',
    description: 'Descripción detallada del caso.',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    enum: TicketType,
    example: TicketType.MANTENIMIENTO,
    description: 'Clasificación del ticket.',
  })
  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;

  @ApiPropertyOptional({
    example: 7,
    description: 'ID del usuario o responsable asignado, si ya existe uno.',
  })
  @IsOptional()
  @IsInt()
  assignedToId?: number;
}
