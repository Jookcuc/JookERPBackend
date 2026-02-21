import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Product } from './product.entity';

export enum MovementType {
  ENTRADA_COMPRA = 'ENTRADA_COMPRA',
  SALIDA_VENTA = 'SALIDA_VENTA',
  DEVOLUCION = 'DEVOLUCION',
  AJUSTE_MANUAL = 'AJUSTE_MANUAL',
}

@Entity('inventory_movement')
export class InventoryMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'movement_type', type: 'varchar', length: 50 })
  movementType: MovementType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  justification: string;

  @Column({ name: 'related_document', length: 255, nullable: true })
  relatedDocument: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Product, (product) => product.movements)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}