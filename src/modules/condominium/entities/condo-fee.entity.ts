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

export enum FeeType {
  ORDINARIA = 'ORDINARIA',
  EXTRAORDINARIA = 'EXTRAORDINARIA',
  PARQUEADERO = 'PARQUEADERO',
  MULTA = 'MULTA',
  OTRO = 'OTRO',
}

export enum FeeStatus {
  PENDIENTE = 'PENDIENTE',
  PAGADA = 'PAGADA',
  VENCIDA = 'VENCIDA',
  ANULADA = 'ANULADA',
  PARCIAL = 'PARCIAL',
}

@Entity('condo_fees')
export class CondoFee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'property_unit_id' })
  propertyUnitId: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: FeeType,
    default: FeeType.ORDINARIA,
  })
  type: FeeType;

  @Column({
    type: 'enum',
    enum: FeeStatus,
    default: FeeStatus.PENDIENTE,
  })
  status: FeeStatus;

  @Column({ type: 'varchar', length: 7 }) // Format: YYYY-MM
  period: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => PropertyUnit)
  @JoinColumn({ name: 'property_unit_id' })
  propertyUnit: PropertyUnit;
}
