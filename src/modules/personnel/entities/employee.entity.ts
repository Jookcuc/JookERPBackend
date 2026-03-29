import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AttendanceRecord } from './attendance-record.entity';
import { LeaveRequest } from './leave-request.entity';
import { Payroll } from './payroll.entity';
import { PerformanceReview } from './performance-review.entity';
import { Settlement } from './settlement.entity';

export enum EmployeeStatus {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  RETIRADO = 'RETIRADO',
}

export enum ContractType {
  INDEFINIDO = 'INDEFINIDO',
  FIJO = 'FIJO',
  OBRA_LABOR = 'OBRA_LABOR',
  APRENDIZAJE = 'APRENDIZAJE',
  PRESTACION_SERVICIOS = 'PRESTACION_SERVICIOS',
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'first_name', type: 'varchar', length: 120 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 120 })
  lastName: string;

  @Column({ name: 'document_type', type: 'varchar', length: 30 })
  documentType: string;

  @Column({ name: 'document_number', type: 'varchar', length: 50 })
  documentNumber: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 120 })
  position: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  department?: string;

  @Column({ name: 'hire_date', type: 'date' })
  hireDate: Date;

  @Column({
    name: 'base_salary',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  baseSalary: number;

  @Column({ name: 'contract_type', type: 'varchar', length: 40 })
  contractType: ContractType;

  @Column({ name: 'contract_url', type: 'text', nullable: true })
  contractUrl?: string;

  @Column({
    name: 'emergency_contact_name',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  emergencyContactName?: string;

  @Column({
    name: 'emergency_contact_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  emergencyContactPhone?: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: EmployeeStatus.ACTIVO,
  })
  status: EmployeeStatus;

  @Column({ name: 'termination_date', type: 'date', nullable: true })
  terminationDate?: Date | null;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Payroll, (payroll) => payroll.employee)
  payrolls: Payroll[];

  @OneToMany(() => AttendanceRecord, (attendance) => attendance.employee)
  attendances: AttendanceRecord[];

  @OneToMany(() => LeaveRequest, (leave) => leave.employee)
  leaveRequests: LeaveRequest[];

  @OneToMany(() => PerformanceReview, (review) => review.employee)
  reviews: PerformanceReview[];

  @OneToMany(() => Settlement, (settlement) => settlement.employee)
  settlements: Settlement[];
}
