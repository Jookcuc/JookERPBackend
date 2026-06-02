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
import { ProjectPhase } from './project-phase.entity';

@Entity('project_milestones')
export class ProjectMilestone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => Project, (project) => project.milestones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({
    name: 'phase_id',
    nullable: true,
  })
  phaseId: number;

  @ManyToOne(() => ProjectPhase, (phase) => phase.milestones, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'phase_id' })
  phase: ProjectPhase;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;

  @Column({ type: 'date', nullable: true })
  date: Date;

  @Column({
    name: 'is_completed',
    type: 'boolean',
    default: false,
  })
  isCompleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
