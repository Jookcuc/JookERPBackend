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
import { User } from '../../auth/entities/user.entity';

export enum ResidentRole {
  PROPIETARIO = 'PROPIETARIO',
  ARRENDATARIO = 'ARRENDATARIO',
  ADMINISTRADOR_DELEGADO = 'ADMINISTRADOR_DELEGADO',
  OTRO = 'OTRO',
}

@Entity('condo_resident_profiles')
export class ResidentProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @Column({ name: 'property_unit_id' })
  propertyUnitId: number;

  @Column({
    type: 'enum',
    enum: ResidentRole,
    default: ResidentRole.PROPIETARIO,
  })
  role: ResidentRole;

  @Column({ name: 'is_resident', type: 'boolean', default: true })
  isResident: boolean;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => PropertyUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_unit_id' })
  propertyUnit: PropertyUnit;
}
