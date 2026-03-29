import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

export enum AttendanceType {
  PRESENTE = 'PRESENTE',
  AUSENTE = 'AUSENTE',
  TARDANZA = 'TARDANZA',
  VACACIONES = 'VACACIONES',
  PERMISO = 'PERMISO',
  TELETRABAJO = 'TELETRABAJO',
}

@Entity('attendance_records')
export class AttendanceRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @ManyToOne(() => Employee, (employee) => employee.attendances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'check_in', type: 'varchar', length: 10, nullable: true })
  checkIn?: string;

  @Column({ name: 'check_out', type: 'varchar', length: 10, nullable: true })
  checkOut?: string;

  @Column({
    name: 'hours_worked',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  hoursWorked: number;

  @Column({ type: 'varchar', length: 30, default: AttendanceType.PRESENTE })
  type: AttendanceType;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
