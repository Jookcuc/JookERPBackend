import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Condominium } from './condominium.entity';
import { PropertyUnit } from './property-unit.entity';

export enum StructuralUnitType {
  TORRE = 'TORRE',
  BLOQUE = 'BLOQUE',
  MANZANA = 'MANZANA',
  ETAPA = 'ETAPA',
  OTRO = 'OTRO',
}

@Entity('condo_structural_units')
export class StructuralUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'condominium_id' })
  condominiumId: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: StructuralUnitType,
    default: StructuralUnitType.TORRE,
  })
  type: StructuralUnitType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Condominium, (condo) => condo.structuralUnits)
  @JoinColumn({ name: 'condominium_id' })
  condominium: Condominium;

  @OneToMany(() => PropertyUnit, (unit) => unit.structuralUnit)
  propertyUnits: PropertyUnit[];
}
