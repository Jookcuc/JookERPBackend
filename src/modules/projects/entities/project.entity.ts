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
}
