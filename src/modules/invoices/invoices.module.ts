import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Contact } from './entities/contact.entity';
import { Product } from '../Inventory/entities/product.entity';
import { InventoryMovement } from '../Inventory/entities/inventory-movement.entity';
import { TransactionsModule } from '../transactions/transactions.module';
import { S3Module } from '../s3/s3.module';
import { Company } from '../company/entities/company.entity';
import { Bank } from '../banks/entities/bank.entity';
import { InvoiceExtractionService } from './invoice-extraction.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      Contact,
      Product,
      InventoryMovement,
      Company,
      Bank,
    ]),
    TransactionsModule,
    S3Module,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceExtractionService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
