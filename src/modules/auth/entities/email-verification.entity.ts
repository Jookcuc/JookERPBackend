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

@Entity('email_verification_codes')
@Index('idx_verification_code', ['code', 'userId'])
@Index('idx_verification_expires', ['expiresAt'])
@Index('idx_verification_user_active', ['userId', 'used', 'expiresAt'])
export class EmailVerificationCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 6 })
  code: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  used: boolean;

  // Relaciones
  @ManyToOne(() => User, (user) => user.verificationCodes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Método helper para verificar si el código está expirado
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Método helper para verificar si el código es válido
  isValid(): boolean {
    return !this.used && !this.isExpired();
  }

  // Método helper para obtener segundos restantes
  getSecondsRemaining(): number {
    if (this.isExpired()) return 0;
    const now = new Date().getTime();
    const expires = this.expiresAt.getTime();
    return Math.floor((expires - now) / 1000);
  }
}