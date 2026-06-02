import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectPhase } from './project-phase.entity';

export enum TaskPriority {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

@Entity('project_tasks')
export class ProjectTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'phase_id' })
  phaseId: number;

  @ManyToOne(() => ProjectPhase, (phase) => phase.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'phase_id' })
  phase: ProjectPhase;

  @Column({
    type: 'varchar',
    length: 255,
  })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    name: 'estimated_hours',
    type: 'numeric',
    precision: 8,
    scale: 2,
    default: 0,
  })
  estimatedHours: number;

  @Column({
    name: 'progress_percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  progressPercentage: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: TaskPriority.MEDIA,
  })
  priority: TaskPriority;

  @ManyToMany(() => ProjectTask)
  @JoinTable({
    name: 'project_task_dependencies',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'depends_on_task_id',
      referencedColumnName: 'id',
    },
  })
  dependsOn: ProjectTask[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
