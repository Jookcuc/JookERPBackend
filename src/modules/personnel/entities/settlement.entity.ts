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

export enum SettlementStatus {
  BORRADOR = 'BORRADOR',
  PAGADA = 'PAGADA',
}

@Entity('settlements')
export class Settlement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @ManyToOne(() => Employee, (employee) => employee.settlements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'termination_date', type: 'date' })
  terminationDate: Date;

  @Column({ type: 'varchar', length: 120 })
  reason: string;

  @Column({
    name: 'severance_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  severanceAmount: number;

  @Column({
    name: 'pending_vacation_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  pendingVacationAmount: number;

  @Column({
    name: 'bonuses_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  bonusesAmount: number;

  @Column({
    name: 'deductions_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  deductionsAmount: number;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @Column({ type: 'varchar', length: 30, default: SettlementStatus.BORRADOR })
  status: SettlementStatus;

  @Column({ name: 'payment_date', type: 'date', nullable: true })
  paymentDate?: Date | null;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
