import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Contact } from './contact.entity';
import { InvoiceItem } from './invoice-item.entity';
import { Bank } from '../../banks/entities/bank.entity';

export enum InvoiceType {
  COMPRA = 'COMPRA',
  VENTA = 'VENTA',
}

export enum InvoiceStatus {
  PENDIENTE = 'PENDIENTE',
  PAGADA = 'PAGADA',
  VENCIDA = 'VENCIDA',
  ANULADA = 'ANULADA',
}

@Entity('invoice')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'contact_id' })
  contactId: number;

  @Column({ name: 'invoice_type', type: 'varchar', length: 20 })
  invoiceType: InvoiceType;

  @Column({ name: 'invoice_number', length: 100 })
  invoiceNumber: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 30, default: InvoiceStatus.PENDIENTE })
  status: InvoiceStatus;

  @Column({ name: 'payment_conditions', type: 'text', nullable: true })
  paymentConditions: string;

  @Column({ name: 'voucher_url', type: 'text', nullable: true })
  voucherUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Contact, (contact) => contact.invoices)
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true, eager: true })
  items: InvoiceItem[];

  @ManyToOne(() => Bank, bank => bank.invoices, { nullable: true })
  @JoinColumn({ name: 'bank_id' })
  bank: Bank;

  @Column({ name: 'bank_id', nullable: true })
  bankId: number;
}