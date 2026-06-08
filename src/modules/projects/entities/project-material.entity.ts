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
import { Product } from '../../Inventory/entities/product.entity';

// Entidad de PLANIFICACIÓN (RF3): Define qué materiales necesita el proyecto y en qué cantidad estimada.
// Para registrar el consumo REAL de materiales durante la ejecución (RF4), se usa MaterialConsumption.
@Entity('project_materials')
export class ProjectMaterial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'task_id', nullable: true })
  taskId: number;

  @ManyToOne(() => ProjectTask, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: ProjectTask;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({
    name: 'estimated_quantity',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  estimatedQuantity: number;

  @Column({
    name: 'estimated_unit_cost',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  estimatedUnitCost: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
