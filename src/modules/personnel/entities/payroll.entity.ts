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

export enum PayrollStatus {
  BORRADOR = 'BORRADOR',
  PAGADA = 'PAGADA',
  ANULADA = 'ANULADA',
}

@Entity('payrolls')
export class Payroll {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @ManyToOne(() => Employee, (employee) => employee.payrolls, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: Date;

  @Column({
    name: 'base_salary',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  baseSalary: number;

  @Column({ name: 'worked_days', type: 'int', default: 30 })
  workedDays: number;

  @Column({
    name: 'extra_hours',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  extraHours: number;

  @Column({
    name: 'bonuses',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  bonuses: number;

  @Column({
    name: 'deductions',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  deductions: number;

  @Column({
    name: 'gross_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  grossAmount: number;

  @Column({
    name: 'net_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  netAmount: number;

  @Column({ name: 'payslip_url', type: 'text', nullable: true })
  payslipUrl?: string;

  @Column({ type: 'varchar', length: 30, default: PayrollStatus.BORRADOR })
  status: PayrollStatus;

  @Column({ name: 'payment_date', type: 'date', nullable: true })
  paymentDate?: Date | null;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
