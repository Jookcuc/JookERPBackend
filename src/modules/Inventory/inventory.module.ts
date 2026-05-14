import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryForecastService } from './inventory-forecast.service';
import { InventoryService } from './inventory.service';
import { Discount } from './entities/discount.entity';
import { ProductType } from './entities/product-type.entity';
import { Product } from './entities/product.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { S3Module } from '../s3/s3.module';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductType,
      Product,
      InventoryMovement,
      Discount,
      Invoice,
      InvoiceItem,
    ]),
    S3Module,
  ],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryForecastService],
  exports: [InventoryService, InventoryForecastService],
})
export class InventoryModule {}
