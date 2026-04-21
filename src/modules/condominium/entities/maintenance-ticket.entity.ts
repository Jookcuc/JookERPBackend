import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PropertyUnit } from './property-unit.entity';
import { Condominium } from './condominium.entity';

export enum TicketStatus {
  ABIERTO = 'ABIERTO',
  EN_PROCESO = 'EN_PROCESO',
  RESUELTO = 'RESUELTO',
  CERRADO = 'CERRADO',
}

export enum TicketType {
  MANTENIMIENTO = 'MANTENIMIENTO',
  QUEJA = 'QUEJA',
  SUGERENCIA = 'SUGERENCIA',
  SOLICITUD = 'SOLICITUD',
}

@Entity('condo_maintenance_tickets')
export class MaintenanceTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'condominium_id' })
  condominiumId: number;

  @Column({ name: 'property_unit_id', nullable: true })
  propertyUnitId: number;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TicketType,
    default: TicketType.MANTENIMIENTO,
  })
  type: TicketType;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.ABIERTO,
  })
  status: TicketStatus;

  @Column({ name: 'assigned_to_id', nullable: true })
  assignedToId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Condominium)
  @JoinColumn({ name: 'condominium_id' })
  condominium: Condominium;

  @ManyToOne(() => PropertyUnit)
  @JoinColumn({ name: 'property_unit_id' })
  propertyUnit: PropertyUnit;
}
