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
import { Employee } from '../../personnel/entities/employee.entity';

export enum UpdateType {
  AVANCE = 'AVANCE',
  PROBLEMA = 'PROBLEMA',
  NOTA = 'NOTA',
}

@Entity('project_updates')
export class ProjectUpdate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'author_id' })
  authorId: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'author_id' })
  author: Employee;

  @Column({
    type: 'varchar',
    length: 20,
    default: UpdateType.AVANCE,
  })
  type: UpdateType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'date' })
  date: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
