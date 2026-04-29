import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunicationType } from '../entities/communication.entity';
import { FeeStatus, FeeType } from '../entities/condo-fee.entity';
import {
  TicketStatus,
  TicketType,
} from '../entities/maintenance-ticket.entity';
import {
  PropertyUnitStatus,
  PropertyUnitType,
} from '../entities/property-unit.entity';
import { StructuralUnitType } from '../entities/structural-unit.entity';

export class CondominiumConfigResponseDto {
  @ApiProperty({ example: 'COP' })
  currency: string;

  @ApiPropertyOptional({ example: 'America/Bogota' })
  timezone?: string;
}

export class PropertyUnitSummaryResponseDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: '502A' })
  number: string;

  @ApiProperty({
    enum: PropertyUnitType,
    example: PropertyUnitType.APARTAMENTO,
  })
  type: PropertyUnitType;

  @ApiProperty({ example: 92.5 })
  area: number;

  @ApiProperty({ example: 2.354 })
  coefficientPercentage: number;

  @ApiProperty({
    enum: PropertyUnitStatus,
    example: PropertyUnitStatus.HABITADO,
  })
  status: PropertyUnitStatus;

  @ApiPropertyOptional({ example: 88 })
  ownerId?: number;

  @ApiPropertyOptional({ example: 44 })
  residentId?: number;

  @ApiProperty({ example: '2026-04-29T13:10:12.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-29T13:10:12.000Z' })
  updatedAt: Date;
}

export class StructuralUnitSummaryResponseDto {
  @ApiProperty({ example: 14 })
  id: number;

  @ApiProperty({ example: 1 })
  condominiumId: number;

  @ApiProperty({ example: 'Torre A' })
  name: string;

  @ApiProperty({ enum: StructuralUnitType, example: StructuralUnitType.TORRE })
  type: StructuralUnitType;

  @ApiProperty({ example: '2026-04-29T13:10:12.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-29T13:10:12.000Z' })
  updatedAt: Date;
}

export class StructuralUnitDetailResponseDto extends StructuralUnitSummaryResponseDto {
  @ApiProperty({
    type: () => [PropertyUnitSummaryResponseDto],
    description: 'Unidades privadas registradas bajo la unidad estructural.',
  })
  propertyUnits: PropertyUnitSummaryResponseDto[];
}

export class CondominiumSummaryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    example: 9,
    description:
      'Empresa propietaria del condominio. Se deriva del token autenticado.',
  })
  companyId: number;

  @ApiProperty({ example: 'Edificio Parque Central' })
  name: string;

  @ApiPropertyOptional({ example: 'Calle 10 # 45-20' })
  address?: string;

  @ApiPropertyOptional({ example: '900.123.456-1' })
  nit?: string;

  @ApiPropertyOptional({ example: '6012345678' })
  phone?: string;

  @ApiPropertyOptional({ example: 'admin@parquecentral.com' })
  email?: string;

  @ApiPropertyOptional({ type: () => CondominiumConfigResponseDto })
  config?: CondominiumConfigResponseDto;

  @ApiProperty({ example: '2026-04-29T13:10:12.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-29T13:10:12.000Z' })
  updatedAt: Date;

  @ApiProperty({
    type: () => [StructuralUnitSummaryResponseDto],
    description: 'Torres, bloques o etapas asociadas al condominio.',
  })
  structuralUnits: StructuralUnitSummaryResponseDto[];
}

export class CondominiumDetailResponseDto extends CondominiumSummaryResponseDto {
  @ApiProperty({
    type: () => [StructuralUnitDetailResponseDto],
    description:
      'Detalle del condominio incluyendo unidades privadas por torre o bloque.',
  })
  declare structuralUnits: StructuralUnitDetailResponseDto[];
}

export class CondoFeeResponseDto {
  @ApiProperty({ example: 501 })
  id: number;

  @ApiProperty({ example: 101 })
  propertyUnitId: number;

  @ApiProperty({ example: 1250000.5 })
  amount: number;

  @ApiProperty({ example: '2026-05-05' })
  dueDate: Date;

  @ApiProperty({ enum: FeeType, example: FeeType.ORDINARIA })
  type: FeeType;

  @ApiProperty({ enum: FeeStatus, example: FeeStatus.PENDIENTE })
  status: FeeStatus;

  @ApiProperty({
    example: '2026-05',
    description: 'Periodo facturado en formato YYYY-MM.',
  })
  period: string;

  @ApiPropertyOptional({ example: 'Cuota ordinaria periodo 2026-05' })
  description?: string;

  @ApiProperty({ example: '2026-04-29T13:10:12.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-29T13:10:12.000Z' })
  updatedAt: Date;
}

