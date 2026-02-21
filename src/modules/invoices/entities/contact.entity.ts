import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Invoice } from './invoice.entity';

export enum ContactType {
  PROVEEDOR = 'PROVEEDOR',
  CLIENTE = 'CLIENTE',
}

@Entity('contact')
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 20 })
  type: ContactType;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Invoice, (invoice) => invoice.contact)
  invoices: Invoice[];
}