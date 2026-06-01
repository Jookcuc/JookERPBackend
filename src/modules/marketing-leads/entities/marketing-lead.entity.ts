import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('marketing_leads')
@Index('idx_marketing_leads_company_status', ['companyId', 'status'])
@Index('idx_marketing_leads_company_city', ['companyId', 'city'])
export class MarketingLead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'business_name', type: 'varchar', length: 180 })
  businessName: string;

  @Column({ name: 'contact_name', type: 'varchar', length: 180, nullable: true })
  contactName?: string;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ name: 'phone', type: 'varchar', length: 40, nullable: true })
  phone?: string;

  @Column({ name: 'city', type: 'varchar', length: 120, default: 'Cucuta' })
  city: string;

  @Column({ name: 'category', type: 'varchar', length: 120, nullable: true })
  category?: string;

  @Column({ name: 'website', type: 'varchar', length: 255, nullable: true })
  website?: string;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address?: string;

  @Column({ name: 'source', type: 'varchar', length: 120, nullable: true })
  source?: string;

  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true })
  sourceUrl?: string;

  @Column({ name: 'status', type: 'varchar', length: 40, default: 'new' })
  status: string;

  @Column({ name: 'consent_status', type: 'varchar', length: 40, default: 'unknown' })
  consentStatus: string;

  @Column({ name: 'last_contacted_at', type: 'timestamp', nullable: true })
  lastContactedAt?: Date;

  @Column({ name: 'contact_attempts', type: 'int', default: 0 })
  contactAttempts: number;

  @Column({ name: 'opt_out_token', type: 'varchar', length: 80, nullable: true })
  optOutToken?: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