export class EmptyStructuralUnitsResponseDto {
  @ApiProperty({
    example: 'No structural units found',
    description:
      'Respuesta cuando el condominio aún no tiene torres, bloques o etapas creadas.',
  })
  message: string;
}

export class AccessLogResponseDto {
  @ApiProperty({ example: 3001 })
  id: number;

  @ApiProperty({ example: 120 })
  propertyUnitId: number;

  @ApiProperty({ example: 'Carlos Mendoza' })
  visitorName: string;

  @ApiPropertyOptional({ example: 'CC-1029384756' })
  visitorDocument?: string;

  @ApiPropertyOptional({ example: 'ABC123' })
  vehiclePlate?: string;

  @ApiProperty({ example: '2026-04-29T14:00:00.000Z' })
  entryTime: Date;

  @ApiPropertyOptional({ example: '2026-04-29T16:05:00.000Z' })
  exitTime?: Date;

  @ApiPropertyOptional({ example: 44 })
  authorizedById?: number;

  @ApiPropertyOptional({
    example: 'Ingreso autorizado por portería principal.',
  })
  observations?: string;

  @ApiProperty({ example: '2026-04-29T14:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-29T14:00:00.000Z' })
  updatedAt: Date;
}

export class MaintenanceTicketResponseDto {
  @ApiProperty({ example: 820 })
  id: number;

  @ApiProperty({ example: 1 })
  condominiumId: number;

  @ApiPropertyOptional({ example: 34 })
  propertyUnitId?: number;

  @ApiProperty({ example: 'Fuga de agua en el pasillo' })
  title: string;

  @ApiProperty({
    example: 'Se evidencia filtración constante cerca del apartamento 502.',
  })
  description: string;

  @ApiProperty({ enum: TicketType, example: TicketType.MANTENIMIENTO })
  type: TicketType;

  @ApiProperty({ enum: TicketStatus, example: TicketStatus.ABIERTO })
  status: TicketStatus;

  @ApiPropertyOptional({ example: 7 })
  assignedToId?: number;

  @ApiProperty({ example: '2026-04-29T13:10:12.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-29T13:10:12.000Z' })
  updatedAt: Date;
}

export class UpdateResultResponseDto {
  @ApiProperty({
    example: [],
    description: 'Mapas generados por TypeORM para la operación.',
  })
  generatedMaps: any[];

  @ApiProperty({
    example: [],
    description: 'Respuesta cruda del driver de base de datos.',
  })
  raw: any;

  @ApiProperty({
    example: 1,
    description: 'Cantidad de registros afectados por la actualización.',
  })
  affected: number;
}

export class CommunicationResponseDto {
  @ApiProperty({ example: 61 })
  id: number;

  @ApiProperty({ example: 1 })
  condominiumId: number;

  @ApiProperty({ example: 'Mantenimiento de ascensores' })
  title: string;

  @ApiProperty({
    example:
      'El servicio de ascensores estará suspendido el sábado de 8:00 a.m. a 12:00 p.m.',
  })
  content: string;

  @ApiProperty({ enum: CommunicationType, example: CommunicationType.AVISO })
  type: CommunicationType;

  @ApiProperty({ example: true })
  isPublished: boolean;

  @ApiPropertyOptional({ example: '2026-04-29T09:00:00.000Z' })
  publishedAt?: Date;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avisos/ascensores.pdf',
  })
  fileUrl?: string;

  @ApiProperty({ example: '2026-04-29T08:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-29T09:00:00.000Z' })
  updatedAt: Date;
}

export class PortfolioUnitResponseDto {
  @ApiProperty({ example: '502A' })
  unitNumber: string;

  @ApiProperty({
    enum: PropertyUnitType,
    example: PropertyUnitType.APARTAMENTO,
  })
  type: PropertyUnitType;

  @ApiProperty({
    enum: PropertyUnitStatus,
    example: PropertyUnitStatus.HABITADO,
  })
  status: PropertyUnitStatus;

  @ApiProperty({ example: 3250000 })
  totalDue: number;

  @ApiProperty({ example: 3 })
  pendingFeesCount: number;

  @ApiProperty({
    type: () => [CondoFeeResponseDto],
    description: 'Últimas cuotas registradas para la unidad.',
  })
  lastFees: CondoFeeResponseDto[];
}

export class PortfolioTowerResponseDto {
  @ApiProperty({ example: 'Torre A' })
  towerName: string;

  @ApiProperty({ enum: StructuralUnitType, example: StructuralUnitType.TORRE })
  towerType: StructuralUnitType;

  @ApiProperty({
    type: () => [PortfolioUnitResponseDto],
    description: 'Cartera consolidada por unidad privada.',
  })
  units: PortfolioUnitResponseDto[];
}
