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
import { UserKey } from './user-key.entity';
import { Role } from './role.entity';
import { EmailVerificationCode } from './email-verification.entity';

@Entity('users')
@Index('idx_users_email', ['email'], { unique: true })
@Index('idx_users_role', ['idRole'])
export class User {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'id_role', nullable: true })
  idRole: number;

  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index('idx_users_email_lower', { synchronize: false })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @Exclude()
  password: string;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Role, { nullable: true })
  @JoinColumn({ name: 'id_role', referencedColumnName: 'idRole' })
  role: Role;

  @OneToMany(() => UserKey, (key) => key.user)
  keys: UserKey[];

  @OneToMany(() => EmailVerificationCode, (code) => code.user)
  verificationCodes: EmailVerificationCode[];

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}