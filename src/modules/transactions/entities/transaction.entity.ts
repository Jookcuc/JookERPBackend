import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Bank } from '../../banks/entities/bank.entity';

export enum MovementType {
  ENTRADA = 'Entrada',
  SALIDA = 'Salida',
  AJUSTE = 'Ajuste',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'reference', length: 100 })
  reference: string;

  @Column({ name: 'category', length: 100 })
  category: string;

  @Column({ name: 'status', length: 50, default: 'Completada' })
  status: string;

  @Column({ name: 'amount', type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'method', length: 100 })
  method: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'movement', type: 'varchar', length: 50 })
  movement: MovementType;

  @Column({ name: 'date', type: 'date' })
  date: Date;

  @Column({ name: 'employee_id', nullable: true })
  employeeId?: number;

  @Column({ name: 'payroll_id', nullable: true })
  payrollId?: number;

  @Column({ name: 'settlement_id', nullable: true })
  settlementId?: number;

  @ManyToOne(() => Invoice, { nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'invoice_id', nullable: true })
  invoiceId: number;

  @ManyToOne(() => Bank, { nullable: true })
  @JoinColumn({ name: 'bank_id' })
  bank: Bank;

  @Column({ name: 'bank_id', nullable: true })
  bankId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
