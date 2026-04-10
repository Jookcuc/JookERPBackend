import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Discount } from './discount.entity';
import { InventoryMovement } from './inventory-movement.entity';
import { ProductType } from './product-type.entity';

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'type_id' })
  typeId: number;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  cost: number;

  @Column({
    name: 'sale_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  salePrice: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'min_stock', type: 'int', default: 1 })
  minStock: number;

  @Column({ length: 50, default: 'No aplica' })
  discount: string;

  @Column({ name: 'discount_id', nullable: true })
  discountId?: number | null;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string;

  @Column({ name: 'entry_date', type: 'date', default: () => 'CURRENT_DATE' })
  entryDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ProductType, (type) => type.products)
  @JoinColumn({ name: 'type_id' })
  type: ProductType;

  @ManyToOne(() => Discount, (discount) => discount.products, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'discount_id' })
  discountCatalog?: Discount | null;

  @OneToMany(() => InventoryMovement, (movement) => movement.product)
  movements: InventoryMovement[];
}
