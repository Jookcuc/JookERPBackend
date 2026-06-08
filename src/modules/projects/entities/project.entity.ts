import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { Employee } from '../../personnel/entities/employee.entity';
import { Contact } from '../../invoices/entities/contact.entity';
import { ProjectPhase } from './project-phase.entity';
import { ProjectMilestone } from './project-milestone.entity';
import { ProjectMember } from './project-member.entity';
import { ProjectExpense } from './project-expense.entity';
import { ProjectUpdate } from './project-update.entity';
import { TimeLog } from './time-log.entity';
import { MaterialConsumption } from './material-consumption.entity';
import { ProjectMaterial } from './project-material.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { InventoryMovement } from '../../Inventory/entities/inventory-movement.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';


export enum ProjectStatus {
  PLANIFICACION = 'PLANIFICACION',
  EJECUCION = 'EJECUCION',
  PAUSADO = 'PAUSADO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({
    name: 'contact_id',
    nullable: true,
  })
  contactId: number;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @Column({
    name: 'manager_id',
    nullable: true,
  })
  managerId: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'manager_id' })
  manager: Employee;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  objectives: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: ProjectStatus.PLANIFICACION,
  })
  status: ProjectStatus;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
  })
  budget: number;

  @Column({
    name: 'start_date',
    type: 'date',
    nullable: true,
  })
  startDate: Date;

  @Column({
    name: 'end_date',
    type: 'date',
    nullable: true,
  })
  endDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ProjectPhase, (phase) => phase.project)
  phases: ProjectPhase[];

  @OneToMany(() => ProjectMilestone, (milestone) => milestone.project)
  milestones: ProjectMilestone[];

  @OneToMany(() => ProjectMember, (member) => member.project)
  members: ProjectMember[];

  @OneToMany(() => ProjectExpense, (expense) => expense.project)
  expenses: ProjectExpense[];

  @OneToMany(() => ProjectUpdate, (update) => update.project)
  updates: ProjectUpdate[];

  @OneToMany(() => TimeLog, (timeLog) => timeLog.project)
  timeLogs: TimeLog[];

  @OneToMany(() => ProjectMaterial, (material) => material.project)
  plannedMaterials: ProjectMaterial[];

  @OneToMany(() => MaterialConsumption, (consumption) => consumption.project)
  materialConsumptions: MaterialConsumption[];

  @OneToMany(() => Invoice, (invoice) => invoice.project)
  invoices: Invoice[];

  @OneToMany(() => InventoryMovement, (movement) => movement.project)
  inventoryMovements: InventoryMovement[];

  @OneToMany(() => Transaction, (transaction) => transaction.project)
  transactions: Transaction[];
}

