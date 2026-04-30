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

@Entity('condo_access_logs')
export class AccessLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'property_unit_id' })
  propertyUnitId: number;

  @Column({ type: 'varchar', length: 150 })
  visitorName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  visitorDocument: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  vehiclePlate: string;

  @Column({ name: 'entry_time', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  entryTime: Date;

  @Column({ name: 'exit_time', type: 'timestamp', nullable: true })
  exitTime: Date;

  @Column({ name: 'authorized_by_id', nullable: true })
  authorizedById: number; // Links to ResidentProfile or User

  @Column({ type: 'text', nullable: true })
  observations: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => PropertyUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_unit_id' })
  propertyUnit: PropertyUnit;
}
