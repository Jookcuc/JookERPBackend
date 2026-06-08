import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { ProjectTask } from './project-task.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';


export enum ExpenseStatus {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  PAGADO = 'PAGADO',
}

@Entity('project_expenses')
export class ProjectExpense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'task_id', nullable: true })
  taskId: number;

  @ManyToOne(() => ProjectTask, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task: ProjectTask;

  @Column({ type: 'date' })
  expenseDate: Date;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
  })
  amount: number;

  @Column({ type: 'varchar', length: 255 })
  concept: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // NOTA: Se guarda como string porque los gastos suelen ser de proveedores externos (tickets, facturas físicas).
  // No está relacionado con la tabla de facturas internas del sistema (Invoices), aunque se podría relacionar a futuro si es necesario.
  @Column({ name: 'invoice_number', type: 'varchar', length: 100, nullable: true })
  invoiceNumber: string;

  @ManyToOne(() => Invoice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'invoice_id', nullable: true })
  invoiceId: number;


  @Column({
    type: 'varchar',
    length: 20,
    default: ExpenseStatus.PENDIENTE,
  })
  status: ExpenseStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
