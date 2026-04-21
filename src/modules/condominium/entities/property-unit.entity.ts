import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StructuralUnit } from './structural-unit.entity';

export enum PropertyUnitType {
  APARTAMENTO = 'APARTAMENTO',
  CASA = 'CASA',
  LOCAL = 'LOCAL',
  OFICINA = 'OFICINA',
  PARQUEADERO = 'PARQUEADERO',
  DEPOSITO = 'DEPOSITO',
}

export enum PropertyUnitStatus {
  HABITADO = 'HABITADO',
  VACIO = 'VACIO',
  EN_OBRA = 'EN_OBRA',
  RESERVADO = 'RESERVADO',
}

@Entity('condo_property_units')
export class PropertyUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'structural_unit_id' })
  structuralUnitId: number;

  @Column({ type: 'varchar', length: 50 })
  number: string;

  @Column({
    type: 'enum',
    enum: PropertyUnitType,
    default: PropertyUnitType.APARTAMENTO,
  })
  type: PropertyUnitType;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  area: number;

  @Column({
    name: 'coefficient_percentage',
    type: 'numeric',
    precision: 7,
    scale: 4,
    default: 0,
  })
  coefficientPercentage: number;

  @Column({
    type: 'enum',
    enum: PropertyUnitStatus,
    default: PropertyUnitStatus.VACIO,
  })
  status: PropertyUnitStatus;

  @Column({ name: 'owner_id', nullable: true })
  ownerId: number;

  @Column({ name: 'resident_id', nullable: true })
  residentId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => StructuralUnit, (unit) => unit.propertyUnits)
  @JoinColumn({ name: 'structural_unit_id' })
  structuralUnit: StructuralUnit;
}
