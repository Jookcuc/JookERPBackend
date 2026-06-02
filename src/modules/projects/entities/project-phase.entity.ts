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
import { Project } from './project.entity';
import { ProjectTask } from './project-task.entity';
import { ProjectMilestone } from './project-milestone.entity';

export enum PhaseStatus {
  PENDIENTE = 'PENDIENTE',
  EN_PROGRESO = 'EN_PROGRESO',
  COMPLETADA = 'COMPLETADA',
}

@Entity('project_phases')
export class ProjectPhase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => Project, (project) => project.phases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

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
    default: PhaseStatus.PENDIENTE,
  })
  status: PhaseStatus;

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

  @OneToMany(() => ProjectTask, (task) => task.phase)
  tasks: ProjectTask[];

  @OneToMany(() => ProjectMilestone, (milestone) => milestone.phase)
  milestones: ProjectMilestone[];
}
