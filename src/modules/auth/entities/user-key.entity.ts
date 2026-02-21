import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from './user.entity';

@Entity('user_keys')
@Index('idx_user_keys_value', ['keyValue'], { unique: true })
@Index('idx_user_keys_user', ['userId'])
export class UserKey {
  @PrimaryGeneratedColumn({ name: 'id_key' })
  idKey: number;

  @Column({ name: 'key_value', type: 'varchar', length: 255, unique: true })
  keyValue: string;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @Column({ name: 'company_id', nullable: true })
companyId: number;

  @Column({ type: 'boolean', default: false })
  used: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  // Relaciones
  @ManyToOne(() => User, (user) => user.keys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Método helper para verificar si la llave está expirada
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  // Método helper para verificar si la llave es válida
  isValid(): boolean {
    return !this.used && !this.isExpired();
  }
}