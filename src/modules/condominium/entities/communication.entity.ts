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

export enum CommunicationType {
  CIRCULAR = 'CIRCULAR',
  AVISO = 'AVISO',
  EVENTO = 'EVENTO',
  EMERGENCIA = 'EMERGENCIA',
}

@Entity('condo_communications')
export class Communication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'condominium_id' })
  condominiumId: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: CommunicationType,
    default: CommunicationType.CIRCULAR,
  })
  type: CommunicationType;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Condominium)
  @JoinColumn({ name: 'condominium_id' })
  condominium: Condominium;
}
