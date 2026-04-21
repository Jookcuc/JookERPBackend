import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Condominium } from './condominium.entity';

export enum DocumentCategory {
  REGLAMENTO = 'REGLAMENTO',
  ACTA = 'ACTA',
  CONTRATO = 'CONTRATO',
  SOPORTE = 'SOPORTE',
  OTRO = 'OTRO',
}

@Entity('condo_documents')
export class CondoDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'condominium_id' })
  condominiumId: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({
    type: 'enum',
    enum: DocumentCategory,
    default: DocumentCategory.OTRO,
  })
  category: DocumentCategory;

  @Column({ type: 'text' })
  fileUrl: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  fileExtension: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Condominium)
  @JoinColumn({ name: 'condominium_id' })
  condominium: Condominium;
}
